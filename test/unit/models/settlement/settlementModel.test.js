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
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Db = require('../../../../src/lib/db')
const Logger = require('@mojaloop/central-services-logger')
const Model = require('../../../../src/models/settlement/settlementModel.js')

Test('SettlementModelModel', async (settlementModelModelTest) => {
  let sandbox

  settlementModelModelTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    Db.from = (table) => {
      return Db[table]
    }
    t.end()
  })

  settlementModelModelTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  settlementModelModelTest.test('getByName should return the settlementModel', async test => {
    try {
      const name = 'DEFERRED_NET'
      const settlementModel = {
        settlementModelId: 1,
        name
      }
      Db.settlementModel = {
        findOne: sandbox.stub()
      }
      Db.settlementModel.findOne.withArgs({ name, isActive: 1 }).returns(settlementModel)

      const result = await Model.getByName(name)
      test.deepEqual(result, settlementModel, 'Results Match')
      test.end()
    } catch (e) {
      Logger.error(e)
      test.fail('Error Thrown')
      test.end()
    }
  })
  settlementModelModelTest.test('getByName should return the settlementModel', async test => {
    try {
      const name = 'DEFERRED_NET'
      const settlementModel = {
        settlementModelId: 1,
        name
      }
      Db.settlementModel = {
        find: sandbox.stub()
      }
      Db.settlementModel.find.withArgs({ isActive: 1 }).returns([settlementModel])

      const result = await Model.getAll()
      test.deepEqual(result[0], settlementModel, 'Results Match')
      test.end()
    } catch (e) {
      Logger.error(e)
      test.fail('Error Thrown')
      test.end()
    }
  })
  settlementModelModelTest.end()
})
