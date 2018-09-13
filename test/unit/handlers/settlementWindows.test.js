'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Mockgen = require('../../data/mockgen.js')
const InitServer = require('./../handlers/server')
const Enums = require('./../../../src/models/lib/enums')
const Logger = require('@mojaloop/central-services-shared').Logger
const settlementWindows = require('./../../../src/domain/settlementWindow')
/**
 * Test for /settlementWindows
 */
/**
   * summary: Returns Settlement Windows as per parameter(s).
   * description:
   * parameters: participantId, state, fromDateTime, toDateTime
   * produces: application/json
   * responses: 200, 400, 401, 404, 415, default
   */

Test('/settlementWindows', async (settlementWindowTest) => {
  let server
  let sandbox
  settlementWindowTest.beforeEach(async t => {
    sandbox = Sinon.createSandbox()
    server = await InitServer()
    t.end()
  })

  settlementWindowTest.afterEach(async t => {
    await server.stop()
    sandbox.restore()
    t.end()
  })
  await settlementWindowTest.test('test getSettlementWindowsByParams get operation', async (t) => {
    sandbox.stub(Enums, 'settlementWindowStates').returns({})
    sandbox.stub(settlementWindows, 'getByParams').returns({
      'settlementWindowId': 8,
      'state': 'CLOSED',
      'reason': '8th window closed',
      'createdDate': '2018-09-01T15:02:34.000Z',
      'changedDate': '2018-09-01T16:24:37.000Z'
    })
    try {
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
    } catch (e) {
      Logger(`testing error ${e}`)
      t.fail()
      t.end()
    }
  })

  await settlementWindowTest.test('test getSettlementWindowsByParams get operation throws', async (t) => {
    sandbox.stub(Enums, 'settlementWindowStates').returns({})
    sandbox.stub(settlementWindows, 'getByParams').throws()
    try {
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
      t.equal(response.statusCode, 404, 'Ok response status')
      t.end()
    } catch (e) {
      Logger(`testing error ${e}`)
      t.fail()
      t.end()
    }
  })
  await settlementWindowTest.end()
})
