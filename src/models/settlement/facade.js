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
 * Deon Botha <deon.botha@modusbox.com>
 --------------
 ******/

'use strict'

const Db = require('../index')
const Uuid = require('uuid4')
const ParticipantFacade = require('@mojaloop/central-ledger/src/models/participant/facade')
// /Users/georgi/mb/mojaloop/central-ledger/src/models/participant/facade.js
// const cloneDeep = require('../../utils/cloneDeep')

const settlementTransferValiditySeconds = 60 * 60 * 24 * 5 // currently 5 days

const hashCode = function (str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash += Math.pow(str.charCodeAt(i) * 31, str.length - i)
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

const settlementTransfersPrepare = async function (settlementId, transactionTimestamp, enums, trx = null) {
  try {
    const knex = await Db.getKnex()
    let t // see (t of settlementTransferList) below

    // Retrieve the list of SETTLED, but not prepared
    let settlementTransferList = await knex('settlementParticipantCurrency AS spc')
      .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'spc.participantCurrencyId')
      .leftJoin('transferDuplicateCheck AS tdc', 'tdc.transferId', 'spc.settlementTransferId')
      .select('spc.*', 'pc.currencyId')
      .where('spc.settlementId', settlementId)
      .whereNotNull('spc.settlementTransferId')
      .whereNull('tdc.transferId')
      .transacting(trx)

    const trxFunction = async (trx, commit = true) => {
      try {
        // if settlementTransfersPrepare method is moved outside of this module's transacation, implement transaction start HERE
        // Insert transferDuplicateCheck
        await knex('transferDuplicateCheck')
          .insert({
            transferId: t.settlementTransferId,
            hash: hashCode(t.settlementTransferId),
            createdDate: transactionTimestamp
          })
          .transacting(trx)

        // Insert transfer
        await knex('transfer')
          .insert({
            transferId: t.settlementTransferId,
            amount: Math.abs(t.netAmount),
            currencyId: t.currencyId,
            ilpCondition: 0,
            expirationDate: new Date(+new Date() + 1000 * settlementTransferValiditySeconds).toISOString().replace(/[TZ]/g, ' ').trim(),
            createdDate: transactionTimestamp
          })
          .transacting(trx)

        // Retrieve participant settlement account
        let {settlementAccountId} = await knex('participantCurrency AS pc1')
          .join('participantCurrency AS pc2', function () {
            this.on('pc2.participantId', 'pc1.participantId')
              .andOn('pc2.currencyId', 'pc1.currencyId')
              .andOn('pc2.ledgerAccountTypeId', enums.ledgerAccountTypes.SETTLEMENT)
              .andOn('pc2.isActive', 1)
          })
          .select('pc2.participantCurrencyId AS settlementAccountId')
          .where('pc1.participantCurrencyId', t.participantCurrencyId)
          .first()
          .transacting(trx)

        let ledgerEntryTypeId
        if (t.netAmount < 0) {
          ledgerEntryTypeId = enums.ledgerEntryTypes.SETTLEMENT_NET_RECIPIENT
        } else if (t.netAmount > 0) {
          ledgerEntryTypeId = enums.ledgerEntryTypes.SETTLEMENT_NET_SENDER
        } else { // t.netAmount === 0
          ledgerEntryTypeId = enums.ledgerEntryTypes.SETTLEMENT_NET_ZERO
        }

        // Insert transferParticipant records
        await knex('transferParticipant')
          .insert({
            transferId: t.settlementTransferId,
            participantCurrencyId: settlementAccountId,
            transferParticipantRoleTypeId: enums.transferParticipantRoleTypes.DFSP_SETTLEMENT_ACCOUNT,
            ledgerEntryTypeId: ledgerEntryTypeId,
            amount: t.netAmount,
            createdDate: transactionTimestamp
          })
          .transacting(trx)
        await knex('transferParticipant')
          .insert({
            transferId: t.settlementTransferId,
            participantCurrencyId: t.participantCurrencyId,
            transferParticipantRoleTypeId: enums.transferParticipantRoleTypes.DFSP_POSITION_ACCOUNT,
            ledgerEntryTypeId: ledgerEntryTypeId,
            amount: -t.netAmount,
            createdDate: transactionTimestamp
          })
          .transacting(trx)

        // Insert transferStateChange
        await knex('transferStateChange')
          .insert({
            transferId: t.settlementTransferId,
            transferStateId: enums.transferStates.RESERVED,
            reason: 'Settlement transfer prepare',
            createdDate: transactionTimestamp
          })
          .transacting(trx)

        if (commit) {
          await trx.commit
        }
        // if settlementTransfersPrepare method is moved outside of this module's transacation, implement transaction commit HERE
      } catch (err) {
        await trx.rollback
        throw err
      }
    }

    for (t of settlementTransferList) {
      if (trx) {
        await trxFunction(trx, false)
      } else {
        await knex.transaction(trxFunction)
      }
    }
  } catch (err) {
    throw err
  }
}

const settlementTransfersCommit = async function (settlementId, transactionTimestamp, enums, trx) {
  try {
    const knex = await Db.getKnex()
    let isLimitExceeded, latestPosition, transferStateChangeId

    let settlementTransferList = await knex('settlementParticipantCurrency AS spc')
      .join('transferStateChange AS tsc1', function () {
        this.on('tsc1.transferId', 'spc.settlementTransferId')
          .andOn('tsc1.transferStateId', knex.raw('?', [enums.transferStates.RESERVED]))
      })
      .leftJoin('transferStateChange AS tsc2', function () {
        this.on('tsc2.transferId', 'spc.settlementTransferId')
          .andOn('tsc2.transferStateId', knex.raw('?', [enums.transferStates.COMMITTED]))
      })
      .leftJoin('transferParticipant AS tp', function () {
        this.on('tp.transferId', 'spc.settlementTransferId')
          .andOn('tp.participantCurrencyId', 'spc.participantCurrencyId')
      })
      .select('tp.transferId', 'tp.participantCurrencyId', 'tp.amount')
      .where('spc.settlementId', settlementId)
      .whereNull('tsc2.transferId')
      .transacting(trx)

    const trxFunction = async (trx, commit = true) => {
      try {
        for (let t of settlementTransferList) {
          // Select participantPosition FOR UPDATE
          let {participantPositionId, positionValue, reservedValue} = await knex('participantPosition')
            .select('participantPositionId', 'value AS positionValue', 'reservedValue')
            .where('participantCurrencyId', t.participantCurrencyId)
            .first()
            .transacting(trx)
            .forUpdate()

          // Select participant NET_DEBIT_CAP limit
          let {netDebitCap} = await knex('participantLimit')
            .select('value AS netDebitCap')
            .where('participantCurrencyId', t.participantCurrencyId)
            .andWhere('participantLimitTypeId', enums.participantLimitTypes.NET_DEBIT_CAP)
            .first()
            .transacting(trx)
            .forUpdate()

          isLimitExceeded = netDebitCap - positionValue - reservedValue - t.amount < 0
          latestPosition = positionValue + t.amount

          // Persist latestPosition
          await knex('participantPosition')
            .update('value', latestPosition)
            .where('participantPositionId', participantPositionId)
            .transacting(trx)

          if (isLimitExceeded) {
            await ParticipantFacade.adjustLimits(t.participantCurrencyId, {type: 'NET_DEBIT_CAP', value: netDebitCap + t.amount}, trx)
            // TODO: insert new limit with correct value for startAfterParticipantPositionChangeId
            // TODO: notify DFSP for NDC change
          }

          // Persist transfer state and participant position change
          await knex('transferFulfilment')
            .insert({
              transferFulfilmentId: Uuid(),
              transferId: t.transferId,
              ilpFulfilment: 0,
              completedDate: transactionTimestamp,
              isValid: 1,
              settlementWindowId: null,
              createdDate: transactionTimestamp
            })
            .transacting(trx)

          transferStateChangeId = await knex('transferStateChange')
            .insert({
              transferId: t.transferId,
              transferStateId: enums.transferStates.COMMITTED,
              reason: 'Settlement transfer commit',
              createdDate: transactionTimestamp
            })
            .transacting(trx)

          await knex('participantPositionChange')
            .insert({
              participantPositionId: participantPositionId,
              transferStateChangeId: transferStateChangeId,
              value: latestPosition,
              reservedValue,
              createdDate: transactionTimestamp
            })
            .transacting(trx)

          if (commit) {
            await trx.commit
          }
        }
      } catch (err) {
        await trx.rollback
        throw err
      }
    }

    if (trx) {
      await trxFunction(trx, false)
    } else {
      await knex.transaction(trxFunction)
    }
  } catch (err) {
    throw err
  }
}

const Facade = {
  putById: async function (settlementId, payload, enums, options = {}) {
    try {
      const knex = await Db.getKnex()
      return await knex.transaction(async (trx) => {
        try {
          // seq-settlement-6.2.5, step 3
          let settlementData = await knex('settlement AS s')
            .join('settlementStateChange AS ssc', 'ssc.settlementStateChangeId', 's.currentStateChangeId')
            .select('s.settlementId', 'ssc.settlementStateId', 'ssc.reason', 'ssc.createdDate')
            .where('s.settlementId', settlementId)
            .first()
            .transacting(trx)
            .forUpdate()
          if (!settlementData) {
            throw new Error('Settlement window not found')
          }

          // seq-settlement-6.2.5, step 5
          let settlementAccountList = await knex('settlementParticipantCurrency AS spc')
            .leftJoin('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'spc.currentStateChangeId')
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'spc.participantCurrencyId')
            .select('pc.participantId', 'spc.participantCurrencyId', 'spcsc.settlementStateId', 'spcsc.reason', 'spc.netAmount', 'pc.currencyId', 'spc.settlementParticipantCurrencyId AS key'
            )
            .where('spc.settlementId', settlementId)
            .transacting(trx)
            .forUpdate()

          // seq-settlement-6.2.5, step 7
          let windowsList = await knex('settlementSettlementWindow AS ssw')
            .join('settlementWindow AS sw', 'sw.settlementWindowId', 'ssw.settlementWindowId')
            .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'sw.currentStateChangeId')
            .select('sw.settlementWindowId', 'swsc.settlementWindowStateId', 'swsc.reason', 'sw.createdDate')
            .where('ssw.settlementId', settlementId)
            .transacting(trx)
            .forUpdate()

          // seq-settlement-6.2.5, step 9
          let windowsAccountsList = await knex('settlementTransferParticipant')
            .select()
            .distinct('settlementWindowId', 'participantCurrencyId')
            .where({ settlementId })
            .transacting(trx)
            .forUpdate()

          let transactionTimestamp = new Date().toISOString().replace(/[TZ]/g, ' ').trim()

          // seq-settlement-6.2.5, step 11
          let settlementAccounts = {
            pendingSettlementCount: 0,
            settledCount: 0,
            notSettledCount: 0,
            unknownCount: 0
          }
          let allAccounts = new Map()
          let pid // participantId
          let aid // accountId
          let state

          // seq-settlement-6.2.5, step 12
          for (let account of settlementAccountList) {
            pid = account.participantId
            aid = account.participantCurrencyId
            state = account.settlementStateId
            allAccounts[aid] = {
              id: aid,
              state,
              reason: account.reason,
              createDate: account.createdDate,
              netSettlementAmount: {
                amount: account.netAmount,
                currency: account.currencyId
              },
              participantId: pid,
              key: account.key
            }
            switch (state) {
              case enums.settlementStates.PENDING_SETTLEMENT: {
                settlementAccounts.pendingSettlementCount++
                break
              }
              case enums.settlementStates.SETTLED: {
                settlementAccounts.settledCount++
                break
              }
              case enums.settlementStates.NOT_SETTLED: {
                settlementAccounts.notSettledCount++
                break
              }
              default: {
                settlementAccounts.unknownCount++
                break
              }
            }
          }
          let settlementAccountsInit = Object.assign({}, settlementAccounts)

          // seq-settlement-6.2.5, step 15
          let allWindows = new Map()
          for (let window of windowsList) {
            allWindows[window.settlementWindowId] = {
              settlementWindowId: window.settlementWindowId,
              settlementWindowStateId: window.settlementWindowStateId,
              reason: window.reason,
              createdDate: window.createdDate
            }
          }

          // seq-settlement-6.2.5, step 16
          let windowsAccounts = new Map()
          let accountsWindows = new Map()
          for (let record of windowsAccountsList) {
            let wid = record.settlementWindowId
            let aid = record.participantCurrencyId
            let state = allAccounts[aid].state
            accountsWindows[aid] = accountsWindows[aid] ? accountsWindows[aid] : {
              id: aid,
              windows: []
            }
            accountsWindows[aid].windows.push(wid)
            windowsAccounts[wid] = windowsAccounts[wid] ? windowsAccounts[wid] : {
              id: wid,
              pendingSettlementCount: 0,
              settledCount: 0,
              notSettledCount: 0
            }
            switch (state) {
              case enums.settlementStates.PENDING_SETTLEMENT: {
                windowsAccounts[wid].pendingSettlementCount++
                break
              }
              case enums.settlementStates.SETTLED: {
                windowsAccounts[wid].settledCount++
                break
              }
              case enums.settlementStates.NOT_SETTLED: {
                windowsAccounts[wid].notSettledCount++
                break
              }
              default: {
                break
              }
            }
          }

          // seq-settlement-6.2.5, step 17
          // let windowsAccountsInit = cloneDeep(windowsAccounts)
          let participants = []
          let affectedWindows = []
          let settlementParticipantCurrencyStateChange = []
          let processedAccounts = []
          // seq-settlement-6.2.5, step 18
          for (let participant in payload.participants) {
            let participantPayload = payload.participants[participant]
            participants.push({ id: participantPayload.id, accounts: [] })
            let pi = participants.length - 1
            participant = participants[pi]
            // seq-settlement-6.2.5, step 19
            for (let account in participantPayload.accounts) {
              let accountPayload = participantPayload.accounts[account]
              if (allAccounts[accountPayload.id] === undefined) {
                participant.accounts.push({
                  id: accountPayload.id,
                  errorInformation: {
                    errorCode: 3000,
                    errorDescription: 'Account not found'
                  }
                })
              // seq-settlement-6.2.5, step 21
              } else if (participantPayload.id !== allAccounts[accountPayload.id].participantId) {
                processedAccounts.push(accountPayload.id)
                participant.accounts.push({
                  id: accountPayload.id,
                  errorInformation: {
                    errorCode: 3000,
                    errorDescription: 'Participant and account mismatch'
                  }
                })
              // seq-settlement-6.2.5, step 22
              } else if (processedAccounts.indexOf(accountPayload.id) > -1) {
                participant.accounts.push({
                  id: accountPayload.id,
                  state: allAccounts[accountPayload.id].state,
                  reason: allAccounts[accountPayload.id].reason,
                  createdDate: allAccounts[accountPayload.id].createdDate,
                  netSettlementAmount: allAccounts[accountPayload.id].netSettlementAmount,
                  errorInformation: {
                    errorCode: 3000,
                    errorDescription: 'Account already processed once'
                  }
                })
              // seq-settlement-6.2.5, step 23
              } else if (allAccounts[accountPayload.id].state === accountPayload.state) {
                processedAccounts.push(accountPayload.id)
                participant.accounts.push({
                  id: accountPayload.id,
                  state: accountPayload.state,
                  reason: accountPayload.reason,
                  createdDate: transactionTimestamp,
                  netSettlementAmount: allAccounts[accountPayload.id].netSettlementAmount
                })
                settlementParticipantCurrencyStateChange.push({
                  settlementParticipantCurrencyId: allAccounts[accountPayload.id].key,
                  settlementStateId: accountPayload.state,
                  reason: accountPayload.reason
                })
                allAccounts[accountPayload.id].reason = accountPayload.reason
                allAccounts[accountPayload.id].createdDate = transactionTimestamp
              // seq-settlement-6.2.5, step 24
              } else if (allAccounts[accountPayload.id].state === enums.settlementStates.PENDING_SETTLEMENT &&
                accountPayload.state === enums.settlementStates.SETTLED) {
                processedAccounts.push(accountPayload.id)
                participant.accounts.push({
                  id: accountPayload.id,
                  state: accountPayload.state,
                  reason: accountPayload.reason,
                  createdDate: transactionTimestamp,
                  netSettlementAmount: allAccounts[accountPayload.id].netSettlementAmount
                })
                settlementParticipantCurrencyStateChange.push({
                  settlementParticipantCurrencyId: allAccounts[accountPayload.id].key,
                  settlementStateId: accountPayload.state,
                  reason: accountPayload.reason,
                  createdDate: transactionTimestamp,
                  settlementTransferId: Uuid()
                })
                settlementAccounts.pendingSettlementCount--
                settlementAccounts.settledCount++
                allAccounts[accountPayload.id].state = accountPayload.state
                allAccounts[accountPayload.id].reason = accountPayload.reason
                allAccounts[accountPayload.id].createdDate = transactionTimestamp
                let settlementWindowId
                for (let aw in accountsWindows[accountPayload.id].windows) {
                  settlementWindowId = accountsWindows[accountPayload.id].windows[aw]
                  windowsAccounts[settlementWindowId].pendingSettlementCount--
                  windowsAccounts[settlementWindowId].settledCount++
                  if (affectedWindows.indexOf(settlementWindowId) < 0) {
                    affectedWindows.push(settlementWindowId)
                  }
                }
              // seq-settlement-6.2.5, step 25
              } else {
                participant.accounts.push({
                  id: accountPayload.id,
                  state: allAccounts[accountPayload.id].state,
                  reason: allAccounts[accountPayload.id].reason,
                  createdDate: allAccounts[accountPayload.id].createdDate,
                  netSettlementAmount: allAccounts[accountPayload.id].netSettlementAmount,
                  errorInformation: {
                    errorCode: 3000,
                    errorDescription: 'State change not allowed'
                  }
                })
              }
            }
          }
          let insertPromises = []
          let updatePromises = []
          // seq-settlement-6.2.5, step 26
          for (let cpcsc of settlementParticipantCurrencyStateChange) {
            // Switched to insert from batchInsert because only LAST_INSERT_ID is returned
            // TODO: PoC - batchInsert + select inserted ids vs multiple inserts without select
            let cpcscCopy = Object.assign({}, cpcsc)
            delete cpcscCopy.settlementTransferId
            insertPromises.push(
              knex('settlementParticipantCurrencyStateChange')
                .insert(cpcscCopy).returning('settlementParticipantCurrencyStateChangeId')
                .transacting(trx)
            )
          }
          let settlementParticipantCurrencyStateChangeIdList = (await Promise.all(insertPromises)).map(v => v[0])
          // seq-settlement-6.2.5, step 29
          for (let i in settlementParticipantCurrencyStateChangeIdList) {
            let updatedColumns = {currentStateChangeId: settlementParticipantCurrencyStateChangeIdList[i]}
            if (settlementParticipantCurrencyStateChange[i].settlementTransferId) {
              updatedColumns.settlementTransferId = settlementParticipantCurrencyStateChange[i].settlementTransferId
            }
            updatePromises.push(
              knex('settlementParticipantCurrency')
                .where('settlementParticipantCurrencyId', settlementParticipantCurrencyStateChange[i].settlementParticipantCurrencyId)
                .update(updatedColumns)
                .transacting(trx)
            )
          }
          await Promise.all(updatePromises)

          await settlementTransfersPrepare(settlementId, transactionTimestamp, enums, trx)

          let settlementWindowStateChange = []
          let settlementWindows = [] // response object
          let windowAccounts
          for (let aw in affectedWindows) {
            windowAccounts = windowsAccounts[affectedWindows[aw]]
            if (windowAccounts.pendingSettlementCount === 0 &&
              windowAccounts.notSettledCount === 0 &&
              windowAccounts.settledCount > 0) {
              allWindows[affectedWindows[aw]].settlementWindowStateId = enums.settlementWindowStates.SETTLED
              allWindows[affectedWindows[aw]].reason = 'All setlement accounts are settled'
              allWindows[affectedWindows[aw]].createdDate = transactionTimestamp
              settlementWindowStateChange.push(allWindows[affectedWindows[aw]])
            }
            settlementWindows.push(allWindows[affectedWindows[aw]])
          }
          // seq-settlement-6.2.5, step 30
          insertPromises = []
          for (let swsc of settlementWindowStateChange) {
            insertPromises.push(
              knex('settlementWindowStateChange')
                .insert(swsc).returning('settlementWindowStateChangeId')
                .transacting(trx)
            )
          }
          let settlementWindowStateChangeIdList = (await Promise.all(insertPromises)).map(v => v[0])
          // seq-settlement-6.2.5, step 33
          updatePromises = []
          for (let i in settlementWindowStateChangeIdList) {
            updatePromises.push(
              knex('settlementWindow')
                .where('settlementWindowId', settlementWindowStateChange[i].settlementWindowId)
                .update({ currentStateChangeId: settlementWindowStateChangeIdList[i] })
                .transacting(trx)
            )
          }
          await Promise.all(updatePromises)

          if (settlementAccounts.settledCount !== settlementAccountsInit.settledCount &&
            settlementAccounts.pendingSettlementCount === 0 &&
            settlementAccounts.notSettledCount === 0) {
            settlementData.settlementStateId = enums.settlementStates.SETTLED
            settlementData.reason = 'All setlement accounts are settled'
            settlementData.createdDate = transactionTimestamp
            // seq-settlement-6.2.5, step 34
            let settlementStateChangeId = await knex('settlementStateChange')
              .insert(settlementData).returning('settlementStateChangeId')
              .transacting(trx)
            // seq-settlement-6.2.5, step 36
            await knex('settlement')
              .where('settlementId', settlementData.settlementId)
              .update({ currentStateChangeId: settlementStateChangeId })
              .transacting(trx)

            await settlementTransfersCommit(settlementId, transactionTimestamp, enums, trx)
          }
          await trx.commit
          return {
            id: settlementId,
            state: settlementData.settlementStateId,
            createdDate: settlementData.createdDate,
            settlementWindows: settlementWindows,
            participants
          }
        } catch (err) {
          await trx.rollback
          throw err
        }
      })
    } catch (err) {
      throw err
    }
  },

  getById: async function ({ settlementId }, enums = {}) {
    try {
      return await Db.settlement.query(builder => {
        return builder
          .join('settlementStateChange AS ssc', 'ssc.settlementStateChangeId', 'settlement.currentStateChangeId')
          .select('settlement.settlementId',
            'ssc.settlementStateId AS state',
            'settlement.reason',
            'settlement.createdDate')
          .where('settlement.settlementId', settlementId)
          .first()
      })
    } catch (err) {
      throw err
    }
  },

  getByParams: async function ({ state, fromDateTime, toDateTime, currency, settlementWindowId, fromSettlementWindowDateTime, toSettlementWindowDateTime, participantId, accountId }, enums = {}) {
    try {
      let result = await Db.settlement.query(builder => {
        let b = builder
          .innerJoin('settlementStateChange AS ssc', 'ssc.settlementStateChangeId', 'settlement.currentStateChangeId')
          .innerJoin('settlementSettlementWindow AS ssw', 'ssw.settlementId', 'settlement.settlementId')
          .innerJoin('settlementWindow AS sw', 'sw.settlementWindowId', 'ssw.settlementWindowId')
          .innerJoin('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'sw.currentStateChangeId')
          .innerJoin('settlementTransferParticipant AS stp', function () {
            this.on('stp.settlementWindowId', 'settlement.settlementId')
              .andOn('stp.settlementWindowId', 'sw.settlementWindowId')
          })
          .innerJoin('settlementParticipantCurrency AS spc', function () {
            this.on('spc.settlementId', 'stp.settlementId')
              .andOn('spc.participantCurrencyId', 'stp.participantCurrencyId')
          })
          .innerJoin('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'spc.currentStateChangeId')
          .innerJoin('participantCurrency AS pc', 'pc.participantCurrencyId', 'spc.participantCurrencyId')
          .distinct('settlement.settlementId', 'ssc.settlementStateId', 'ssw.settlementWindowId',
            'swsc.settlementWindowStateId', 'swsc.reason AS settlementWindowReason', 'sw.createdDate',
            'swsc.createdDate AS changedDate', 'pc.participantId', 'spc.participantCurrencyId',
            'spcsc.reason AS accountReason', 'spcsc.settlementStateId AS accountState',
            'spc.netAmount AS accountAmount', 'pc.currencyId AS accountCurrency')
          .select()
        if (state) { b.where('ssc.settlementStateId', state) }
        if (fromDateTime) { b.where('settlement.createdDate', '>=', fromDateTime) }
        if (toDateTime) { b.where('settlement.createdDate', '<=', toDateTime) }
        if (currency) { b.where('pc.currencyId', currency) }
        if (settlementWindowId) { b.where('ssw.settlementWindowId', settlementWindowId) }
        if (fromSettlementWindowDateTime) { b.where('sw.createdDate', '>=', fromSettlementWindowDateTime) }
        if (toSettlementWindowDateTime) { b.where('sw.createdDate', '<=', toSettlementWindowDateTime) }
        if (participantId) { b.where('pc.participantId', participantId) }
        if (accountId) { b.where('spc.participantCurrencyId', accountId) }
        return b
      })
      return result
    } catch (err) {
      throw err
    }
  },

  knexTriggerEvent: async function ({ idList, reason }, enums = {}) {
    try {
      const knex = await Db.getKnex()
      // Open transaction
      return await knex.transaction(async (trx) => {
        try {
          // insert new settlement
          const transactionTimestamp = new Date()
          const settlementId = await knex('settlement').insert({ reason, createdDate: transactionTimestamp }).transacting(trx)
          const settlementSettlementWindowList = idList.map(settlementWindowId => {
            return {
              settlementId,
              settlementWindowId,
              createdDate: transactionTimestamp
            }
          })
          await knex.batchInsert('settlementSettlementWindow', settlementSettlementWindowList).transacting(trx)
          /* let settlementTransferParticipantIdList = */
          await knex
            .from(knex.raw('settlementTransferParticipant (settlementId, settlementWindowId, participantCurrencyId, transferParticipantRoleTypeId, ledgerEntryTypeId, createdDate, amount)'))
            .insert(function () {
              this.from('settlementSettlementWindow AS ssw')
                .join('transferFulfilment AS tf', 'tf.settlementWindowId', 'ssw.settlementWindowId')
                .join('transferStateChange AS tsc', function () {
                  this.on('tsc.transferId', 'tf.transferId')
                    .on('tsc.transferStateId', knex.raw('?', [enums.transferStates.COMMITTED]))
                })
                .join('transferParticipant AS tp', function () {
                  this.on('tp.transferId', 'tf.transferId')
                })
                .where('ssw.settlementId', settlementId)
                .groupBy('ssw.settlementWindowId', 'tp.participantCurrencyId', 'tp.transferParticipantRoleTypeId', 'tp.ledgerEntryTypeId')
                .select(knex.raw('? AS ??', [settlementId, 'settlementId']),
                  'ssw.settlementWindowId',
                  'tp.participantCurrencyId',
                  'tp.transferParticipantRoleTypeId',
                  'tp.ledgerEntryTypeId',
                  knex.raw('? AS ??', [transactionTimestamp, 'createdDate']))
                .sum('tp.amount')
            })
            .transacting(trx)
          await knex
            .from(knex.raw('settlementParticipantCurrency (settlementId, participantCurrencyId, netAmount)'))
            .insert(function () {
              this.from('settlementTransferParticipant AS stp')
                .whereRaw('stp.settlementId = ?', [settlementId])
                .groupBy('stp.settlementId', 'stp.participantCurrencyId')
                .select('stp.settlementId', 'stp.participantCurrencyId')
                .sum('stp.amount')
            }, 'settlementParticipantCurrencyId')
            .transacting(trx)
          const settlementParticipantCurrencyList = await knex('settlementParticipantCurrency').select('settlementParticipantCurrencyId').where('settlementId', settlementId).transacting(trx)
          let settlementParticipantCurrencyIdList = []
          const settlementParticipantCurrencyStateChangeList = settlementParticipantCurrencyList.map(value => {
            settlementParticipantCurrencyIdList.push(value.settlementParticipantCurrencyId)
            return {
              settlementParticipantCurrencyId: value.settlementParticipantCurrencyId,
              settlementStateId: enums.settlementStates.PENDING_SETTLEMENT,
              reason,
              createdDate: transactionTimestamp
            }
          })
          await knex.batchInsert('settlementParticipantCurrencyStateChange', settlementParticipantCurrencyStateChangeList).transacting(trx)
          const settlementParticipantCurrencyStateChangeIdList = await knex('settlementParticipantCurrencyStateChange')
            .select('settlementParticipantCurrencyStateChangeId')
            .whereIn('settlementParticipantCurrencyId', settlementParticipantCurrencyIdList)
            .transacting(trx)
          let updatePromises = []
          for (let index in settlementParticipantCurrencyIdList) {
            updatePromises.push(knex('settlementParticipantCurrency')
              .transacting(trx)
              .where('settlementParticipantCurrencyId', settlementParticipantCurrencyIdList[index])
              .update({
                currentStateChangeId: settlementParticipantCurrencyStateChangeIdList[index].settlementParticipantCurrencyStateChangeId
              }))
          }
          await Promise.all(updatePromises)
          const settlementWindowStateChangeList = idList.map(value => {
            return {
              settlementWindowId: value,
              settlementWindowStateId: enums.settlementStates.PENDING_SETTLEMENT,
              reason,
              createdDate: transactionTimestamp
            }
          })
          await knex.batchInsert('settlementWindowStateChange', settlementWindowStateChangeList).transacting(trx)
          const settlementWindowStateChangeIdList = await knex('settlementWindowStateChange')
            .transacting(trx)
            .select('settlementWindowStateChangeId')
            .whereIn('settlementWindowId', idList)
            .andWhere('settlementWindowStateId', enums.settlementStates.PENDING_SETTLEMENT)
          updatePromises = []
          for (let index in idList) {
            updatePromises.push(await knex('settlementWindow').transacting(trx)
              .where('settlementWindowId', idList[index])
              .update({
                currentStateChangeId: settlementWindowStateChangeIdList[index].settlementWindowStateChangeId
              }))
          }
          await Promise.all(updatePromises)
          const settlementStateChangeId = await knex('settlementStateChange').transacting(trx)
            .insert({
              settlementId,
              settlementStateId: enums.settlementStates.PENDING_SETTLEMENT
            })
          await knex('settlement').transacting(trx)
            .where('settlementId', settlementId)
            .update({ currentStateChangeId: settlementStateChangeId })
          await trx.commit
          return settlementId
        } catch (err) {
          await trx.rollback
          throw err
        }
      })
    } catch (err) {
      throw err
    }
  },

  settlementParticipantCurrency: {
    getByListOfIds: async function (listOfIds, enums = {}) {
      try {
        let result = await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .leftJoin('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .leftJoin('participant as p', 'p.participantCurrencyId', 'pc.participantCurrencyId')
            .select(
              'settlementParticipantCurrency.netAmount as amount',
              'pc.currencyId as currency',
              'p.participanId as participant'
            )
            .whereIn('settlementWindow.settlementWindowId', listOfIds)
        })
        return result
      } catch (err) {
        throw err
      }
    },

    getAccountsInSettlementByIds: async function ({ settlementId, participantId }, enums = {}) {
      try {
        let result = await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .select('settlementParticipantCurrencyId')
            .where({ settlementId })
            .andWhere('pc.participantId', participantId)
        })
        return result
      } catch (err) {
        throw err
      }
    },

    getParticipantCurrencyBySettlementId: async function ({ settlementId }, enums = {}) {
      try {
        let result = await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .leftJoin('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'settlementParticipantCurrency.currentStateChangeId')
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .select(
              'pc.participantId AS id',
              'settlementParticipantCurrency.participantCurrencyId AS participantCurrencyId',
              'spcsc.settlementStateId AS state',
              'spcsc.reason AS reason',
              'settlementParticipantCurrency.netAmount AS netAmount',
              'pc.currencyId AS currency',
              'settlementParticipantCurrency.settlementParticipantCurrencyId AS key'
            )
            .where({ settlementId })
        })
        return result
      } catch (err) {
        throw err
      }
    },

    getAccountById: async function ({ settlementParticipantCurrencyList }, enums = {}) {
      try {
        let settlementParticipantCurrencyIdList = settlementParticipantCurrencyList.map(a => {
          return a.settlementParticipantCurrencyId
        })
        let result = await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .join('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'settlementParticipantCurrency.currentStateChangeId')
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .select(
              'pc.participantId AS participantId',
              'settlementParticipantCurrency.participantCurrencyId',
              'spcsc.settlementStateId AS state',
              'spcsc.reason AS reason',
              'settlementParticipantCurrency.netAmount as netAmount',
              'pc.currencyId AS currency'
            )
            .whereIn('settlementParticipantCurrency.settlementParticipantCurrencyId', settlementParticipantCurrencyIdList)
        })
        return result
      } catch (err) {
        throw err
      }
    },

    getAccountsByListOfIds: async function (settlementParticipantCurrencyIdList, enums = {}) {
      try {
        let result = await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .join('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'settlementParticipantCurrency.currentStateChangeId')
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .select(
              'pc.participantId AS participantId',
              'settlementParticipantCurrency.participantCurrencyId',
              'spcsc.settlementStateId AS state',
              'spcsc.reason AS reason',
              'settlementParticipantCurrency.netAmount as netAmount',
              'pc.currencyId AS currency'
            )
            .whereIn('settlementParticipantCurrencyId', settlementParticipantCurrencyIdList)
        })
        return result
      } catch (err) {
        throw err
      }
    }
  },
  settlementSettlementWindow: {
    getWindowsBySettlementIdAndAccountId: async function ({ settlementId, accountId }, enums = {}) {
      try {
        let result = await Db.settlementSettlementWindow.query(builder => {
          return builder
            .join('settlementWindow', 'settlementWindow.settlementWindowId', 'settlementSettlementWindow.settlementWindowId')
            .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
            .join('settlementTransferParticipant AS stp', function () {
              this.on('stp.settlementWindowId', 'settlementWindow.settlementWindowId')
                .on('stp.participantCurrencyId', accountId)
            })
            .distinct(
              'settlementWindow.settlementWindowId',
              'swsc.settlementWindowStateId as state',
              'swsc.reason as reason',
              'settlementWindow.createdDate as createdDate',
              'swsc.createdDate as changedDate'
            )
            .select()
            .where('settlementSettlementWindow.settlementId', settlementId)
        })
        return result
      } catch (err) {
        throw err
      }
    },
    getWindowsBySettlementIdAndParticipantId: async function ({ settlementId, participantId }, enums = {}) {
      try {
        let result = await Db.settlementSettlementWindow.query(builder => {
          return builder
            .join('settlementWindow', 'settlementWindow.settlementWindowId', 'settlementSettlementWindow.settlementWindowId')
            .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
            .join('settlementTransferParticipant AS stp', async function () {
              this.on('stp.settlementWindowId', 'settlementWindow.settlementWindowId')
                .onIn('stp.participantCurrencyId', await Db.participantCurrency.find({ participantId }))
            })
            .distinct(
              'settlementWindow.settlementWindowId',
              'swsc.settlementWindowStateId as state',
              'swsc.reason as reason',
              'settlementWindow.createdDate as createdDate',
              'swsc.createdDate as changedDate'
            )
            .select()
            .where('settlementSettlementWindow.settlementId', settlementId)
        })
        return result
      } catch (err) {
        throw err
      }
    }
  }
}

module.exports = Facade
