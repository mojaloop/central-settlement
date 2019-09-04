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
const SettlementService = require('../../../../src/domain/settlement')
const SettlementModel = require('../../../../src/models/settlement')
const SettlementWindowModel = require('../../../../src/models/settlementWindow')

Test('SettlementService', async (settlementServiceTest) => {
  let sandbox

  settlementServiceTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  settlementServiceTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  await settlementServiceTest.test('getById should', async getByIdTest => {
    try {
      const settlementId = 1
      const enums = {}
      const options = {
        logger: Logger
      }
      const settlementMock = {
        settlementId: 1,
        state: 'PENDING_SETTLEMENT'
      }
      const settlementWindowsListMock = [{
        id: 1,
        state: 'PENDING_SETTLEMENT'
      }]
      const participantCurrenciesListMock = [{
        id: 1,
        participantCurrencyId: 1,
        state: 'PENDING_SETTLEMENT',
        reason: 'text',
        netAmount: 100,
        currency: 'USD',
        key: 1
      }, {
        id: 1,
        participantCurrencyId: 2,
        state: 'SETTLED',
        reason: 'text',
        netAmount: 50,
        currency: 'ZAR',
        key: 2
      }]
      SettlementModel.getById = sandbox.stub().returns(settlementMock)
      SettlementWindowModel.getBySettlementId = sandbox.stub().returns(settlementWindowsListMock)
      SettlementModel.settlementParticipantCurrency = {
        getParticipantCurrencyBySettlementId: sandbox.stub().returns(participantCurrenciesListMock)
      }

      await getByIdTest.test('return settlement participant accounts', async test => {
        try {
          const result = await SettlementService.getById({ settlementId }, enums, options)
          test.ok(result, 'Result returned')
          test.ok(SettlementModel.getById.withArgs({ settlementId }, enums).calledOnce, 'SettlementModel.getById with args ... called once')
          test.ok(SettlementWindowModel.getBySettlementId.withArgs({ settlementId }, enums).calledOnce, 'SettlementWindowModel.getBySettlementId with args ... called once')
          test.ok(SettlementModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId.withArgs({ settlementId }, enums).calledOnce, 'SettlementModel.spc.getParticipantCurrencyBySettlementId with args ... called once')
          test.end()
        } catch (err) {
          Logger.error(`getByIdTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByIdTest.test('throw', async test => {
        try {
          SettlementModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId = sandbox.stub()
          await SettlementService.getById({ settlementId }, enums)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getByIdTest failed with error - ${err}`)
          test.equal(err.message, 'participantCurrenciesList is not iterable', `Error "${err.message}" thrown`)
          test.end()
        }
      })

      await getByIdTest.test('throw', async test => {
        try {
          SettlementModel.getById = sandbox.stub()
          await SettlementService.getById({ settlementId }, enums, options)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getByIdTest failed with error - ${err}`)
          test.equal(err.message, 'Settlement not found', `Error "${err.message}" thrown`)
          test.end()
        }
      })

      await getByIdTest.end()
    } catch (err) {
      Logger.error(`settlementServiceTest failed with error - ${err}`)
      getByIdTest.fail()
      getByIdTest.end()
    }
  })

  await settlementServiceTest.test('getSettlementsByParams should', async getSettlementsByParamsTest => {
    try {
      const params = {
        query: {
          state: 1,
          invalidParam: undefined
        }
      }
      const enums = {}
      const options = {
        logger: Logger
      }
      const settlementsMockData = [{
        settlementId: 1,
        settlementStateId: 'PENDING_SETTLEMENT',
        settlementWindowId: 1,
        settlementWindowStateId: 'PENDING_SETTLEMENT',
        settlementWindowReason: 'settlement window reason text',
        createdDate: new Date(new Date() - 3600 * 1000),
        changedDate: new Date(new Date() - 1800 * 1000),
        participantId: 1,
        participantCurrencyId: 1,
        accountState: 'PENDING_SETTLEMENT',
        accountReason: 'account reason text',
        accountAmount: 75,
        accountCurrency: 'USD'
      }, {
        settlementId: 1,
        settlementStateId: 'PENDING_SETTLEMENT',
        settlementWindowId: 1,
        settlementWindowStateId: 'PENDING_SETTLEMENT',
        settlementWindowReason: 'settlement window reason text',
        createdDate: new Date(new Date() - 3600 * 1000),
        changedDate: new Date(new Date() - 1800 * 1000),
        participantId: 1,
        participantCurrencyId: 2,
        accountState: 'SETTLED',
        accountReason: 'settled reason text',
        accountAmount: 100,
        accountCurrency: 'USD'
      }]
      SettlementModel.getByParams = sandbox.stub().returns(settlementsMockData)

      await getSettlementsByParamsTest.test('return settlement participant accounts', async test => {
        try {
          const result = await SettlementService.getSettlementsByParams(params, enums, options)
          test.ok(result, 'Result returned')
          test.ok(SettlementModel.getByParams.withArgs(params.query, enums).calledOnce, 'SettlementModel.getByParams with params ... called once')
          test.equal(result[0].id, settlementsMockData[0].settlementId)
          test.equal(result[0].state, settlementsMockData[0].settlementStateId)
          test.equal(result[0].settlementWindows.length, 1)
          test.equal(result[0].settlementWindows[0].id, settlementsMockData[0].settlementWindowId)
          test.equal(result[0].settlementWindows[0].state, settlementsMockData[0].settlementWindowStateId)
          test.equal(result[0].settlementWindows[0].reason, settlementsMockData[0].settlementWindowReason)
          test.equal(result[0].participants.length, 1)
          test.equal(result[0].participants[0].id, settlementsMockData[0].participantId)
          test.equal(result[0].participants[0].accounts.length, 2)
          test.equal(result[0].participants[0].accounts[0].id, settlementsMockData[0].participantCurrencyId)
          test.equal(result[0].participants[0].accounts[0].state, settlementsMockData[0].accountState)
          test.equal(result[0].participants[0].accounts[0].reason, settlementsMockData[0].accountReason)
          test.equal(result[0].participants[0].accounts[0].netSettlementAmount.amount, settlementsMockData[0].accountAmount)
          test.equal(result[0].participants[0].accounts[0].netSettlementAmount.currency, settlementsMockData[0].accountCurrency)
          test.equal(result[0].participants[0].accounts[1].id, settlementsMockData[1].participantCurrencyId)
          test.equal(result[0].participants[0].accounts[1].state, settlementsMockData[1].accountState)
          test.equal(result[0].participants[0].accounts[1].reason, settlementsMockData[1].accountReason)
          test.equal(result[0].participants[0].accounts[1].netSettlementAmount.amount, settlementsMockData[1].accountAmount)
          test.equal(result[0].participants[0].accounts[1].netSettlementAmount.currency, settlementsMockData[1].accountCurrency)
          test.end()
        } catch (err) {
          Logger.error(`getSettlementsByParamsTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getSettlementsByParamsTest.test('throw', async test => {
        try {
          SettlementModel.getByParams = sandbox.stub()
          await SettlementService.getSettlementsByParams(params, enums)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getSettlementsByParamsTest failed with error - ${err}`)
          test.equal(err.message, 'Settlements not found', `Error "${err.message}" thrown`)
          test.end()
        }
      })

      await getSettlementsByParamsTest.test('throw', async test => {
        try {
          await SettlementService.getSettlementsByParams({ query: { invalidParam: undefined } }, enums)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getSettlementsByParamsTest failed with error - ${err}`)
          test.pass(`Error "${err.message.substr(0, 50)} ..." thrown`)
          test.end()
        }
      })

      await getSettlementsByParamsTest.end()
    } catch (err) {
      Logger.error(`settlementServiceTest failed with error - ${err}`)
      getSettlementsByParamsTest.fail()
      getSettlementsByParamsTest.end()
    }
  })

  await settlementServiceTest.test('settlementEventTrigger should', async settlementEventTriggerTest => {
    try {
      const params = {
        reason: 'settlement trigger',
        settlementWindows: [
          { id: 1 },
          { id: 2 }
        ]
      }
      const enums = {
        settlementWindowStates: {
          CLOSED: 'CLOSED'
        }
      }
      const options = {
        logger: Logger
      }

      const settlementWindowsMock = [{ state: 'CLOSED' }, { state: 'CLOSED' }]
      const settlementIdMock = 1
      const settlementMock = {
        settlementId: settlementIdMock,
        state: 'PENDING_SETTLEMENT',
        settlementWindows: [1, 2],
        participants: [{
          id: 1,
          accounts: [{
            id: 1
          }]
        }]
      }
      const settlementWindowsListMock = [{
        id: 1,
        state: 'PENDING_SETTLEMENT'
      }, {
        id: 2,
        state: 'PENDING_SETTLEMENT'
      }]
      const participantCurrenciesListMock = [{
        id: 1,
        participantCurrencyId: 1,
        state: 'PENDING_SETTLEMENT',
        reason: 'text',
        netAmount: 200,
        currency: 'USD',
        key: 1
      }, {
        id: 1,
        participantCurrencyId: 2,
        state: 'PENDING_SETTLEMENT',
        reason: 'text',
        netAmount: 150,
        currency: 'USD',
        key: 2
      }]

      await settlementEventTriggerTest.test('create new settlement and return it', async test => {
        try {
          SettlementWindowModel.getByListOfIds = sandbox.stub().returns(settlementWindowsMock)
          SettlementModel.triggerEvent = sandbox.stub().returns(settlementIdMock)
          SettlementModel.getById = sandbox.stub().returns(settlementMock)
          SettlementWindowModel.getBySettlementId = sandbox.stub().returns(settlementWindowsListMock)
          SettlementModel.settlementParticipantCurrency = {
            getParticipantCurrencyBySettlementId: sandbox.stub().returns(participantCurrenciesListMock)
          }
          const result = await SettlementService.settlementEventTrigger(params, enums, options)
          test.ok(result, 'Result returned')
          const idList = [1, 2]
          const reason = params.reason
          test.ok(SettlementWindowModel.getByListOfIds.withArgs(idList, enums.settlementWindowStates).calledOnce, 'SettlementWindowModel.getByListOfIds with args ... called once')
          test.ok(SettlementModel.triggerEvent.withArgs({ idList, reason }, enums).calledOnce, 'SettlementModel.triggerEvent with args ... called once')
          test.ok(SettlementWindowModel.getBySettlementId.withArgs({ settlementId: settlementIdMock }).calledOnce, 'SettlementWindowModel.getBySettlementId with args ... called once')
          test.ok(SettlementModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId.withArgs({ settlementId: settlementIdMock }).calledOnce, 'SettlementModel.spc.getParticipantCurrencyBySettlementId w/ args ... called once')
          test.equal(result.participants[0].accounts[1].state, participantCurrenciesListMock[1].state, 'Result property matched')
          test.end()
        } catch (err) {
          Logger.error(`settlementEventTriggerTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await settlementEventTriggerTest.test('throw when the number of windows found does not match the input', async test => {
        try {
          SettlementWindowModel.getByListOfIds = sandbox.stub().returns([{ state: 'CLOSED' }])
          await SettlementService.settlementEventTrigger(params, enums)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`settlementEventTriggerTest failed with error - ${err}`)
          test.equal(err.message, 'At least one provided settlement window does not exist', `Error "${err.message}" thrown`)
          test.end()
        }
      })

      await settlementEventTriggerTest.test('throw if any input window is not CLOSED', async test => {
        try {
          SettlementWindowModel.getByListOfIds = sandbox.stub().returns([{ state: 'CLOSED' }, { state: 'OPEN' }])
          await SettlementService.settlementEventTrigger(params, enums)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`settlementEventTriggerTest failed with error - ${err}`)
          test.equal(err.message, 'At least one settlement window is not in closed or aborted state', `Error "${err.message}" thrown`)
          test.end()
        }
      })

      await settlementEventTriggerTest.end()
    } catch (err) {
      Logger.error(`settlementServiceTest failed with error - ${err}`)
      settlementEventTriggerTest.fail()
      settlementEventTriggerTest.end()
    }
  })

  await settlementServiceTest.test('getByIdParticipantAccount should', async getByIdParticipantAccountTest => {
    try {
      const settlementId = 1
      const participantId = 1
      const accountId = 1
      let params = { settlementId, participantId, accountId }
      const enums = {}
      const options = {
        logger: Logger
      }

      const settlementMock = {
        settlementId,
        state: 'PENDING_SETTLEMENT'
      }
      const settlementParticipantCurrencyIdListMock = [{
        settlementParticipantCurrencyId: 1
      }, {
        settlementParticipantCurrencyId: 2
      }]
      const settlementWindowsMock = [{
        settlementWindowId: 1,
        state: 'PENDING_SETTLEMENT',
        reason: 'window 1 reason text',
        createdDate: new Date(new Date() - 3600 * 1000),
        changedDate: new Date(new Date() - 1800 * 1000)
      }, {
        settlementWindowId: 2,
        state: 'SETTLED',
        reason: 'window 2 reason text',
        createdDate: new Date(new Date() - 3600 * 1000),
        changedDate: new Date(new Date() - 1800 * 1000)
      }]
      const accountsMock = [{
        participantId: 1,
        participantCurrencyId: 1,
        settlementParticipantCurrencyId: 11,
        state: 'PENDING_SETTLEMENT',
        reason: 'account 1 reason text',
        netAmount: 112,
        currency: 'USD'
      }, {
        participantId: 1,
        participantCurrencyId: 2,
        settlementParticipantCurrencyId: 12,
        state: 'SETTLED',
        reason: 'account 2 reason text',
        netAmount: 56,
        currency: 'USD'
      }]
      const participantCurrencyIdMock = 1
      // let settlementParticipantCurrencyId = 1
      const settlementParticipantCurrencyList = accountsMock
      await getByIdParticipantAccountTest.test('return settlement participant accounts', async test => {
        try {
          SettlementModel.getById = sandbox.stub().returns(settlementMock)
          SettlementModel.settlementParticipantCurrency = {
            getAccountsInSettlementByIds: sandbox.stub().returns(settlementParticipantCurrencyIdListMock),
            getSettlementAccountById: sandbox.stub().returns(accountsMock),
            getSettlementAccountsByListOfIds: sandbox.stub().returns(accountsMock)
          }
          SettlementModel.checkParticipantAccountExists = sandbox.stub().returns(participantCurrencyIdMock)
          SettlementModel.getAccountInSettlement = sandbox.stub().returns(settlementParticipantCurrencyList[0])
          SettlementModel.settlementSettlementWindow = {
            getWindowsBySettlementIdAndAccountId: sandbox.stub().returns(settlementWindowsMock),
            getWindowsBySettlementIdAndParticipantId: sandbox.stub().returns(settlementWindowsMock)
          }
          let result = await SettlementService.getByIdParticipantAccount(params, enums, options)
          test.ok(result, 'Result returned')
          test.ok(SettlementModel.getById.withArgs({ settlementId }, enums).calledOnce, 'SettlementModel.getById with args ... called once')
          test.ok(SettlementModel.settlementParticipantCurrency.getAccountsInSettlementByIds.withArgs({ settlementId, participantId }, enums).calledOnce, 'SettlementModel.spc.getAccountsInSettlementByIds with args ... called once')
          test.ok(SettlementModel.checkParticipantAccountExists.withArgs({ participantId, accountId }, enums).calledOnce, 'SettlementModel.checkParticipantAccountExists with args ... called once')
          test.ok(SettlementModel.getAccountInSettlement.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.getAccountInSettlement with args ... called once')
          test.ok(SettlementModel.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.ssw.getWindowsBySettlementIdAndAccountId with args ... called once')
          test.ok(SettlementModel.settlementParticipantCurrency.getSettlementAccountById.withArgs(settlementParticipantCurrencyList[0].settlementParticipantCurrencyId, enums).calledOnce, 'SettlementModel.spc.getSettlementAccountById with args ... called once')
          test.equal(result.id, settlementMock.settlementId)
          test.equal(result.state, settlementMock.state)
          test.equal(result.settlementWindows.length, settlementWindowsMock.length)
          test.equal(result.settlementWindows[0].settlementWindowId, settlementWindowsMock[0].settlementWindowId)
          test.equal(result.settlementWindows[0].state, settlementWindowsMock[0].state)
          test.equal(result.settlementWindows[1].reason, settlementWindowsMock[1].reason)
          test.equal(result.participants.length, 1)
          test.equal(result.participants[0].accounts.length, accountsMock.length)
          test.equal(result.participants[0].accounts[0].id, accountsMock[0].participantCurrencyId)
          test.equal(result.participants[0].accounts[0].state, accountsMock[0].state)
          test.equal(result.participants[0].accounts[0].reason, accountsMock[0].reason)
          test.equal(result.participants[0].accounts[1].netSettlementAmount.amount, accountsMock[1].netAmount)
          test.equal(result.participants[0].accounts[1].netSettlementAmount.currency, accountsMock[1].currency)

          params = { settlementId, participantId }
          result = await SettlementService.getByIdParticipantAccount(params, enums)
          test.ok(result, 'Result returned')
          test.ok(SettlementModel.getById.withArgs({ settlementId }, enums).calledTwice, 'SettlementModel.getById with args ... called twice')
          test.ok(SettlementModel.settlementParticipantCurrency.getAccountsInSettlementByIds.withArgs({ settlementId, participantId }, enums).calledTwice, 'SettlementModel.spc.getAccountsInSettlementByIds with args ... called twice')
          test.ok(SettlementModel.checkParticipantAccountExists.withArgs({ participantId, accountId }, enums).calledOnce, 'SettlementModel.checkParticipantAccountExists with args ... called once')
          test.ok(SettlementModel.getAccountInSettlement.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.getAccountInSettlement with args ... called once')
          test.ok(SettlementModel.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.ssw.getWindowsBySettlementIdAndAccountId with args ... called once')
          test.ok(SettlementModel.settlementParticipantCurrency.getSettlementAccountById.withArgs(settlementParticipantCurrencyList[0].settlementParticipantCurrencyId, enums).calledOnce, 'SettlementModel.spc.getSettlementAccountById with args ... called once')

          params = { settlementId, participantId, accountId }
          SettlementModel.getAccountInSettlement = sandbox.stub().returns()
          try {
            await SettlementService.getByIdParticipantAccount(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.equal(err.message, 'Account not in settlement', `Error "${err.message}" thrown as expected`)
            test.ok(SettlementModel.getById.withArgs({ settlementId }, enums).calledThrice, 'SettlementModel.getById with args ... called thrice')
            test.ok(SettlementModel.settlementParticipantCurrency.getAccountsInSettlementByIds.withArgs({ settlementId, participantId }, enums).calledThrice, 'SettlementModel.spc.getAccountsInSettlementByIds with args ... called thrice')
            test.ok(SettlementModel.checkParticipantAccountExists.withArgs({ participantId, accountId }, enums).calledTwice, 'SettlementModel.checkParticipantAccountExists with args ... called twice')
            test.ok(SettlementModel.getAccountInSettlement.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.getAccountInSettlement with args ... called once')
            test.ok(SettlementModel.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.ssw.getWindowsBySettlementIdAndAccountId with args ... called once')
            test.ok(SettlementModel.settlementParticipantCurrency.getSettlementAccountById.withArgs(settlementParticipantCurrencyList[0].settlementParticipantCurrencyId, enums).calledOnce, 'SettlementModel.spc.getAccountById with args ... called once')
          }

          params = { settlementId, participantId, accountId }
          SettlementModel.getById = sandbox.stub().returns()
          try {
            await SettlementService.getByIdParticipantAccount(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.equal(err.message, 'Settlement not found', `Error "${err.message}" thrown as expected`)
            test.ok(SettlementModel.getById.withArgs({ settlementId }, enums).calledOnce, 'SettlementModel.getById with args ... called once')
            test.ok(SettlementModel.settlementParticipantCurrency.getAccountsInSettlementByIds.withArgs({ settlementId, participantId }, enums).calledThrice, 'SettlementModel.spc.getAccountsInSettlementByIds with args ... called thrice')
            test.ok(SettlementModel.checkParticipantAccountExists.withArgs({ participantId, accountId }, enums).calledTwice, 'SettlementModel.checkParticipantAccountExists with args ... called twice')
            test.ok(SettlementModel.getAccountInSettlement.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.getAccountInSettlement with args ... called once')
            test.ok(SettlementModel.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.ssw.getWindowsBySettlementIdAndAccountId with args ... called once')
            test.ok(SettlementModel.settlementParticipantCurrency.getSettlementAccountById.withArgs(settlementParticipantCurrencyList[0].settlementParticipantCurrencyId, enums).calledOnce, 'SettlementModel.spc.getAccountById with args ... called once')
          }

          SettlementModel.getById = sandbox.stub().returns(settlementMock)
          SettlementModel.checkParticipantAccountExists = sandbox.stub().returns()
          try {
            await SettlementService.getByIdParticipantAccount(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.equal(err.message, 'Provided account does not match any participant position account', `Error "${err.message}" thrown as expected`)
            test.ok(SettlementModel.getById.withArgs({ settlementId }, enums).calledOnce, 'SettlementModel.getById with args ... called once')
            test.equal(SettlementModel.settlementParticipantCurrency.getAccountsInSettlementByIds.withArgs({ settlementId, participantId }, enums).callCount, 4, 'SettlementModel.spc.getAccountsInSettlementByIds with args ... called four times')
            test.ok(SettlementModel.checkParticipantAccountExists.withArgs({ participantId, accountId }, enums).calledOnce, 'SettlementModel.checkParticipantAccountExists with args ... called once')
            test.ok(SettlementModel.getAccountInSettlement.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.getAccountInSettlement with args ... called once')
            test.ok(SettlementModel.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.ssw.getWindowsBySettlementIdAndAccountId with args ... called once')
            test.ok(SettlementModel.settlementParticipantCurrency.getSettlementAccountById.withArgs(settlementParticipantCurrencyList[0].settlementParticipantCurrencyId, enums).calledOnce, 'SettlementModel.spc.getAccountById with args ... called once')
          }

          SettlementModel.settlementParticipantCurrency.getAccountsInSettlementByIds = sandbox.stub().returns([])
          try {
            await SettlementService.getByIdParticipantAccount(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.equal(err.message, 'Participant not in settlement', `Error "${err.message}" thrown as expected`)
            test.ok(SettlementModel.getById.withArgs({ settlementId }, enums).calledTwice, 'SettlementModel.getById with args ... called twice')
            test.ok(SettlementModel.settlementParticipantCurrency.getAccountsInSettlementByIds.withArgs({ settlementId, participantId }, enums).calledOnce, 'SettlementModel.spc.getAccountsInSettlementByIds with args ... called once')
            test.ok(SettlementModel.checkParticipantAccountExists.withArgs({ participantId, accountId }, enums).calledOnce, 'SettlementModel.checkParticipantAccountExists with args ... called once')
            test.ok(SettlementModel.getAccountInSettlement.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.getAccountInSettlement with args ... called once')
            test.ok(SettlementModel.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId.withArgs({ settlementId, accountId }, enums).calledOnce, 'SettlementModel.ssw.getWindowsBySettlementIdAndAccountId with args ... called once')
            test.ok(SettlementModel.settlementParticipantCurrency.getSettlementAccountById.withArgs(settlementParticipantCurrencyList[0].settlementParticipantCurrencyId, enums).calledOnce, 'SettlementModel.spc.getAccountById with args ... called once')
          }
          test.end()
        } catch (err) {
          Logger.error(`getByIdParticipantAccountTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByIdParticipantAccountTest.end()
    } catch (err) {
      Logger.error(`settlementServiceTest failed with error - ${err}`)
      getByIdParticipantAccountTest.fail()
      getByIdParticipantAccountTest.end()
    }
  })

  await settlementServiceTest.end()
})
