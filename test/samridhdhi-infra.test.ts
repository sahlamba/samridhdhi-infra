import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as SamridhdhiInfra from '../lib/samridhdhi-infra-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new SamridhdhiInfra.SamridhdhiInfraStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
