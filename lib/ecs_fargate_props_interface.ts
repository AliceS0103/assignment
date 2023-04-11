import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface EcsFargatePropsInterface {
    vpc: ec2.IVpc;
    readonly vpc_name: string;
    readonly clusterName: string;
    readonly serviceName: string;
    readonly containerPort: number;
    readonly imageTag: string;
  }
