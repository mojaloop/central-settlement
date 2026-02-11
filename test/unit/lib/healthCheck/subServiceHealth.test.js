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
    sandbox.stub(Consumer, 'getConsumer')
    t.end()
  })

  subServiceHealthTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  subServiceHealthTest.test('getSubServiceHealthDatastore', datastoreTest => {
    const datastoreTestCases = [
      { name: 'passes when the database is not migration locked', stubMethod: 'returns', stubArg: false, expectedStatus: statusEnum.OK },
      { name: 'fails when the database is migration locked', stubMethod: 'returns', stubArg: true, expectedStatus: statusEnum.DOWN },
      { name: 'fails when getIsMigrationLocked throws', stubMethod: 'throws', stubArg: new Error('Error connecting to db'), expectedStatus: statusEnum.DOWN }
    ]

    for (const { name, stubMethod, stubArg, expectedStatus } of datastoreTestCases) {
      datastoreTest.test(name, async test => {
        sandbox.stub(MigrationLockModel, 'getIsMigrationLocked')[stubMethod](stubArg)
        const expected = { name: serviceName.datastore, status: expectedStatus }

        const result = await getSubServiceHealthDatastore()

        test.deepEqual(result, expected, 'getSubServiceHealthDatastore should match expected result')
        test.ok(MigrationLockModel.getIsMigrationLocked.called)
        test.end()
      })
    }

    datastoreTest.end()
  })

  subServiceHealthTest.test('getSubServiceHealthBroker', brokerTest => {
    brokerTest.test('passes when there are no topics', async test => {
      Consumer.getListOfTopics.returns([])
      const result = await getSubServiceHealthBroker()

      test.deepEqual(result, { name: serviceName.broker, status: statusEnum.OK }, 'getSubServiceHealthBroker should match expected result')
      test.equal(Consumer.getConsumer.callCount, 0, 'getConsumer should not be called')
      test.end()
    })

    const twoTopicBrokerCases = [
      {
        name: 'fails when one consumer is not healthy',
        setup: (sb) => {
          Consumer.getConsumer.onFirstCall().returns({ isHealthy: sb.stub().resolves(true) })
          Consumer.getConsumer.onSecondCall().returns({ isHealthy: sb.stub().resolves(false) })
        },
        expectedStatus: statusEnum.DOWN
      },
      {
        name: 'fails when getConsumer throws for a topic',
        setup: (sb) => {
          Consumer.getConsumer.onFirstCall().returns({ isHealthy: sb.stub().resolves(true) })
          Consumer.getConsumer.onSecondCall().throws(new Error('No consumer found'))
        },
        expectedStatus: statusEnum.DOWN
      },
      {
        name: 'fails when isHealthy rejects for a topic',
        setup: (sb) => {
          Consumer.getConsumer.onFirstCall().returns({ isHealthy: sb.stub().resolves(true) })
          Consumer.getConsumer.onSecondCall().returns({ isHealthy: sb.stub().rejects(new Error('Health check failed')) })
        },
        expectedStatus: statusEnum.DOWN
      },
      {
        name: 'passes when all consumers are healthy',
        setup: (sb) => {
          Consumer.getConsumer.returns({ isHealthy: sb.stub().resolves(true) })
        },
        expectedStatus: statusEnum.OK
      }
    ]

    for (const { name, setup, expectedStatus } of twoTopicBrokerCases) {
      brokerTest.test(name, async test => {
        Consumer.getListOfTopics.returns(['admin1', 'admin2'])
        setup(sandbox)
        const result = await getSubServiceHealthBroker()

        test.deepEqual(result, { name: serviceName.broker, status: expectedStatus }, 'getSubServiceHealthBroker should match expected result')
        test.equal(Consumer.getConsumer.callCount, 2, 'getConsumer should be called for each topic')
        test.end()
      })
    }

    brokerTest.test('fails when getListOfTopics throws', async test => {
      Consumer.getListOfTopics.throws(new Error('Failed to get topics'))
      const result = await getSubServiceHealthBroker()

      test.deepEqual(result, { name: serviceName.broker, status: statusEnum.DOWN }, 'getSubServiceHealthBroker should match expected result')
      test.end()
    })

    brokerTest.end()
  })

  subServiceHealthTest.end()
})
