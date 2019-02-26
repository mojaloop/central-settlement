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
 * Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const SettlementWindowService = require('../../../../src/domain/settlementWindow')
const SettlementWindowModel = require('../../../../src/models/settlementWindow')

Test('SettlementWindowService', async (settlementWindowServiceTest) => {
  let sandbox

  settlementWindowServiceTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  settlementWindowServiceTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  await settlementWindowServiceTest.test('getById should', async getByIdTest => {
    try {
      const params = { settlementWindowId: 1 }
      const enums = {}
      const options = { logger: Logger }
      const settlementWindowMock = { settlementWindowId: 1 }

      await getByIdTest.test('return settlement window', async test => {
        try {
          SettlementWindowModel.getById = sandbox.stub().returns(settlementWindowMock)
          let result = await SettlementWindowService.getById(params, enums, options)
          test.ok(result, 'Result returned')
          test.ok(SettlementWindowModel.getById.withArgs(params, enums).calledOnce, 'SettlementWindowModel.getById with args ... called once')

          SettlementWindowModel.getById = sandbox.stub().returns()
          try {
            await SettlementWindowService.getById(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.ok(err instanceof Error, `Error ${err.message} thrown`)
            test.ok(SettlementWindowModel.getById.withArgs(params, enums).calledOnce, 'SettlementWindowModel.getById with args ... called once')
          }
          test.end()
        } catch (err) {
          Logger.error(`getByIdTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByIdTest.end()
    } catch (err) {
      Logger.error(`settlementWindowServiceTest failed with error - ${err}`)
      getByIdTest.fail()
      getByIdTest.end()
    }
  })

  await settlementWindowServiceTest.test('getByParams should', async getByParamsTest => {
    try {
      let params = { query: { participantId: 1, state: 'PENDING_SETTLEMENT' } }
      const enums = {}
      const options = { logger: Logger }
      const settlementWindowsMock = [{ settlementWindowId: 1 }, { settlementWindowId: 2 }]

      await getByParamsTest.test('return settlement windows', async test => {
        try {
          SettlementWindowModel.getByParams = sandbox.stub().returns(settlementWindowsMock)
          let result = await SettlementWindowService.getByParams(params, enums, options)
          test.ok(result, 'Result returned')
          test.ok(SettlementWindowModel.getByParams.withArgs(params, enums).calledOnce, 'SettlementWindowModel.getByParams with args ... called once')

          SettlementWindowModel.getByParams = sandbox.stub().returns()
          try {
            await SettlementWindowService.getByParams(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.ok(err instanceof Error, `Error "${err.message}" thrown as expected`)
            test.ok(SettlementWindowModel.getByParams.withArgs(params, enums).calledOnce, 'SettlementWindowModel.getByParams with args ... called once')
          }

          params = { query: {} }
          try {
            await SettlementWindowService.getByParams(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.pass(`Error "${err.message.substr(0, 50)} ..." thrown as expected`)
          }

          test.end()
        } catch (err) {
          Logger.error(`getByParamsTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByParamsTest.end()
    } catch (err) {
      Logger.error(`settlementWindowServiceTest failed with error - ${err}`)
      getByParamsTest.fail()
      getByParamsTest.end()
    }
  })

  await settlementWindowServiceTest.test('close should', async closeTest => {
    try {
      let params = { id: 1 }
      const enums = {}
      const options = { logger: Logger }
      const settlementWindowIdMock = 1
      const settlementWindowMock = { settlementWindowId: settlementWindowIdMock, state: 'CLOSED' }

      await closeTest.test('close settlement window and return it', async test => {
        try {
          SettlementWindowModel.close = sandbox.stub().returns(settlementWindowIdMock)
          SettlementWindowModel.getById = sandbox.stub().returns(settlementWindowMock)
          let result = await SettlementWindowService.close(params, enums, options)
          test.ok(result, 'Result returned')
          test.ok(SettlementWindowModel.close.withArgs(params, enums).calledOnce, 'SettlementWindowModel.close with args ... called once')
          test.ok(SettlementWindowModel.getById.withArgs({ settlementWindowId: settlementWindowIdMock }, enums).calledOnce, 'SettlementWindowModel.getById with args ... called once')

          SettlementWindowModel.close = sandbox.stub().throws(new Error('Error occurred'))
          try {
            await SettlementWindowService.close(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.equal(err.message, 'Error occurred', `Error "${err.message}" thrown as expected`)
            test.ok(SettlementWindowModel.close.withArgs(params, enums).calledOnce, 'SettlementWindowModel.close with args ... called once')
          }

          test.end()
        } catch (err) {
          Logger.error(`closeTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await closeTest.end()
    } catch (err) {
      Logger.error(`settlementWindowServiceTest failed with error - ${err}`)
      closeTest.fail()
      closeTest.end()
    }
  })

  await settlementWindowServiceTest.end()
})
