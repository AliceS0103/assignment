import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Stack } from 'aws-cdk-lib';
import { EcsFargatePropsInterface } from "./ecs_fargate_props_interface";
import { Vpc, SubnetType } from 'aws-cdk-lib/aws-ec2';

export class EcsService extends Stack {
  constructor(
    private scope: Construct,
    private id: string,
    private props: EcsFargatePropsInterface,
  ){
    super(scope, id);
    
    const myVpc = new Vpc(this, 'MyVpc', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });
    // Create an ECR repository for the image
    const repository = new ecr.Repository(this, 'Repository');

    // Create a task definition with one container
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 512,
      cpu: 256,
    });
    // Add a container to the task definition
    const container = taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromEcrRepository(repository, props.imageTag),
      logging: ecs.LogDriver.awsLogs({
        logGroup: new logs.LogGroup(this, 'LogGroup', {
          logGroupName: `${props.serviceName}-log-group`,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        streamPrefix: props.serviceName,
      }),
    });

    // Map the container port to the host port
    container.addPortMappings({
      containerPort: props.containerPort,
    });

    // Create a VPC and security group for the cluster
    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(props.containerPort), 'allow ingress traffic to container');

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: props.clusterName,
    });

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      serviceName: props.serviceName,
      securityGroups: [securityGroup],
    });
    const table = new dynamodb.Table(this, "DataStorage", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING }
    });

    const lambdaFn1 = new lambda.Function(this, 'LambdaFunction1', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('resources/lambdaDynamoDB'),
    });
    table.grantReadWriteData(lambdaFn1);

    // Lambda function 2
    const filebucket = new s3.Bucket(this, "FileStore");

    const lambdaFn2 = new lambda.Function(this, 'LambdaFunction2', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('resources/lambdaS3'),
      environment: {
        BUCKET: filebucket.bucketName
      }

    });
    
    taskDefinition.taskRole?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
    taskDefinition.executionRole?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));

}
}