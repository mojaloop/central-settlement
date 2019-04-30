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
const Models = require('./helpers/models')
const Config = require('../../src/lib/config')
const Db = require('../../src/lib/db')
const SettlementWindowService = require('../../src/domain/settlementWindow')
const SettlementService = require('../../src/domain/settlement')
const Enums = require('../../src/models/lib/enums')
const SettlementWindowStateChangeModel = require('../../src/models/settlementWindow/settlementWindowStateChange')
const SettlementModel = require('../../src/models/settlement/settlement')
const SettlementStateChangeModel = require('../../src/models/settlement/settlementStateChange')
const SettlementParticipantCurrencyModel = require('../../src/models/settlement/settlementParticipantCurrency')
const TransferModel = require('@mojaloop/central-ledger/src/models/transfer/transfer')
const TransferStateChangeModel = require('@mojaloop/central-ledger/src/models/transfer/transferStateChange')
const ParticipantPositionModel = require('@mojaloop/central-ledger/src/models/position/participantPosition')
const Producer = require('../../src/handlers/lib/kafka/producer')
// require('leaked-handles').set({ fullStack: true, timeout: 15000, debugSockets: true })

const currency = 'USD'
let netSettlementSenderId
let netSenderAccountId
let netSettlementRecipientId
let netRecipientAccountId
let netSettlementAmount
let netSenderSettlementTransferId
let netRecipientSettlementTransferId

const getEnums = async () => {
  return {
    settlementWindowStates: await Enums.settlementWindowStates(),
    settlementStates: await Enums.settlementStates(),
    transferStates: await Enums.transferStates(),
    ledgerAccountTypes: await Enums.ledgerAccountTypes(),
    ledgerEntryTypes: await Enums.ledgerEntryTypes(),
    transferParticipantRoleTypes: await Enums.transferParticipantRoleTypes(),
    participantLimitTypes: await Enums.participantLimitTypes()
  }
}

PrepareTransferData()

Test('SettlementTransfer should', async settlementTransferTest => {
  await Db.connect(Config.DATABASE_URI)
  let enums = await getEnums()
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
      let res = await SettlementWindowService.getByParams(params) // method to be verified
      settlementWindowId = res[0].settlementWindowId
      test.ok(settlementWindowId > 0, 'retrieve the OPEN window')

      params = { settlementWindowId: settlementWindowId, state: enums.settlementWindowStates.CLOSED, reason: 'text' }
      res = await SettlementWindowService.close(params, enums.settlementWindowStates) // method to be verified
      test.ok(res, 'close settlement window operation success')

      let closedWindow = await SettlementWindowStateChangeModel.getBySettlementWindowId(settlementWindowId)
      let openWindow = await SettlementWindowStateChangeModel.getBySettlementWindowId(res.settlementWindowId)
      test.equal(closedWindow.settlementWindowStateId, enums.settlementWindowStates.CLOSED, `window id ${settlementWindowId} is CLOSED`)
      test.equal(openWindow.settlementWindowStateId, enums.settlementWindowStates.OPEN, `window id ${res.settlementWindowId} is OPEN`)

      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('create settlement should', async test => {
    try {
      const params = {
        reason: 'reason',
        settlementWindows: [
          {
            id: settlementWindowId
          }
        ]
      }
      settlementData = await SettlementService.settlementEventTrigger(params, enums) // method to be verified
      test.ok(settlementData, 'settlementEventTrigger operation success')

      let settlementWindow = await SettlementWindowStateChangeModel.getBySettlementWindowId(settlementWindowId)
      test.equal(settlementWindow.settlementWindowStateId, enums.settlementWindowStates.PENDING_SETTLEMENT, `window id ${settlementWindowId} is PENDING_SETTLEMENT`)

      let settlement = await SettlementModel.getById(settlementData.id)
      test.ok(settlement, `create settlement with id ${settlementData.id}`)

      let settlementState = await SettlementStateChangeModel.getBySettlementId(settlementData.id)
      test.equal(settlementState.settlementStateId, enums.settlementStates.PENDING_SETTLEMENT, `settlement state is PENDING_SETTLEMENT`)
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('PS_TRANSFERS_RECORDED for PAYER', async test => {
    try {
      // read and store settlement participant and account data needed in remaining tests
      let participantFilter = settlementData.participants.filter(participant => {
        return participant.accounts.find(account => {
          if (account.netSettlementAmount.currency === currency && account.netSettlementAmount.amount > 0) {
            netSenderAccountId = account.id
            netSettlementAmount = account.netSettlementAmount.amount
            return true
          }
        })
      })
      netSettlementSenderId = participantFilter[0].id
      participantFilter = settlementData.participants.filter(participant => {
        return participant.accounts.find(account => {
          if (account.netSettlementAmount.currency === currency && account.netSettlementAmount.amount < 0) {
            netRecipientAccountId = account.id
            return true
          }
        })
      })
      netSettlementRecipientId = participantFilter[0].id
      // data retrieved and stored into module scope variables

      const params = {
        participants: [
          {
            id: netSettlementSenderId,
            accounts: [
              {
                id: netSenderAccountId,
                reason: 'Transfers recorded for payer',
                state: enums.settlementStates.PS_TRANSFERS_RECORDED
              }
            ]
          }
        ]
      }
      let res = await SettlementService.putById(settlementData.id, params, enums) // method to be verified
      test.ok(res, 'settlement putById operation successful')

      const settlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netSenderAccountId)
      test.equal(settlementParticipantCurrencyRecord.settlementStateId, enums.settlementStates.PS_TRANSFERS_RECORDED, 'record for payer changed to PS_TRANSFERS_RECORDED')

      netSenderSettlementTransferId = settlementParticipantCurrencyRecord.settlementTransferId
      const transferRecord = await TransferModel.getById(netSenderSettlementTransferId)
      test.ok(transferRecord, 'settlement transfer is created for payer')

      const transferStateChangeRecord = await TransferStateChangeModel.getByTransferId(netSenderSettlementTransferId)
      test.equal(transferStateChangeRecord.transferStateId, enums.transferStates.RECEIVED_PREPARE, 'settlement transfer for payer is RECEIVED_PREPARE')

      const transferParticipantRecords = await Models.getTransferParticipantsByTransferId(netSenderSettlementTransferId)
      const hubTransferParticipant = transferParticipantRecords.find(record => {
        return record.transferParticipantRoleTypeId === enums.transferParticipantRoleTypes.HUB
      })
      const payerTransferParticipant = transferParticipantRecords.find(record => {
        return record.transferParticipantRoleTypeId === enums.transferParticipantRoleTypes.DFSP_POSITION
      })
      test.ok(payerTransferParticipant.amount < 0, `DR settlement transfer for SETTLEMENT_NET_SENDER is negative for payer ${payerTransferParticipant.amount}`)
      test.ok(hubTransferParticipant.amount > 0, `CR settlement transfer for SETTLEMENT_NET_SENDER is positive for hub ${hubTransferParticipant.amount}`)
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('PS_TRANSFERS_RECORDED for PAYEE', async test => {
    try {
      const externalReferenceSample = 'tr0123456789'
      const params = {
        participants: [
          {
            id: netSettlementRecipientId,
            accounts: [
              {
                id: netRecipientAccountId,
                reason: 'Transfers recorded for payee',
                state: enums.settlementStates.PS_TRANSFERS_RECORDED,
                externalReference: externalReferenceSample
              }
            ]
          }
        ]
      }
      let res = await SettlementService.putById(settlementData.id, params, enums) // method to be verified
      test.ok(res, 'settlement putById operation successful')

      const settlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netRecipientAccountId)
      test.equal(settlementParticipantCurrencyRecord.settlementStateId, enums.settlementStates.PS_TRANSFERS_RECORDED, 'record for payee changed to PS_TRANSFERS_RECORDED')
      test.equal(settlementParticipantCurrencyRecord.externalReference, externalReferenceSample, 'external reference is recorded')

      netRecipientSettlementTransferId = settlementParticipantCurrencyRecord.settlementTransferId
      const transferRecord = await TransferModel.getById(netRecipientSettlementTransferId)
      test.ok(transferRecord, 'settlement transfer is created for payee')

      const transferStateChangeRecord = await TransferStateChangeModel.getByTransferId(netRecipientSettlementTransferId)
      test.equal(transferStateChangeRecord.transferStateId, enums.transferStates.RECEIVED_PREPARE, 'settlement transfer for payee is RECEIVED_PREPARE')

      const transferParticipantRecords = await Models.getTransferParticipantsByTransferId(netRecipientSettlementTransferId)
      const hubTransferParticipant = transferParticipantRecords.find(record => {
        return record.transferParticipantRoleTypeId === enums.transferParticipantRoleTypes.HUB
      })
      const payeeTransferParticipant = transferParticipantRecords.find(record => {
        return record.transferParticipantRoleTypeId === enums.transferParticipantRoleTypes.DFSP_POSITION
      })
      test.ok(hubTransferParticipant.amount < 0, `DR settlement transfer for SETTLEMENT_NET_RECIPIENT is negative for hub ${hubTransferParticipant.amount}`)
      test.ok(payeeTransferParticipant.amount > 0, `CR settlement transfer for SETTLEMENT_NET_RECIPIENT is positive for payer ${payeeTransferParticipant.amount}`)

      const settlementState = await SettlementStateChangeModel.getBySettlementId(settlementData.id)
      test.equal(settlementState.settlementStateId, enums.settlementStates.PS_TRANSFERS_RECORDED, `settlement state is PS_TRANSFERS_RECORDED`)

      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('PS_TRANSFERS_RESERVED for PAYER & PAYEE', async test => {
    try {
      const params = {
        participants: [
          {
            id: netSettlementSenderId,
            accounts: [
              {
                id: netSenderAccountId,
                reason: 'Transfers reserved for payer & payee',
                state: enums.settlementStates.PS_TRANSFERS_RESERVED
              }
            ]
          },
          {
            id: netSettlementRecipientId,
            accounts: [
              {
                id: netRecipientAccountId,
                reason: 'Transfers reserved for payer & payee',
                state: enums.settlementStates.PS_TRANSFERS_RESERVED
              }
            ]
          }
        ]
      }
      const initialPayerPosition = (await ParticipantPositionModel.getPositionByCurrencyId(netSenderAccountId)).value
      const initialPayeePosition = (await ParticipantPositionModel.getPositionByCurrencyId(netRecipientAccountId)).value

      let res = await SettlementService.putById(settlementData.id, params, enums) // method to be verified
      test.ok(res, 'settlement putById operation successful')

      const payerSettlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netSenderAccountId)
      test.equal(payerSettlementParticipantCurrencyRecord.settlementStateId, enums.settlementStates.PS_TRANSFERS_RESERVED, 'record for payer changed to PS_TRANSFERS_RESERVED')

      const payeeSettlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netRecipientAccountId)
      test.equal(payeeSettlementParticipantCurrencyRecord.settlementStateId, enums.settlementStates.PS_TRANSFERS_RESERVED, 'record for payee changed to PS_TRANSFERS_RESERVED')

      const settlementState = await SettlementStateChangeModel.getBySettlementId(settlementData.id)
      test.equal(settlementState.settlementStateId, enums.settlementStates.PS_TRANSFERS_RESERVED, `settlement state is PS_TRANSFERS_RESERVED`)

      const payerTransferStateChangeRecord = await TransferStateChangeModel.getByTransferId(netSenderSettlementTransferId)
      test.equal(payerTransferStateChangeRecord.transferStateId, enums.transferStates.RESERVED, 'settlement transfer for payer is RESERVED')

      const payeeTransferStateChangeRecord = await TransferStateChangeModel.getByTransferId(netRecipientSettlementTransferId)
      test.equal(payeeTransferStateChangeRecord.transferStateId, enums.transferStates.RESERVED, 'settlement transfer for payee is RESERVED')

      const currentPayerPosition = (await ParticipantPositionModel.getPositionByCurrencyId(netSenderAccountId)).value
      test.equal(currentPayerPosition, initialPayerPosition, 'position for NET_SETTLEMENT_SENDER is not changed')

      const currentPayeePosition = (await ParticipantPositionModel.getPositionByCurrencyId(netRecipientAccountId)).value
      test.equal(currentPayeePosition, initialPayeePosition + netSettlementAmount, 'position for NET_SETTLEMENT_RECIPIENT is adjusted')

      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('PS_TRANSFERS_COMMITTED for PAYER & PAYEE', async test => {
    try {
      const params = {
        participants: [
          {
            id: netSettlementSenderId,
            accounts: [
              {
                id: netSenderAccountId,
                reason: 'Transfers committed for payer & payee',
                state: enums.settlementStates.PS_TRANSFERS_COMMITTED
              }
            ]
          },
          {
            id: netSettlementRecipientId,
            accounts: [
              {
                id: netRecipientAccountId,
                reason: 'Transfers committed for payer & payee',
                state: enums.settlementStates.PS_TRANSFERS_COMMITTED
              }
            ]
          }
        ]
      }
      const initialPayerPosition = (await ParticipantPositionModel.getPositionByCurrencyId(netSenderAccountId)).value
      const initialPayeePosition = (await ParticipantPositionModel.getPositionByCurrencyId(netRecipientAccountId)).value

      let res = await SettlementService.putById(settlementData.id, params, enums) // method to be verified
      test.ok(res, 'settlement putById operation successful')

      const payerSettlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netSenderAccountId)
      test.equal(payerSettlementParticipantCurrencyRecord.settlementStateId, enums.settlementStates.PS_TRANSFERS_COMMITTED, 'record for payer changed to PS_TRANSFERS_COMMITTED')

      const payeeSettlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netRecipientAccountId)
      test.equal(payeeSettlementParticipantCurrencyRecord.settlementStateId, enums.settlementStates.PS_TRANSFERS_COMMITTED, 'record for payee changed to PS_TRANSFERS_COMMITTED')

      const settlementState = await SettlementStateChangeModel.getBySettlementId(settlementData.id)
      test.equal(settlementState.settlementStateId, enums.settlementStates.PS_TRANSFERS_COMMITTED, 'settlement state is PS_TRANSFERS_COMMITTED')

      const window = await SettlementWindowStateChangeModel.getBySettlementWindowId(settlementWindowId)
      test.equal(window.settlementWindowStateId, enums.settlementWindowStates.PENDING_SETTLEMENT, 'window is still PENDING_SETTLEMENT')

      const payerTransferStateChangeRecord = await TransferStateChangeModel.getByTransferId(netSenderSettlementTransferId)
      test.equal(payerTransferStateChangeRecord.transferStateId, enums.transferStates.COMMITTED, 'settlement transfer for payer is COMMITTED')

      const payeeTransferStateChangeRecord = await TransferStateChangeModel.getByTransferId(netRecipientSettlementTransferId)
      test.equal(payeeTransferStateChangeRecord.transferStateId, enums.transferStates.COMMITTED, 'settlement transfer for payee is COMMITTED')

      const currentPayerPosition = (await ParticipantPositionModel.getPositionByCurrencyId(netSenderAccountId)).value
      test.equal(currentPayerPosition, initialPayerPosition - netSettlementAmount, 'position for NET_SETTLEMENT_SENDER is adjusted')

      const currentPayeePosition = (await ParticipantPositionModel.getPositionByCurrencyId(netRecipientAccountId)).value
      test.equal(currentPayeePosition, initialPayeePosition, 'position for NET_SETTLEMENT_RECIPIENT is unchanged')

      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('SETTLED for PAYER', async test => {
    try {
      const params = {
        participants: [
          {
            id: netSettlementSenderId,
            accounts: [
              {
                id: netSenderAccountId,
                reason: 'Transfers settled for payer',
                state: enums.settlementStates.SETTLED
              }
            ]
          }
        ]
      }

      let res = await SettlementService.putById(settlementData.id, params, enums)
      test.ok(res, 'settlement putById operation successful')

      const payerSettlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netSenderAccountId)
      test.equal(payerSettlementParticipantCurrencyRecord.settlementStateId, enums.settlementStates.SETTLED, 'record for payer changed to SETTLED')

      const settlementState = await SettlementStateChangeModel.getBySettlementId(settlementData.id)
      test.equal(settlementState.settlementStateId, enums.settlementStates.SETTLING, 'settlement state is SETTLING')

      const window = await SettlementWindowStateChangeModel.getBySettlementWindowId(settlementWindowId)
      test.equal(window.settlementWindowStateId, enums.settlementWindowStates.PENDING_SETTLEMENT, 'window is still PENDING_SETTLEMENT')

      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('update SETTLED for PAYER with external reference', async test => {
    try {
      let externalReferenceSample = 'tr98765432109876543210'
      let reasonSample = 'Additional reason for SETTLED account'
      const params = {
        participants: [
          {
            id: netSettlementSenderId,
            accounts: [
              {
                id: netSenderAccountId,
                reason: reasonSample,
                state: enums.settlementStates.SETTLED,
                externalReference: externalReferenceSample
              }
            ]
          }
        ]
      }

      let res = await SettlementService.putById(settlementData.id, params, enums)
      test.ok(res, 'settlement putById operation successful')

      const payerSettlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netSenderAccountId)
      test.equal(payerSettlementParticipantCurrencyRecord.reason, reasonSample, 'Reason recorded')
      test.equal(payerSettlementParticipantCurrencyRecord.externalReference, externalReferenceSample, 'External reference recorded')
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('SETTLED for PAYEE', async test => {
    try {
      const params = {
        participants: [
          {
            id: netSettlementRecipientId,
            accounts: [
              {
                id: netRecipientAccountId,
                reason: 'Payee: SETTLED, settlement: SETTLED',
                state: enums.settlementStates.SETTLED
              }
            ]
          }
        ]
      }

      let res = await SettlementService.putById(settlementData.id, params, enums)
      test.ok(res, 'settlement putById operation successful')

      const payeeSettlementParticipantCurrencyRecord = await SettlementParticipantCurrencyModel.getBySettlementAndAccount(settlementData.id, netRecipientAccountId)
      test.equal(payeeSettlementParticipantCurrencyRecord.settlementStateId, enums.settlementStates.SETTLED, 'record for payee changed to SETTLED')

      const settlementState = await SettlementStateChangeModel.getBySettlementId(settlementData.id)
      test.equal(settlementState.settlementStateId, enums.settlementStates.SETTLED, 'settlement state is SETTLED')

      const window = await SettlementWindowStateChangeModel.getBySettlementWindowId(settlementWindowId)
      test.equal(window.settlementWindowStateId, enums.settlementWindowStates.SETTLED, 'window is SETTLED')

      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await settlementTransferTest.test('finally disconnect open handles', async test => {
    try {
      await Db.disconnect()
      test.pass('database connection closed')
      await Producer.getProducer('topic-notification-event').disconnect()
      test.pass('producer to topic-notification-event disconnected')
      test.end()
    } catch (err) {
      Logger.error(`settlementTransferTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  settlementTransferTest.end()
})
