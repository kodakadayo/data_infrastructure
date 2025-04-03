import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3Construct } from './common/s3-construct';
import { CdkSfnAthenaConstruct } from './etl/cdk-sfn-athena-construct';

// スタック用の Props を定義
export interface StackProps extends cdk.StackProps {
  projectName: string;
  envName: string;
}

export class CdkSfnAthenaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const s3Construct = new S3Construct(this, "S3", {
      envName: props.envName,
      projectName: props.projectName
    });

    const cdkSfnAthenaConstruct = new CdkSfnAthenaConstruct(this , "CdkSfnAthena", {
      envName: props.envName,
      projectName: props.projectName,
      etlBucket: s3Construct.etlBucket
    });
  }
}
