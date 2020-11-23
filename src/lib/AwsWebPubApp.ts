import { App } from '@aws-cdk/core'
import 'source-map-support/register'
import { getStackProps } from './ProjectConfig'
import { StaticWebsiteStack } from './StaticWebsiteStack'

const app = new App()
const projectPath = app.node.tryGetContext('project')
if (!projectPath) {
  throw new Error('must provide project context')
}
new StaticWebsiteStack(app, 'aws-web-pub', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // CloudFront only supports ACM certificates from us-east-1 https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-viewercertificate.html#cfn-cloudfront-distribution-viewercertificate-acmcertificatearn
  },
  ...getStackProps(projectPath),
})
