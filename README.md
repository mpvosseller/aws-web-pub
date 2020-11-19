# aws-web-pub

A CLI tool to easily publish a static website to AWS.

With one simple command this tool provisions all of the AWS resources required
to host your static website with a custom domain. It even generates a valid
SSL/TLS certificate for you. The first deployment takes about 10 minutes but
each subsequent update completes in under a minute.

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

- Add convenience scripts to `package.json` like

```json
{
  "scripts": {
    "deploy": "aws-web-pub deploy",
    "destroy": "awe-web-pub destroy"
  }
}
```

- Deploy your site with `npm run deploy`

- Tear down your site (and delete all the provisioned AWS resources) with `npm run destroy`

## Configuration File

```json
{
  "projectName": "example-site",
  "publishDir": "dist",
  "notFoundPath": "/404.html",
  "isSinglePageApp": false,
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

- `projectName` uniquely identifies a project within an AWS account. If you try to deploy more than one site with the same `projectName` they will overwrite each other.
- `publishDir` is a path to the directory of web assets to publish. This should be relative to the configuration file.
- `notFoundPath` is optional and identifies an html file to use for the content of 404 responses. This should be relative to `publishDir` and prefixed with a `/`.
- `isSinglePageApp` is optional and when set to `true` it optimizes the configuration for single page applications. In this mode `404` errors are converted to `200` and return the root document. When this is enabled the `notFoundPath` property is ignored.
- `domains` is an optional array and describes custom domains to use. The first entry will be the primary domain and any subsequent entries will be configured to redirect to the primary.

  - `name` is the domain name
  - `dnsZoneName` is optional and identifies the Route 53 HostedZone that manages this domain. When `dnsZoneName` is not provided it defaults to the parent domain (e.g. the domain name `www.example.com` defaults to using `example.com` as the `dnsZoneName`). This is typically used to support the APEX / naked domain by setting `name` and `dnsZoneName` to the same value. In the example configuration above the APEX domain https://example.com would redirect to the primary domain https://www.example.com

- `certificateArn` is optional and specifies the ARN of an AWS ACM certificate to use. This certificate must be valid for every domain in the `domains` setting. If present we use this certificate instead of generating a new one (See Additional Notes below regarding certificate limits).

## Additional Notes

- This tool generates temporary files in a directory called `aws-web-pub.out`. You should add this to `.gitignore`
- Due to [CloudFront limitations](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-viewercertificate.html#cfn-cloudfront-distribution-viewercertificate-acmcertificatearn) the website will always be hosted in the `us-east-1` AWS region.
- If you using [AWS named profiles](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html) you can pass a `--profile` option
- By default AWS Accounts can generate just 20 ACM certficates per year. If you plan on destroying sites frequently you should use the `certificateArn` to prevent hitting this limit. You can also ask AWS support to increase your [ACM "Imported certificates in last 365 days"](https://console.aws.amazon.com/servicequotas/home?#!/services/acm/quotas/L-3808DC70) quota limit.
