import * as certificatemanager from '@aws-cdk/aws-certificatemanager'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as route53 from '@aws-cdk/aws-route53'
import * as route53targets from '@aws-cdk/aws-route53-targets'
import * as s3 from '@aws-cdk/aws-s3'
import { Construct, RemovalPolicy } from '@aws-cdk/core'
import { CloudFrontInvalidator } from './CloudFrontInvalidator'

export interface DomainWebRedirectProps {
  sourceDomains: {
    domainName: string
    hostedZone: route53.IHostedZone
  }[]
  certificate: certificatemanager.ICertificate
  targetDomain: string
}

/**
 * Redirect all http / https requests from one or more source domains to a target domain
 */
export class DomainWebRedirect extends Construct {
  public readonly webDistribution: cloudfront.CloudFrontWebDistribution

  constructor(scope: Construct, id: string, props: DomainWebRedirectProps) {
    super(scope, id)

    const bucket = new s3.Bucket(this, 'Bucket', {
      websiteRedirect: {
        protocol: s3.RedirectProtocol.HTTPS,
        hostName: props.targetDomain,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.webDistribution = new cloudfront.CloudFrontWebDistribution(this, 'WebDistribution', {
      comment: `redirect to ${props.targetDomain}`,
      defaultRootObject: '', // prevent redirecting https://source to https://target/index.html
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
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL, // don't bother having CloudFront redirect http://source to https://source. S3 will handle redirecting directly to https://target
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(props.certificate, {
        aliases: props.sourceDomains.map((s) => s.domainName),
      }),
    })

    new CloudFrontInvalidator(this, 'CloudFrontInvalidator', {
      distributionId: this.webDistribution.distributionId,
      hash: props.targetDomain, // invalidate CloudFront cache if the targetDomain ever changes
    })

    for (const source of props.sourceDomains) {
      new route53.ARecord(this, `ARecord-${source.domainName}`, {
        recordName: source.domainName,
        zone: source.hostedZone,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(this.webDistribution)
        ),
      })
    }
  }
}
