import { CfnEIP, CfnEIPAssociation } from '@aws-cdk/aws-ec2'
import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { OPERATIONAL_AZ } from './config'
import { VPC } from './constructs/vpc'
import { WordpressServer } from './constructs/wordpress-server'

export class SamridhdhiStack extends Stack {
  readonly vpc: VPC
  readonly server: WordpressServer

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.vpc = new VPC(this, 'VPC')

    this.server = new WordpressServer(this, 'WP-Server', {
      vpc: this.vpc.vpc,
    })

    // Create and associate Elastic IP with server
    const eip = new CfnEIP(this, 'ElasticIP', {})
    new CfnEIPAssociation(this, 'ElasticIpAssociation', {
      eip: eip.ref,
      instanceId: this.server.instance.instanceId,
    })
  }

  get availabilityZones(): string[] {
    return [OPERATIONAL_AZ]
  }
}
