import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as glue from "aws-cdk-lib/aws-glue";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { AthenaParameter } from "../parameter/parameter-athena";

export interface CdkSfnAthenaConstructProps {
    envName: string;
    projectName: string;
    etlBucket: cdk.aws_s3.IBucket;  // 既存S3バケット参照インターフェイス
}

export class CdkSfnAthenaConstruct extends Construct {
    constructor(scope: Construct, id: string, props: CdkSfnAthenaConstructProps) {
        super(scope, id);

        //// Glue
        // Glue Job Role
        const glueJobRole = new iam.Role(this, "GlueJobRole", {
            assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
            description: "IAM Role for Glue Job",
            roleName: `${props.projectName}-${props.envName}-glue-job-role`,
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSGlueServiceRole"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
            ],
        });

        // etlBucket
        const etlBucket = props.etlBucket;

        // Glue Job
        const glueJob = new glue.CfnJob(this, "GlueJob", {
            name: `${props.projectName}-${props.envName}-glue-job`,
            role: glueJobRole.roleArn,
            command: {
                name: "pythonshell",
                pythonVersion: "3.9",
                scriptLocation: `s3://${etlBucket.bucketName}/glue-script/glue_job.py`,
            },
            executionProperty: {
              maxConcurrentRuns: 3,
            },
            maxCapacity: 0.0625,
            maxRetries: 0,
            defaultArguments: {
              "--job-language": "python",
              "library-set": "analytics",
              "--BUCKET_NAME": etlBucket.bucketName, 
              "--INPUT_KEY": "input/zero_padding_data.csv",
              "--OUTPUT_KEY": "output/zero_padding_result.csv",
            },
          });
        //// Step Functions
        // Step Functions Role
        const stepFunctionsRole = new iam.Role(this, "StepFunctionsRole", {
            assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
            description: "IAM role for Step Functions",
            roleName: `${props.projectName}-${props.envName}-stepfunctions-role`,
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSGlueServiceRole"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAthenaFullAccess"),
            ],
        });
        // State Machine
        const stateMachine = new sfn.StateMachine(this, "StepFunctions", {
            stateMachineName: `${props.projectName}-${props.envName}-workflow`,
            role: stepFunctionsRole,
            definition: sfn.Chain.start(
                new tasks.GlueStartJobRun(this, "InvokeGlueJob", {
                    glueJobName: glueJob.name!,
                    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
                })
            ).next(
                new tasks.AthenaStartQueryExecution(this, "Athena Insert Into Iceberg", {
                    queryString: AthenaParameter.insertQueryString,
                    queryExecutionContext: {
                        databaseName: AthenaParameter.databaseName,
                      },
                    resultConfiguration: {
                        encryptionConfiguration: {
                            encryptionOption: tasks.EncryptionOption.S3_MANAGED
                        },
                        outputLocation: {
                            bucketName: etlBucket.bucketName,
                            objectKey: AthenaParameter.objectKey,
                        },
                    },
                    integrationPattern: sfn.IntegrationPattern.RUN_JOB
                })
            ).next(
                new tasks.AthenaStartQueryExecution(this, "Athena Select Iceberg", {
                    queryString: AthenaParameter.selectQueryString,
                    queryExecutionContext: {
                        databaseName: AthenaParameter.databaseName,
                        },
                    resultConfiguration: {
                        encryptionConfiguration: {
                            encryptionOption: tasks.EncryptionOption.S3_MANAGED
                        },
                        outputLocation: {
                            bucketName: etlBucket.bucketName,
                            objectKey: AthenaParameter.objectKey,
                        }
                    },
                    integrationPattern: sfn.IntegrationPattern.RUN_JOB
                })
            ).next(
                new tasks.AthenaGetQueryResults(this, "Athena GetQueryResults", {
                    queryExecutionId: sfn.JsonPath.stringAt("$.QueryExecution.QueryExecutionId"),
                  })
            )
        });

    //// EventBridge
    // EventBridge Role
    const eventBridgeRole = new iam.Role(this, "EventBridgeRole", {
        assumedBy: new iam.ServicePrincipal("events.amazonaws.com"),
        description: "IAM role for EventBridge",
        roleName: `${props.projectName}-${props.envName}-eventbridge-role`,
      });
      eventBridgeRole.addToPolicy(new iam.PolicyStatement({
        actions: ["states:StartExecution"],
        resources: [stateMachine.stateMachineArn],
    }));
    // EventBridge Rule
    const s3PutEventRule = new events.Rule(this, 'S3PutEventRule', {
        ruleName: `${props.projectName}-${props.envName}-event`,
        eventPattern: {
          source: ["aws.s3"],
          detailType: ["Object Created"],
          detail: {
            bucket: {
              name: [`${etlBucket.bucketName}`],
            },
            object: {
              key: [{ prefix: "input/" }],
              size: [{ numeric: [">", 0] }],
            },
          },
        },
      });
      s3PutEventRule.addTarget(new targets.SfnStateMachine(stateMachine, {
        role: eventBridgeRole,
      }));
    }
  }
