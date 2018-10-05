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

  * Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const SettlementModel = require('../../../../src/models/settlement/settlement')
const Db = require('../../../../src/models')

Test('SettlementModel', async (settlementModelTest) => {
  let sandbox

  settlementModelTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  settlementModelTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  await settlementModelTest.test('settlementModel should', async createTest => {
    try {
      await createTest.test('return insert settlement into database', async test => {
        try {
          const settlement = {
            reason: 'reason text',
            createdDate: new Date()
          }
          const enums = {}

          Db.settlement = {
            insert: sandbox.stub().returns(true)
          }

          let result = await SettlementModel.create(settlement, enums)
          test.ok(result, 'Result returned and matched')
          test.ok(Db.settlement.insert.withArgs({
            reason: settlement.reason,
            createdDate: settlement.createdDate
          }).calledOnce, 'insert with args ... called once')

          Db.settlement.insert = sandbox.stub().throws(new Error('Error occured'))
          try {
            result = await SettlementModel.create(settlement)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.equal(err.message, 'Error occured', `Error "${err.message}" thrown as expected`)
          }
          test.end()
        } catch (err) {
          Logger.error(`createTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await createTest.end()
    } catch (err) {
      Logger.error(`settlementModelTest failed with error - ${err}`)
      createTest.fail()
      createTest.end()
    }
  })

  await settlementModelTest.end()
})
