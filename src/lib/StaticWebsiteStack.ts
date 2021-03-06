import * as acm from '@aws-cdk/aws-certificatemanager'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as route53 from '@aws-cdk/aws-route53'
import * as route53targets from '@aws-cdk/aws-route53-targets'
import * as s3 from '@aws-cdk/aws-s3'
import * as s3deploy from '@aws-cdk/aws-s3-deployment'
import * as cdk from '@aws-cdk/core'
import { CfnOutput, RemovalPolicy } from '@aws-cdk/core'
import { DomainWebRedirect } from 'domain-web-redirect'
import { DomainInfo } from './DomainInfo'
import { HostedZoneLookup } from './HostedZoneLookup'

export interface StaticWebsiteStackProps extends cdk.StackProps {
  publishDir: string
  deleteOldFiles?: boolean
  errorConfigurations?: cloudfront.CfnDistribution.CustomErrorResponseProperty[]
  domains?: DomainInfo[]
  certificateArn?: string
}

export class StaticWebsiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: StaticWebsiteStackProps) {
    super(scope, id, props)

    const domains = props.domains ?? []
    const primaryDomain = domains[0] as DomainInfo | undefined
    const redirectDomains = domains.slice(1)

    const hostedZoneLookup = new HostedZoneLookup(this, 'HostedZoneLookup')

    let certificate: acm.ICertificate | undefined
    if (primaryDomain) {
      if (props.certificateArn) {
        certificate = acm.Certificate.fromCertificateArn(this, 'ImportedCert', props.certificateArn)
      } else {
        const zones = hostedZoneLookup.getHostedZones(domains)
        certificate = new acm.Certificate(this, 'GeneratedCert', {
          domainName: primaryDomain.name,
          subjectAlternativeNames: redirectDomains.map((d) => d.name),
          validation: acm.CertificateValidation.fromDnsMultiZone(zones),
        })
      }
    }

    const bucket = new s3.Bucket(this, 'Bucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html', // CloudFormation doesn't require this but the S3 console ui does
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const webDistribution = new cloudfront.CloudFrontWebDistribution(this, 'WebDistribution', {
      comment: primaryDomain?.name || 'aws-web-pub site',
      originConfigs: [
        {
          customOriginSource: {
            domainName: bucket.bucketWebsiteDomainName,
            originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
            },
          ],
        },
      ],
      viewerCertificate:
        certificate && primaryDomain
          ? cloudfront.ViewerCertificate.fromAcmCertificate(certificate, {
              aliases: [primaryDomain.name],
            })
          : undefined,
      errorConfigurations: props.errorConfigurations,
    })

    if (primaryDomain) {
      new route53.ARecord(this, `ARecord-${primaryDomain.name}`, {
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(webDistribution)
        ),
        zone: hostedZoneLookup.getHostedZone(primaryDomain),
        recordName: primaryDomain.name,
      })
    }

    new s3deploy.BucketDeployment(this, 'BucketDeployment', {
      sources: [s3deploy.Source.asset(props.publishDir)],
      destinationBucket: bucket,
      distribution: webDistribution,
      distributionPaths: ['/*'],
      retainOnDelete: false,
      prune: props.deleteOldFiles,
    })

    let domainWebRedirect: DomainWebRedirect | undefined
    if (primaryDomain) {
      if (redirectDomains.length > 0 && certificate) {
        domainWebRedirect = new DomainWebRedirect(this, `DomainRedirects`, {
          sourceDomains: redirectDomains.map((domain) => {
            return {
              domainName: domain.name,
              hostedZone: hostedZoneLookup.getHostedZone(domain),
            }
          }),
          certificate: certificate,
          targetDomain: primaryDomain.name,
        })
      }
    }

    const webDistributionList = [webDistribution]
    if (domainWebRedirect) {
      webDistributionList.push(domainWebRedirect.webDistribution)
    }

    new CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
    })

    new CfnOutput(this, 'S3Url', {
      value: `http://${bucket.bucketWebsiteDomainName}`,
    })

    new CfnOutput(this, 'WebDistributionIds', {
      value: webDistributionList.map((wd) => wd.distributionId).join(', '),
    })

    new CfnOutput(this, 'WebDistributionUrls', {
      value: webDistributionList.map((wd) => `https://${wd.distributionDomainName}`).join(', '),
    })

    new CfnOutput(this, 'RedirectingUrls', {
      value: redirectDomains.map((h) => `https://${h.name}`).join(', '),
    })

    new CfnOutput(this, 'Urls', {
      value: primaryDomain ? `https://${primaryDomain.name}` : '',
    })
  }
}
