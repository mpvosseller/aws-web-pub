# aws-web-pub

A CLI tool to easily publish a static website to AWS.

With one simple command this tool provisions all of the AWS resources required to host your
static website with a custom domain. It even generates a valid SSL/TLS certificate for you.
It takes about 10 minutes to publish a site the first time but publishing updates complete
in about 1 minute.

## Prerequisites

- Your domain is managed by [AWS Route 53](https://aws.amazon.com/route53)

- Your AWS credentials are configured with the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html)
  OR you have following [environment variables](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html#envvars-set) set to appropriate values:

  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

## Quick Start

- Install `npm install aws-web-pub`

- Add a config file to the root of your project named `.aws-web-pub.json`

```json
{
  "projectName": "example-site",
  "publishDir": "dist",
  "notFoundPath": "/404.html",
  "domains": [
    {
      "name": "www.example.com"
    }
  ]
}
```

- Run `npx aws-web-pub publish` from the root of your project to publish your website

- Run `npx aws-web-pub unpublish` from the root of your project to unpublish your website and delete the AWS resources

## Configuration File

```json
{
  "projectName": "example-site",
  "publishDir": "dist",
  "notFoundPath": "/404.html",
  "domains": [
    {
      "name": "www.example.com"
    },
    {
      "name": "example.com",
      "dnsZoneName": "example.com"
    }
  ],
  "certificateArn": "arn:aws:acm:region:account:certificate/123456789012-1234-1234-1234-12345678"
}
```

- `projectName` uniquely identifies a project within an AWS account. If you try to publish more than one site with the same `projectName` they will overwrite each other.
- `publishDir` is a path to the directory of web assets to be published. This should be relative to the configuration file.
- `notFoundPath` is optional and identifies an html file to use for the content of 404 responses. This should be relative to `publishDir` and prefixed with a `/`
- `domains` is an array and describes one or more custom domains to use. The first entry will be the primary domain and any subsequent entries will simply redirect to the primary.

  - `name` is the domain name
  - `dnsZoneName` is optional and identifies the Route 53 HostedZone that manages this domain. When `dnsZoneName` is not provided it defaults to the parent domain (e.g. the domain name `www.example.com` defaults to using `example.com` as the `dnsZoneName`). This is typically used to support the APEX / naked domain by setting `name` and `dnsZoneName` to the same value. In the example configuration above the APEX domain https://example.com would redirect to the primary domain https://www.example.com

- `certificateArn` is optional and specifies the ARN of an AWS ACM certificate to use. This certificate must be valid for every domain in the `domains` setting. If present we use this certificate instead of generating a new one (See Additional Notes below regarding certificate limits).

## Additional Notes

- This tool generates temporary files in a directory called `cdk.out`. You should add this to `.gitignore`
- Due to [CloudFront limitations](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-viewercertificate.html#cfn-cloudfront-distribution-viewercertificate-acmcertificatearn) the website will always be hosted in the `us-east-1` AWS region.
- If you using [AWS named profiles](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html) you can pass a `--profile` option
- By default AWS Accounts can generate just 20 ACM certficates per year. When you publish a site without specifying a `certificateArn` a new certificate is generated and when you unpublish the site it is deleted. If you plan on publishing and unpublishing frequently you should generate a certficate manually and set the `certificateArn` configuration property.
