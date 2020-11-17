import * as acm from '@aws-cdk/aws-certificatemanager'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as route53 from '@aws-cdk/aws-route53'
import * as route53targets from '@aws-cdk/aws-route53-targets'
import * as s3 from '@aws-cdk/aws-s3'
import * as s3deploy from '@aws-cdk/aws-s3-deployment'
import * as cdk from '@aws-cdk/core'
import { CfnOutput, RemovalPolicy } from '@aws-cdk/core'
import { DomainInfo } from './DomainInfo'
import { DomainWebRedirect } from './DomainWebRedirect'
import { HostedZoneLookup } from './HostedZoneLookup'

export interface StaticWebStackProps extends cdk.StackProps {
  publishDir: string
  errorConfigurations?: cloudfront.CfnDistribution.CustomErrorResponseProperty[]
  domains: DomainInfo[]
  certificateArn?: string
}

export class StaticWebStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: StaticWebStackProps) {
    super(scope, id, props)

    const primaryDomain = props.domains[0] as DomainInfo | undefined
    const redirectDomains = props.domains.slice(1)

    const hostedZoneLookup = new HostedZoneLookup(this, 'HostedZoneLookup')
    let certificate: acm.ICertificate | undefined

    if (primaryDomain) {
      if (props.certificateArn) {
        certificate = acm.Certificate.fromCertificateArn(this, 'ImportedCert', props.certificateArn)
      } else {
        const zones: Record<string, route53.IHostedZone> = {}
        for (const d of props.domains) {
          zones[d.name] = hostedZoneLookup.getHostedZone(d)
        }
        const [primaryName, ...otherNames] = props.domains.map((d) => d.name)
        certificate = new acm.Certificate(this, 'GeneratedCert', {
          domainName: primaryName,
          subjectAlternativeNames: otherNames,
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
      comment: primaryDomain ? primaryDomain.name : 'aws-web-pub site',
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
