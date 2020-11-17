const AWS = require('aws-sdk')
const https = require('https')

async function handler(event) {
  console.log(JSON.stringify(event))

  let distributionId
  let status = 'SUCCESS'
  let reason = ''
  try {
    distributionId = await handleCustomResourceEvent(event)
  } catch (e) {
    console.log(e)
    status = 'FAILED'
    reason = e.message
  }

  const result = await sendResponse({
    status,
    reason,
    requestId: event.RequestId,
    stackId: event.StackId,
    logicalResourceId: event.LogicalResourceId,
    physicalResourceId: distributionId,
    responseUrl: event.ResponseURL,
  })
  console.log(JSON.stringify(result))
}

async function handleCustomResourceEvent(event) {
  const distributionId = event.ResourceProperties.distributionId
  if (!distributionId) {
    throw new Error('distributionId is required')
  }

  if (event.RequestType === 'Create' || event.RequestType === 'Update') {
    await invalidate({ distributionId })
  }

  return distributionId
}

async function invalidate({ distributionId }) {
  const cloudfront = new AWS.CloudFront()
  var params = {
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: {
        Quantity: '1',
        Items: ['/*'],
      },
    },
  }
  const invalidationResult = await cloudfront.createInvalidation(params).promise()
  const completionPromise = cloudfront
    .waitFor('invalidationCompleted', {
      DistributionId: distributionId,
      Id: invalidationResult.Invalidation.Id,
    })
    .promise()
  return completionPromise
}

async function sendResponse(props) {
  const body = {
    Status: props.status,
    Reason: props.reason,
    RequestId: props.requestId,
    StackId: props.stackId,
    LogicalResourceId: props.logicalResourceId,
    PhysicalResourceId: props.physicalResourceId,
  }
  const responseBody = JSON.stringify(body)
  console.log(JSON.stringify({ message: 'sending response', responseBody }))

  return urlRequest(props.responseUrl, {
    method: 'PUT',
    body: responseBody,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Content-Length': responseBody.length,
    },
  })
}

async function urlRequest(url, { method, body, ...options }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        ...options,
      },
      (res) => {
        const chunks = []
        res.on('data', (data) => chunks.push(data))
        res.on('end', () => {
          let body = Buffer.concat(chunks)

          const statusCode = res.statusCode

          if (statusCode < 200 || statusCode >= 300) {
            reject({ statusCode })
            return
          }

          switch (res.headers['content-type']) {
            case 'application/json':
              body = JSON.parse(body)
              break
            default:
              body = body.toString()
              break
          }
          resolve(body)
        })
      }
    )
    req.on('error', reject)

    if (body) {
      req.write(body)
    }
    req.end()
  })
}

exports.handler = handler
