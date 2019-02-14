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
const PrepareTransferData = require('./helpers/transferData')
const Config = require('../../src/lib/config')
const Db = require('../../src/models')
const settlementWindowService = require('../../src/domain/settlementWindow')

PrepareTransferData()

Test('SettlementTransfer should', async settlementTransferTest => {
  await Db.connect(Config.DATABASE_URI)
  let settlementWindowId

  let sandbox
  settlementTransferTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })
  settlementTransferTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  await settlementTransferTest.test('close current window should', async test => {
    try {
      let params = { query: { state: 'OPEN' } }
      let res = await settlementWindowService.getByParams(params)
      settlementWindowId = res[0].settlementWindowId
      test.ok(settlementWindowId > 0, 'retrieve the OPEN window')

      params = { settlementWindowId, state: 'CLOSED', reason: 'text' }
      let enums = { OPEN: 'OPEN', CLOSED: 'CLOSED' }
      res = await settlementWindowService.close(params, enums)
      test.ok(res, `close operation returned result`)

      res = await settlementWindowService.getById({ settlementWindowId })
      test.equal(res.state, enums.CLOSED, `getById returns window ${settlementWindowId} state CLOSED`)

      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('create settlement should', async test => {
    try {
      // TODO: to be continued
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('finally disconnect database', async test => {
    try {
      await Db.disconnect()
      test.pass('done')
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  settlementTransferTest.end()
})
