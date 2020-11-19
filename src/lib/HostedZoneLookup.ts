import * as route53 from '@aws-cdk/aws-route53'
import { Construct } from '@aws-cdk/core'
import { DomainInfo } from './DomainInfo'

export class HostedZoneLookup extends Construct {
  private zones: Record<string, route53.IHostedZone> = {}

  constructor(scope: Construct, id: string) {
    super(scope, id)
  }

  getHostedZones(domains: DomainInfo[]): Record<string, route53.IHostedZone> {
    return domains.reduce((acc, domain) => {
      acc[domain.name] = this.getHostedZone(domain)
      return acc
    }, {} as Record<string, route53.IHostedZone>)
  }

  getHostedZone(domain: DomainInfo): route53.IHostedZone {
    const name = this.getHostedZoneName(domain)

    let hostedZone = this.zones[name]
    if (!hostedZone) {
      hostedZone = route53.HostedZone.fromLookup(this, `HostedZone-${name}`, {
        domainName: name,
      })
      this.zones[name] = hostedZone
    }
    return hostedZone
  }

  private getHostedZoneName(domain: DomainInfo): string {
    if (domain.dnsZoneName) {
      return domain.dnsZoneName
    }
    return domain.name.substring(domain.name.indexOf('.') + 1)
  }
}
