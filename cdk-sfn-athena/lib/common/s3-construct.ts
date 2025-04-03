import * as cdk from 'aws-cdk-lib';
import { Bucket, BlockPublicAccess, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface S3ConstructProps {
  envName: string;
  projectName: string;
}

export class S3Construct extends Construct {
    public readonly etlBucket: Bucket;

    constructor(scope: Construct, id: string, props: S3ConstructProps) {
      super(scope, id);

      // 今回作成するETL用のバケット
      this.etlBucket = new Bucket(this, "etlBucket", {
        bucketName: `${props.projectName}-${props.envName}-kodaka-bucket`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        encryption: BucketEncryption.KMS_MANAGED,
        versioned: true,
        eventBridgeEnabled: true,
      });

      // Glue用のスクリプトをS3にアップロード
      new cdk.aws_s3_deployment.BucketDeployment(this, "DeployGlueScript", {
        sources: [cdk.aws_s3_deployment.Source.asset("resources")],
        destinationBucket: this.etlBucket,
        destinationKeyPrefix: "glue-script"
      });
    }
  }
