# Samridhdhi Trust CDK

An AWS CDK package to bootstrap and maintain [Samridhdhi Trust's][1] website.

## Installation

### Prerequisites

After creating an AWS account, there are few prerequisites steps before you can bootstrap the site infrastructure -

1. Install AWS CLI using the instructions [here][2].
1. Ensure you have Node.js, `node --version` >= 10.13.0.
1. Install and verify AWS CDK toolkit by running `npm install -g aws-cdk` and `cdk --version`.
1. Create an IAM user for modifying the account through CDK -
   1. Go to the AWS IAM console and create a new user.
   1. Type a name for your user (e.g. `cdk-user`) and choose "Programmatic access".
   1. On the **Permissions** page, **Attach existing policies directly** and choose **AdministratorAccess**.
   1. In the next screen, you’ll see your **Access key ID** and you will have the option to click Show to show the **Secret access key**. Keep this browser window open or download the CSV.
1. Install dependencies and configure your credentials -
   1. Run `npm run setup && npm run cdk:setup`.
   1. Type the **access key ID** and **secret key** and choose `ap-south-1` region.

### Bootstrap CDK

1. Sign in to your AWS account and create a new EC2 keypair with the name `samridhdhi-wp-server`.
1. Subscribe to [OpenLiteSpeed WordPress Server][3] on the AWS Marketplace and replace regional AMI ID in `lib/constructs/wordpress-server.ts` file.
1. Bootstrap CDK stack by running (only required to run once per new region) -

```
npm run build && npm run cdk:bootstrap
```

## Usage

1. Build using `npm run build`.
1. Synthesize CDK stack using `npm run cdk:synth`.
1. Deploy CDK stack using `npm run cdk:deploy`.

[1]: https://samridhdhi.org
[2]: https://docs.aws.amazon.com/cli/latest/userguide/installing.html
[3]: https://aws.amazon.com/marketplace/pp/B07KSC2QQN
