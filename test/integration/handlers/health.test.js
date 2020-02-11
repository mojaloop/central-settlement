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
 - Name Surname <name.surname@gatesfoundation.com>

 * Lewis Daly <lewis@vesselstech.com>
 --------------
 **********/

'use strict'

const Test = require('tape')
const Joi = require('@hapi/joi')
const Logger = require('@mojaloop/central-services-logger')
const Db = require('@mojaloop/central-services-database').Db

const Config = require('../../../src/lib/config')
const {
  createRequest,
  unwrapResponse
} = require('../../util')
const healthHandler = require('../../../src/api/handlers/health')

Test('Health Handler', async handlersTest => {
  await handlersTest.test('registerAllHandlers should', async registerAllHandlers => {
    await registerAllHandlers.test('setup handlers', async (test) => {
      await Db.connect(Config.DATABASE)

      test.pass('done')
      test.end()
    })

    await registerAllHandlers.end()
  })

  /* Health Check Tests */

  await handlersTest.test('healthCheck should', async healthCheckTest => {
    await healthCheckTest.test('get the basic health of the service', async (test) => {
      // Arrange
      const expectedSchema = {
        status: Joi.string().valid('OK').required(),
        uptime: Joi.number().required(),
        startTime: Joi.date().iso().required(),
        versionNumber: Joi.string().required(),
        services: Joi.array().required()
      }
      const expectedStatus = 200
      const expectedServices = [
        { name: 'datastore', status: 'OK' },
        { name: 'broker', status: 'OK' }
      ]

      // Act
      const {
        responseBody,
        responseCode
      } = await unwrapResponse((reply) => healthHandler.get(createRequest({}), reply))

      // Assert
      const validationResult = Joi.object().validate(responseBody, expectedSchema) // We use Joi to validate the results as they rely on timestamps that are variable
      test.equal(validationResult.error, undefined, 'The response matches the validation schema')
      test.deepEqual(responseCode, expectedStatus, 'The response code matches')
      test.deepEqual(responseBody.services, expectedServices, 'The sub-services are correct')
      test.end()
    })

    healthCheckTest.end()
  })

  await handlersTest.test('teardown', async (assert) => {
    try {
      await Db.disconnect()
      assert.pass('database connection closed')
    } catch (err) {
      Logger.error(`teardown failed with error - ${err}`)
      assert.fail()
    }

    assert.end()
  })

  handlersTest.end()
})
