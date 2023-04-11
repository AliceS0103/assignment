import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";

export class WidgetService extends Construct {
    constructor(private scope: Construct, private id: string) {
      super(scope, id);
      const bucket = new s3.Bucket(this, "WidgetStore");
  
      const handlerFn = new lambda.Function(this, "WidgetHandler", {
        runtime: lambda.Runtime.NODEJS_14_X, 
        code: lambda.Code.fromAsset("resources"),
        handler: "widgets.main",
        environment: {
          BUCKET: bucket.bucketName
        }
      });
      bucket.grantReadWrite(handlerFn);
      
      const api = new apigateway.RestApi(this, "widgets-api", {
        restApiName: "Widget Service",
        description: "This service serves widgets."
      });
  
      const getWidgetsIntegration = new apigateway.LambdaIntegration(handlerFn, {
        requestTemplates: { "application/json": '{ "statusCode": "200" }' }
      });
  
      api.root.addMethod("GET", getWidgetsIntegration);
  
      const widget = api.root.addResource("{id}");
  
      const table = new dynamodb.Table(this, "WidgetTable", {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING }
      });
  
      table.grantReadWriteData(handlerFn);
  
      const postWidgetIntegration = new apigateway.LambdaIntegration(handlerFn, {
        requestTemplates: { "application/json": '{ "statusCode": "201" }' }
      });
  
      const getWidgetIntegration = new apigateway.LambdaIntegration(handlerFn, {
        requestTemplates: { "application/json": '{ "statusCode": "200" }' }
      });
  
      const deleteWidgetIntegration = new apigateway.LambdaIntegration(handlerFn, {
        requestTemplates: { "application/json": '{ "statusCode": "204" }' }
      });
  
      widget.addMethod("POST", postWidgetIntegration);
      widget.addMethod("GET", getWidgetIntegration);
      widget.addMethod("DELETE", deleteWidgetIntegration);
     
  
      // Alarm for high Lambda function latency
      const durationMetric = handlerFn.metricDuration({
        statistic: 'Average',
      });

      new cloudwatch.Alarm(this, 'LatencyAlarm', {
        alarmName: 'LatencyAlarm',
        alarmDescription: 'Alarm if Lambda function latency exceeds 1 second',
        metric: durationMetric,
        threshold: 1000,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      const errorsMetric = handlerFn.metricErrors({
        statistic: 'Sum',
      });
  
      // Alarm for Lambda function invocation errors
      new cloudwatch.Alarm(this, 'ErrorsAlarm', {
        alarmName: 'ErrorsAlarm',
        alarmDescription: 'Alarm if Lambda function has invocation errors',
        metric: errorsMetric,
        threshold: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    }
  }
  