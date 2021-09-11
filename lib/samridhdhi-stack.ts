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
  }

  get availabilityZones(): string[] {
    return [OPERATIONAL_AZ]
  }
}
