import {
  BlockDeviceVolume,
  EbsDeviceVolumeType,
  IInstance,
  Instance,
  InstanceType,
  IPeer,
  ISecurityGroup,
  IVpc,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
} from '@aws-cdk/aws-ec2'
import { Construct } from '@aws-cdk/core'
import { OPERATIONAL_AZ, OPERATIONAL_REGION } from '../config'

// WordPress with LiteSpeed Cache: https://aws.amazon.com/marketplace/pp/B07KSC2QQN
const OPEN_LITESPEED_AMI_ID = {
  'ap-south-1': 'ami-06a61b40694daf873',
}

export type ServerProps = {
  readonly vpc: IVpc
}

type SecurityGroupConfig = {
  readonly ingressRules: Array<{ peer: IPeer; port: Port; description: string }>
}

export class WordpressServer extends Construct {
  readonly volume: BlockDeviceVolume
  readonly securityGroups: ISecurityGroup[]
  readonly instance: IInstance

  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id)

    this.volume = BlockDeviceVolume.ebs(20, {
      deleteOnTermination: false,
      volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
    })

    this.securityGroups = this.configureSecurityGroups(props)

    this.instance = new Instance(this, 'EC2-Instance', {
      instanceName: 'Samridhdhi-Wordpress-Server',
      vpc: props.vpc,
      machineImage: MachineImage.genericLinux({
        [OPERATIONAL_REGION]: OPEN_LITESPEED_AMI_ID[OPERATIONAL_REGION],
      }),
      instanceType: new InstanceType('t2.micro'),
      availabilityZone: OPERATIONAL_AZ,
      keyName: 'samridhdhi_test',
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: this.volume,
        },
      ],
      securityGroup: this.securityGroups[0], // Pick first as default
    })
  }

  private configureSecurityGroups(props: ServerProps): ISecurityGroup[] {
    // Set up HTTP/HTTPS-only security group for server
    const webOnlySG = new SecurityGroup(this, 'WebOnly-SG', {
      vpc: props.vpc,
      allowAllOutbound: true,
      securityGroupName: 'Web Access Only',
    })
    this.prepareSecurityGroup(webOnlySG, {
      ingressRules: [
        {
          peer: Peer.anyIpv4(),
          port: Port.tcp(80),
          description: 'Allow inbound HTTP',
        },
        {
          peer: Peer.anyIpv4(),
          port: Port.tcp(443),
          description: 'Allow inbound HTTPS',
        },
      ],
    })

    // Set up SSH-only security group for debugging
    const sshOnlySG = new SecurityGroup(this, 'SshOnly-SG', {
      vpc: props.vpc,
      allowAllOutbound: true,
      securityGroupName: 'SSH Access',
    })
    this.prepareSecurityGroup(sshOnlySG, {
      ingressRules: [
        {
          peer: Peer.anyIpv4(),
          port: Port.tcp(22),
          description: 'Allow inbound SSH',
        },
      ],
    })

    // Set up security group for LiteSpeed server panel
    const serverPanelSG = new SecurityGroup(this, 'ServerPanel-SG', {
      vpc: props.vpc,
      allowAllOutbound: true,
      securityGroupName: 'Server Panel (7080)',
    })
    this.prepareSecurityGroup(serverPanelSG, {
      ingressRules: [
        {
          peer: Peer.anyIpv4(),
          port: Port.tcp(7080),
          description: 'Allow inbound traffic on port 7080',
        },
      ],
    })

    return [webOnlySG, sshOnlySG, serverPanelSG] // First group i.e. Web-Only will be default
  }

  private prepareSecurityGroup(
    sg: ISecurityGroup,
    config: SecurityGroupConfig,
  ) {
    const { ingressRules } = config

    ingressRules.forEach((iRule) => {
      const { description, peer, port } = iRule
      sg.addIngressRule(peer, port, description)
    })
  }
}
