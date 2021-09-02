import { SubnetType, Vpc } from '@aws-cdk/aws-ec2';
import { Construct, Stack, StackProps } from '@aws-cdk/core';

export class SamridhdhiInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'Test-VPC', {
      maxAzs: this.availabilityZones.length,
      natGateways: 0,
      subnetConfiguration: [{
        name:'AZ1',
        subnetType: SubnetType.PUBLIC
      }]
    });
  }

  get availabilityZones(): string[] {
    return ['ap-south-1a'];
  }
}
