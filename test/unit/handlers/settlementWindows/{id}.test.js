/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 * Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Mockgen = require('./../../../data/mockgen.js')
const InitServer = require('./../../../../src/setup').initialize
const Enums = require('./../../../../src/models/lib/enums')
const Logger = require('@mojaloop/central-services-logger')
const settlementWindows = require('./../../../../src/domain/settlementWindow')
const Db = require('./../../../../src/lib/db')

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

Test('/settlementWindows/{id}', async (settlementWindowTest) => {
  let server
  let sandbox
  settlementWindowTest.beforeEach(async t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    server = await InitServer()
    t.end()
  })

  settlementWindowTest.afterEach(async t => {
    await server.stop()
    sandbox.restore()
    t.end()
  })
  await settlementWindowTest.test('test settlementWindows get by Id operation', async (t) => {
    sandbox.stub(Enums, 'settlementWindowStates').returns({})
    sandbox.stub(settlementWindows, 'getById').returns({})
    try {
      const requests = new Promise((resolve, reject) => {
        Mockgen().requests({
          path: '/settlementWindows/{id}',
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
      Logger.error(`testing error ${e}`)
      t.fail()
      t.end()
    }
  })

  await settlementWindowTest.test('test settlements get by params throws', async (t) => {
    sandbox.stub(Enums, 'settlementWindowStates').returns({})
    sandbox.stub(settlementWindows, 'getById').throws()
    try {
      const requests = new Promise((resolve, reject) => {
        Mockgen().requests({
          path: '/settlementWindows/{id}',
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
      t.equal(response.statusCode, 500, 'Ok response status')
      t.end()
    } catch (e) {
      Logger.error(`testing error ${e}`)
      t.fail()
      t.end()
    }
  })
  await settlementWindowTest.test('test settlements put operation', async (t) => {
    sandbox.stub(Enums, 'settlementWindowStates').returns({})
    sandbox.stub(settlementWindows, 'close').returns({})
    try {
      const requests = new Promise((resolve, reject) => {
        Mockgen().requests({
          path: '/settlementWindows/{id}',
          operation: 'post'
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
        method: 'post',
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
      Logger.error(`testing error ${e}`)
      t.fail()
      t.end()
    }
  })

  await settlementWindowTest.test('test settlements get by params throws', async (t) => {
    sandbox.stub(Enums, 'settlementWindowStates').returns({})
    sandbox.stub(settlementWindows, 'close').throws()
    try {
      const requests = new Promise((resolve, reject) => {
        Mockgen().requests({
          path: '/settlementWindows/{id}',
          operation: 'post'
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
        method: 'post',
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
      t.equal(response.statusCode, 500, 'Ok response status')
      t.end()
    } catch (e) {
      Logger.error(`testing error ${e}`)
      t.fail()
      t.end()
    }
  })

  await settlementWindowTest.end()
})
