import { Environment } from "aws-cdk-lib";

export interface MyParameter {
    env?: Environment;
    envName: string;
    projectName: string;
}

export const devParameter: MyParameter = {
    envName: "dev",
    projectName:  "cdk-sfn-athena"
}

export const prodParameter: MyParameter = {
    envName: "prod",
    projectName:  "cdk-sfn-athena"
}
