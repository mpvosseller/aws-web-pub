#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsWebPubStack } from '../lib/aws-web-pub-stack';

const app = new cdk.App();
new AwsWebPubStack(app, 'AwsWebPubStack');
