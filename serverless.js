const path = require('path')
const { Component, utils } = require('@serverless/core')

class TencentExpress extends Component {
  async default(inputs = {}) {
    // there are some dependencies that require the express him to work
    // I've included them all here. A better approach would be to use
    // browserify to build all of these files into one.
    // but browserify throws an error because the required app.js is not found
    // which the user will be adding later on after the build
    const shimsDir = path.join(__dirname, 'shims')
    inputs.include = [
      path.join(shimsDir, 'binary-case.js'),
      path.join(shimsDir, 'index.js'),
      path.join(shimsDir, 'media-typer.js'),
      path.join(shimsDir, 'middleware.js'),
      path.join(shimsDir, 'mime-db.json'),
      path.join(shimsDir, 'mime-types.js'),
      path.join(shimsDir, 'type-is.js')
    ]
    inputs.exclude = ['.git/**', '.gitignore', '.serverless', '.DS_Store']
    inputs.handler = 'index.handler'
    inputs.runtime = 'Nodejs8.9'
    inputs.name = inputs.functionName
    inputs.codeUri = inputs.code || process.cwd()

    const appFile = path.join(path.resolve(inputs.codeUri), 'app.js')

    if (!(await utils.fileExists(appFile))) {
      throw new Error(`app.js not found in ${inputs.codeUri}`)
    }

    const tencentCloudFunction = await this.load('@serverless/tencent-scf')
    const tencentApiGateway = await this.load('@serverless/tencent-apigateway')

    const tencentCloudFunctionOutputs = await tencentCloudFunction(inputs)
    const tencentApiGatewayOutputs = await tencentApiGateway({
      serviceName: inputs.serviceName,
      serviceId: inputs.serviceId,
      region: inputs.region,
      protocol: inputs.protocol,
      environment: inputs.apiEnvironment,
      endpoints: [
        {
          path: '/',
          method: 'ANY',
          function: {
            functionName: tencentCloudFunctionOutputs.Name
          }
        }
      ]
    })

    const outputs = {
      url: `${tencentApiGatewayOutputs.protocol}://${tencentApiGatewayOutputs.subDomain}/${tencentApiGatewayOutputs.environment}/`
    }

    return outputs
  }

  async remove() {
    const tencentCloudFunction = await this.load('@serverless/tencent-scf')
    const tencentApiGateway = await this.load('@serverless/tencent-apigateway')

    await tencentCloudFunction.remove()
    await tencentApiGateway.remove()

    return {}
  }
}

module.exports = TencentExpress
