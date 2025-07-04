/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * ModusBox
 - Georgi Georgiev <georgi.georgiev@modusbox.com

 * Lewis Daly <lewis@vesselstech.com>
 --------------
 ******/
'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')

const Consumer = require('@mojaloop/central-services-stream').Util.Consumer
const { statusEnum, serviceName } = require('@mojaloop/central-services-shared').HealthCheck.HealthCheckEnums

const MigrationLockModel = require('../../../../src/models/misc/migrationLock')

const {
  getSubServiceHealthBroker,
  getSubServiceHealthDatastore
} = require('../../../../src/lib/healthCheck/subServiceHealth')

Test('SubServiceHealth test', function (subServiceHealthTest) {
  let sandbox

  subServiceHealthTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Consumer, 'getListOfTopics')
    sandbox.stub(Consumer, 'isConnected')
    t.end()
  })

  subServiceHealthTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  subServiceHealthTest.test('getSubServiceHealthDatastore', datastoreTest => {
    datastoreTest.test('datastore test passes when the database is not migration locked', async test => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(false)
      const expected = { name: serviceName.datastore, status: statusEnum.OK }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthDatastore should match expected result')
      test.ok(MigrationLockModel.getIsMigrationLocked.called)
      test.end()
    })

    datastoreTest.test('datastore test fails when the database is migration locked', async test => {
      // Arrange

      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(true)
      const expected = { name: serviceName.datastore, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthDatastore should match expected result')
      test.ok(MigrationLockModel.getIsMigrationLocked.called)
      test.end()
    })

    datastoreTest.test('datastore test fails when getIsMigrationLocked throws', async test => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').throws(new Error('Error connecting to db'))
      const expected = { name: serviceName.datastore, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthDatastore should match expected result')
      test.ok(MigrationLockModel.getIsMigrationLocked.called)
      test.end()
    })

    datastoreTest.end()
  })

  subServiceHealthTest.test('getSubServiceHealthBroker', brokerTest => {
    brokerTest.test('broker test passes when there are no topics', async test => {
      // Arrange
      Consumer.getListOfTopics.returns([])
      // allConnected should not be called if there are no topics
      const allConnectedStub = sandbox.stub(Consumer, 'allConnected')
      const expected = { name: serviceName.broker, status: statusEnum.OK }

      // Act
      const result = await getSubServiceHealthBroker()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should match expected result')
      test.equal(allConnectedStub.callCount, 0, 'allConnected should not be called')
      test.end()
    })

    brokerTest.test('broker test fails when one broker cannot connect', async test => {
      // Arrange
      Consumer.getListOfTopics.returns(['admin1', 'admin2'])
      const allConnectedStub = sandbox.stub(Consumer, 'allConnected')
      allConnectedStub.onFirstCall().resolves(true)
      allConnectedStub.onSecondCall().resolves(false)
      const expected = { name: serviceName.broker, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthBroker()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should match expected result')
      test.equal(allConnectedStub.callCount, 2, 'allConnected should be called for each topic')
      test.end()
    })

    brokerTest.test('broker test fails when allConnected throws for a topic', async test => {
      // Arrange
      Consumer.getListOfTopics.returns(['admin1', 'admin2'])
      const allConnectedStub = sandbox.stub(Consumer, 'allConnected')
      allConnectedStub.onFirstCall().resolves(true)
      allConnectedStub.onSecondCall().throws(new Error('Not connected!'))
      const expected = { name: serviceName.broker, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthBroker()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should match expected result')
      test.equal(allConnectedStub.callCount, 2, 'allConnected should be called for each topic')
      test.end()
    })

    brokerTest.test('Passes when all topics are connected', async test => {
      // Arrange
      Consumer.getListOfTopics.returns(['admin1', 'admin2'])
      const allConnectedStub = sandbox.stub(Consumer, 'allConnected')
      allConnectedStub.resolves(true)
      const expected = { name: serviceName.broker, status: statusEnum.OK }

      // Act
      const result = await getSubServiceHealthBroker()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should match expected result')
      test.equal(allConnectedStub.callCount, 2, 'allConnected should be called for each topic')
      test.end()
    })

    brokerTest.test('broker test fails when getListOfTopics throws', async test => {
      // Arrange
      Consumer.getListOfTopics.throws(new Error('Failed to get topics'))
      const expected = { name: serviceName.broker, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthBroker()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should match expected result')
      test.end()
    })

    brokerTest.end()
  })

  subServiceHealthTest.end()
})
