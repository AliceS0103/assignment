import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { EcsFargatePropsInterface } from './ecs_fargate_props_interface';

export class EcsFargateProps implements EcsFargatePropsInterface {
    constructor(
      public readonly vpc_name: string,
      public readonly clusterName: string,
      public readonly serviceName: string,
      public readonly containerPort: number,
      public readonly imageTag: string,
    ) {}
    vpc: ec2.IVpc;
  }