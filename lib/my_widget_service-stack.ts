import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as widget_service from '../lib/widget_service';
import { EcsService } from '../lib/ecs_service';
import { EcsFargatePropsInterface } from "./ecs_fargate_props_interface";
import { EcsFargateProps } from './ecs_fargate_props';

export class MyWidgetServiceStack extends Stack {
  constructor(private scope: Construct, private id: string, private props?: StackProps) {
    super(scope, id, props);
    new widget_service.WidgetService(this, 'Widgets');

    const ecsFargateProps = new EcsFargateProps(props.vpc , "cardeo", "EcsService", 80, 'myImageTag');
    const ecsService = new EcsService(this, "EcsService", ecsFargateProps);

  }
}