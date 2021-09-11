import {
  AclCidr,
  AclTraffic,
  Action,
  BlockDeviceVolume,
  EbsDeviceVolumeType,
  Instance,
  InstanceType,
  ISecurityGroup,
  IVpc,
  MachineImage,
  NetworkAcl,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  TrafficDirection,
  Vpc,
} from '@aws-cdk/aws-ec2'
import { Construct, Stack, StackProps, Tags } from '@aws-cdk/core'

const OPERATIONAL_AZ = 'ap-south-1a'

const OPEN_LITESPEED_AMI_ID = {
  'ap-south-1': 'ami-06a61b40694daf873',
}

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
  readonly instance: Instance
  readonly securityGroups: ISecurityGroup[]

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.vpc = new Vpc(this, 'VPC', {
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
    this.securityGroups = this.configureSecurityGroups()

    const volume = BlockDeviceVolume.ebs(20, {
      deleteOnTermination: false,
      volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
    })

    this.instance = new Instance(this, 'EC2-Instance', {
      instanceName: 'Samridhdhi-WebServer',
      vpc: this.vpc,
      machineImage: MachineImage.genericLinux({
        'ap-south-1': OPEN_LITESPEED_AMI_ID['ap-south-1'],
      }),
      instanceType: new InstanceType('t2.micro'),
      availabilityZone: OPERATIONAL_AZ,
      keyName: 'samridhdhi_test',
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume,
        },
      ],
      securityGroup: this.securityGroups[0], // Pick first as default
    })
  }

  get availabilityZones(): string[] {
    return [OPERATIONAL_AZ]
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

  private configureSecurityGroups(): ISecurityGroup[] {
    const webOnlySG = new SecurityGroup(this, 'WebOnly-SG', {
      vpc: this.vpc,
      allowAllOutbound: true,
      securityGroupName: 'Web Access Only',
    })

    webOnlySG.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'Allow inbound HTTP for ipv4',
    )
    webOnlySG.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow inbound HTTPS for ipv4',
    )

    const webWithSshSG = new SecurityGroup(this, 'Web-SSH-SG', {
      vpc: this.vpc,
      allowAllOutbound: true,
      securityGroupName: 'Web + SSH',
    })

    webWithSshSG.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'Allow inbound HTTP for ipv4',
    )
    webWithSshSG.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow inbound HTTPS for ipv4',
    )
    webWithSshSG.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(22),
      'Allow inbound SSH for ipv4',
    )

    return [webOnlySG, webWithSshSG]
  }
}
