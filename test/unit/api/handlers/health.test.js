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

 - Lewis Daly <lewis@vesselstech.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')

const getHealth = require('../../../../src/api/handlers/health').get
const MigrationLockModel = require('../../../../src/models/misc/migrationLock')

const {
  createRequest,
  unwrapResponse
} = require('../../../util/index')

Test('/health', async healthTest => {
  let sandbox

  healthTest.beforeEach(async t => {
    sandbox = Sinon.createSandbox()

    t.end()
  })

  healthTest.afterEach(async t => {
    sandbox.restore()

    t.end()
  })

  healthTest.test('getHealth', getHealthTest => {
    getHealthTest.test('returns the correct response when the subservices are up', async test => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(false)
      const expectedResponseCode = 200

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => getHealth(createRequest({ query: { detailed: true } }), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    getHealthTest.test('returns the correct response when a subservice is down', async test => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').throws(new Error('DB Down'))
      const expectedResponseCode = 502

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => getHealth(createRequest({ query: { detailed: true } }), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    getHealthTest.end()
  })

  healthTest.end()
})
