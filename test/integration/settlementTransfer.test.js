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
const dbQueries = require('./helpers/dbQueries.js')
const Config = require('../../src/lib/config')
const Db = require('../../src/models')
const settlementWindowService = require('../../src/domain/settlementWindow')
const settlement = require('../../src/domain/settlement')

const enums = {
  settlementStates: {
    ABORTED: 'ABORTED',
    PENDING_SETTLEMENT: 'PENDING_SETTLEMENT',
    PS_TRANSFERS_COMMITTED: 'PS_TRANSFERS_COMMITTED',
    PS_TRANSFERS_RECORDED: 'PS_TRANSFERS_RECORDED',
    PS_TRANSFERS_RESERVED: 'PS_TRANSFERS_RESERVED',
    SETTLED: 'SETTLED',
    SETTLING: 'SETTLING'
  },
  settlementWindowStates: {
    ABORTED: 'ABORTED',
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    PENDING_SETTLEMENT: 'PENDING_SETTLEMENT',
    SETTLED: 'SETTLED'
  },
  transferStates: {
    ABORTED: 'ABORTED',
    COMMITTED: 'COMMITTED',
    EXPIRED_PREPARED: 'EXPIRED_PREPARED',
    EXPIRED_RESERVED: 'EXPIRED_RESERVED',
    FAILED: 'FAILED',
    INVALID: 'INVALID',
    RECEIVED_FULFIL: 'RECEIVED_FULFIL',
    RECEIVED_PREPARE: 'RECEIVED_PREPARE',
    REJECTED: 'REJECTED',
    RESERVED: 'RESERVED',
    RESERVED_TIMEOUT: 'RESERVED_TIMEOUT'
  },
  transferParticipantRoleTypes: {
    DFSP_POSITION: 5,
    DFSP_SETTLEMENT: 4,
    HUB: 3,
    PAYEE_DFSP: 2,
    PAYER_DFSP: 1
  },
  ledgerEntryTypes: {
    HUB_FEE: 3,
    INTERCHANGE_FEE: 2,
    POSITION_DEPOSIT: 4,
    POSITION_WITHDRAWAL: 5,
    PRINCIPLE_VALUE: 1,
    RECORD_FUNDS_IN: 9,
    RECORD_FUNDS_OUT: 10,
    SETTLEMENT_NET_RECIPIENT: 6,
    SETTLEMENT_NET_SENDER: 7,
    SETTLEMENT_NET_ZERO: 8
  }
}

// TODO better reasons

PrepareTransferData()

Test('SettlementTransfer should', async settlementTransferTest => {
  await Db.connect(Config.DATABASE_URI)
  let settlementWindowId
  let settlementData

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
      let params = { query: { state: enums.settlementWindowStates.OPEN } }
      let res = await settlementWindowService.getByParams(params)
      settlementWindowId = res[0].settlementWindowId
      test.ok(settlementWindowId > 0, 'retrieve the OPEN window')

      params = { settlementWindowId: settlementWindowId, state: enums.settlementWindowStates.CLOSED, reason: 'text' }
      res = await settlementWindowService.close(params, enums.settlementWindowStates)
      test.ok(res, `close operation returned result`)

      // res = await settlementWindowService.getById({ settlementWindowId })
      // test.equal(res.state, enums.settlementWindowStates.CLOSED, `getById returns window ${settlementWindowId} state CLOSED`)   

      let dbData = await dbQueries.settlementWindowStateChange([settlementWindowId, res.settlementWindowId])
      let closedWindow = dbData.filter(window => {
        return window.settlementWindowId === settlementWindowId && window.settlementWindowStateId === enums.settlementWindowStates.CLOSED
      })
      let openWindow = dbData.filter(window => {
        return window.settlementWindowId === res.settlementWindowId && window.settlementWindowStateId === enums.settlementWindowStates.OPEN
      })
      test.ok(closedWindow, `close window with id: ${settlementWindowId}`)
      test.ok(openWindow, `open window with id: ${res.settlementWindowId}`)
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('create settlement should', async test => {
    try {
      let params = {
        reason: 'Create settlement for window',
        settlementWindows: [
          {
            id: settlementWindowId
          }
        ]
      }
      settlementData = await settlement.settlementEventTrigger(params, enums)

      let dbData = await dbQueries.settlementWindowStateChange([settlementWindowId])
      let pendingWindow = dbData.filter(window => {
        return window.settlementWindowId === settlementWindowId && window.settlementWindowStateId === enums.settlementWindowStates.PENDING_SETTLEMENT
      })
      test.ok(pendingWindow, `change window with id ${settlementWindowId} to ${enums.settlementWindowStates.PENDING_SETTLEMENT} state`)

      dbData = await dbQueries.settlements()
      let createdSettlement = dbData.filter(settlement => {
        return settlement.settlementId === settlementData.id && settlement.createdDate === settlementData.createdDate
      })
      test.ok(createdSettlement, `create settlement with id ${settlement.settlementId}`)

      dbData = await dbQueries.settlementStateChange()
      let changedSettlementState = dbData.filter(stateChange => {
        return stateChange.settlementId === settlementData.id && stateChange.settlementStateId === enums.settlementStates.PENDING_SETTLEMENT
      })
      test.ok(changedSettlementState, `change settlement state to ${enums.settlementStates.PENDING_SETTLEMENT}`)
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  // DOES NOT WORK
  await settlementTransferTest.test('PS_TRANSFERS_RECORDED for PAYER, THEN FOR PAYEE ', async test => {
    try {
      let params = {
        participants: [
          {
            id: settlementData.participants[0].id,
            accounts: [
              {
                id: settlementData.participants[0].accounts[0].id,
                reason: 'Transfers recorded for payer',
                state: enums.transferStates.PS_TRANSFERS_RECORDED
              }
            ]
          }
        ]
      }
      let res = await settlement.putById(settlementData.id, params, enums)

      params = {
        participants: [
          {
            id: settlementData.participants[1].id,
            accounts: [
              {
                id: settlementData.participants[1].accounts[0].id,
                reason: 'Transfers recorded for payer',
                state: enums.transferStates.PS_TRANSFERS_RECORDED
              }
            ]
          }
        ]
      }

      res = await settlement.putById(settlementData.id, params, enums)
      test.ok(res)
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('PS_TRANSFERS_RECORDED for PAYER AND FOR PAYEE ', async test => {
    try {
      let params = {
        participants: [
          {
            id: settlementData.participants[0].id,
            accounts: [
              {
                id: settlementData.participants[0].accounts[0].id,
                reason: 'Transfers recorded for payer',
                state: enums.transferStates.PS_TRANSFERS_RESERVED
              }
            ]
          },
          {
            id: settlementData.participants[1].id,
            accounts: [
              {
                id: settlementData.participants[1].accounts[0].id,
                reason: 'Transfers recorded for payer',
                state: enums.transferStates.PS_TRANSFERS_RECORDED
              }
            ]
          }
        ]
      }
      let res = await settlement.putById(settlementData.id, params, enums)
      test.ok(res)
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('PS_TRANSFERS_RESERVED for PAYER & PAYEE', async test => {
    try {
      let params = {
        participants: [
          {
            id: settlementData.participants[0].id,
            accounts: [
              {
                id: settlementData.participants[0].accounts[0].id,
                reason: 'Transfers recorded for payer',
                state: enums.transferStates.PS_TRANSFERS_RESERVED
              }
            ]
          },
          {
            id: settlementData.participants[1].id,
            accounts: [
              {
                id: settlementData.participants[1].accounts[0].id,
                reason: 'Transfers recorded for payer',
                state: enums.transferStates.PS_TRANSFERS_RESERVED
              }
            ]
          }
        ]
      }
      let res = await settlement.putById(settlementData.id, params, enums)
      test.ok(res)
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('PS_TRANSFERS_COMMITTED for PAYER & PAYEE', async test => {
    try {
      let params = {
        participants: [
          {
            id: settlementData.participants[0].id,
            accounts: [
              {
                id: settlementData.participants[0].accounts[0].id,
                reason: 'Transfers recorded for payer',
                state: enums.transferStates.PS_TRANSFERS_COMMITTED
              }
            ]
          },
          {
            id: settlementData.participants[1].id,
            accounts: [
              {
                id: settlementData.participants[1].accounts[0].id,
                reason: 'Transfers recorded for payer',
                state: enums.transferStates.PS_TRANSFERS_COMMITTED
              }
            ]
          }
        ]
      }
      let res = await settlement.putById(settlementData.id, params, enums)
      test.ok(res)
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

  await settlementTransferTest.test('', async test => {
    try {
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  settlementTransferTest.end()
})
