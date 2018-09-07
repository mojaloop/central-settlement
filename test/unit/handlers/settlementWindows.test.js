'use strict'

const Test = require('tape')
const Mockgen = require('../../data/mockgen.js')
const InitServer = require('../../../src/server').init

/**
 * Test for /settlementWindows
 */
Test('/settlementWindows', async function (t) {
  const server = await InitServer()
  /**
     * summary: Returns Settlement Windows as per parameter(s).
     * description:
     * parameters: participantId, state, fromDateTime, toDateTime
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
  await t.test('test getSettlementWindowsByParams get operation', async function (t) {
    const requests = new Promise((resolve, reject) => {
      Mockgen().requests({
        path: '/settlementWindows',
        operation: 'get'
      }, function (error, mock) {
        return error ? reject(error) : resolve(mock)
      })
    })

    const mock = await requests

    t.ok(mock)
    t.ok(mock.request)
    // Get the resolved path from mock request
    // Mock request Path templates({}) are resolved using path parameters
    const options = {
      method: 'get',
      url: '/v1' + mock.request.path
    }
    if (mock.request.body) {
      // Send the request body
      options.payload = mock.request.body
    } else if (mock.request.formData) {
      // Send the request form data
      options.payload = mock.request.formData
      // Set the Content-Type as application/x-www-form-urlencoded
      options.headers = options.headers || {}
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
    // If headers are present, set the headers.
    if (mock.request.headers && mock.request.headers.length > 0) {
      options.headers = mock.request.headers
    }

    const response = await server.inject(options)

    t.equal(response.statusCode, 200, 'Ok response status')
    t.end()
  })
  server.stop()
})
