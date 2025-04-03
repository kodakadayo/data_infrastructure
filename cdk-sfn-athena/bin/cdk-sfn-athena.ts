#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkSfnAthenaStack } from '../lib/cdk-sfn-athena-stack';
import { devParameter } from '../lib/parameter/parameter-stack';
import { prodParameter } from '../lib/parameter/parameter-stack';


const app = new cdk.App();
new CdkSfnAthenaStack(app, 'DevCdkSfnAthenaStack', {
  // ここでのenvはAWSのアカウントIDやリージョンを指す
  env: { 
    account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  envName: devParameter.envName,
  projectName: devParameter.projectName
});

new CdkSfnAthenaStack(app, 'ProdCdkSfnAthenaStack', {
  // ここでのenvはAWSのアカウントIDやリージョンを指す
  env: { 
    account: prodParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  envName: prodParameter.envName,
  projectName: prodParameter.projectName
});
