import {
  AclCidr,
  AclTraffic,
  Action,
  IVpc,
  NetworkAcl,
  SubnetType,
  TrafficDirection,
  Vpc,
} from '@aws-cdk/aws-ec2'
import { Construct, Stack, StackProps, Tags } from '@aws-cdk/core'

type AclConfig = {
  cidrs: Array<{ name: string; type: AclCidr }>
  traffic: Array<{ name: string; type: AclTraffic }>
  ruleNumber: {
    start: number
    increment: number
  }
}

export class SamridhdhiInfraStack extends Stack {
  readonly vpc: IVpc

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.vpc = new Vpc(this, 'Test-VPC', {
      maxAzs: this.availabilityZones.length,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'AZ1',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    })

    this.configureNetworkAcl()
  }

  get availabilityZones(): string[] {
    return ['ap-south-1a']
  }

  private configureNetworkAcl() {
    const tcpACL = new NetworkAcl(this, 'TCP-ACL', {
      vpc: this.vpc,
    })

    this.prepareNetworkACL(tcpACL, {
      cidrs: [{ name: 'ipv4', type: AclCidr.anyIpv4() }],
      traffic: [{ name: 'All', type: AclTraffic.tcpPortRange(0, 65535) }],
      ruleNumber: {
        start: 100,
        increment: 5,
      },
    })

    const webACL = new NetworkAcl(this, 'Web-ACL', {
      vpc: this.vpc,
    })

    this.prepareNetworkACL(webACL, {
      cidrs: [
        { name: 'ipv4', type: AclCidr.anyIpv4() },
        { name: 'ipv6', type: AclCidr.anyIpv6() },
      ],
      traffic: [
        { name: 'HTTP', type: AclTraffic.tcpPort(80) },
        { name: 'HTTPS', type: AclTraffic.tcpPort(443) },
        { name: 'EphemeralTCP', type: AclTraffic.tcpPortRange(1024, 65535) },
      ],
      ruleNumber: {
        start: 100,
        increment: 5,
      },
    })

    webACL.associateWithSubnet('Web-ACL-SubnetAssociation', {
      subnets: this.vpc.publicSubnets,
    })
  }

  private prepareNetworkACL(acl: NetworkAcl, config: AclConfig) {
    const { cidrs, traffic, ruleNumber } = config

    let currentRule = ruleNumber.start
    cidrs.forEach((cidr) => {
      traffic.forEach((trafficType) => {
        acl.addEntry(`Allow-Inbound-${trafficType.name}-${cidr.name}`, {
          ruleNumber: currentRule,
          cidr: cidr.type,
          traffic: trafficType.type,
          direction: TrafficDirection.INGRESS,
          ruleAction: Action.ALLOW,
        })
        acl.addEntry(`Allow-Outbound-${trafficType.name}-${cidr.name}`, {
          ruleNumber: currentRule,
          cidr: cidr.type,
          traffic: trafficType.type,
          direction: TrafficDirection.EGRESS,
          ruleAction: Action.ALLOW,
        })
        currentRule += ruleNumber.increment
      })
    })
  }
}
