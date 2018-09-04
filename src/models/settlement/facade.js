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
const cloneDeep = require('../../utils/cloneDeep')

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
            .where({settlementId})
            .transacting(trx)
            .forUpdate()

          let transactionTimestamp = new Date()

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
              case 'PENDING_SETTLEMENT': {
                settlementAccounts.pendingSettlementCount++
                break
              }
              case 'SETTLED': {
                settlementAccounts.settledCount++
                break
              }
              case 'NOT_SETTLED': {
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
              case 'PENDING_SETTLEMENT': {
                windowsAccounts[wid].pendingSettlementCount++
                break
              }
              case 'SETTLED': {
                windowsAccounts[wid].settledCount++
                break
              }
              case 'NOT_SETTLED': {
                windowsAccounts[wid].notSettledCount++
                break
              }
              default: {
                break
              }
            }
          }

          // seq-settlement-6.2.5, step 17
          let windowsAccountsInit = cloneDeep(windowsAccounts)
          let participants = []
          let affectedWindows = []
          let settlementParticipantCurrencyStateChange = []
          let processedAccounts = []
          // seq-settlement-6.2.5, step 18
          for (let participant in payload.participants) {
            let participantPayload = payload.participants[participant]
            participants.push({id: participantPayload.id, accounts: []})
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
              } else if (allAccounts[accountPayload.id].state === 'PENDING_SETTLEMENT' && accountPayload.state === 'SETTLED') {
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
            insertPromises.push(
              knex('settlementParticipantCurrencyStateChange')
                .insert(cpcsc).returning('settlementParticipantCurrencyStateChangeId')
                .transacting(trx)
            )
          }
          let settlementParticipantCurrencyStateChangeIdList = (await Promise.all(insertPromises)).map(v => v[0])
          if (settlementParticipantCurrencyStateChangeIdList) {
            // seq-settlement-6.2.5, step 29
            for (let i in settlementParticipantCurrencyStateChangeIdList) {
              updatePromises.push(
                knex('settlementParticipantCurrency')
                  .where('settlementParticipantCurrencyId', settlementParticipantCurrencyStateChange[i].settlementParticipantCurrencyId)
                  .update({currentStateChangeId: settlementParticipantCurrencyStateChangeIdList[i]})
                  .transacting(trx)
              )
            }
            await Promise.all(updatePromises)
          }

          let settlementWindowStateChange = []
          let settlementWindows = [] // response object
          let windowAccountsInit
          let windowAccounts
          for (let aw in affectedWindows) {
            windowAccountsInit = windowsAccountsInit[affectedWindows[aw]]
            windowAccounts = windowsAccounts[affectedWindows[aw]]
            if (windowAccounts.pendingSettlementCount !== windowAccountsInit.pendingSettlementCount ||
              windowAccounts.settledCount !== windowAccountsInit.settledCount) {
              if (windowAccounts.pendingSettlementCount === 0 &&
                windowAccounts.notSettledCount === 0 &&
                windowAccounts.settledCount > 0) {
                allWindows[affectedWindows[aw]].settlementWindowStateId = 'SETTLED'
                allWindows[affectedWindows[aw]].reason = 'All setlement accounts are settled'
                allWindows[affectedWindows[aw]].createdDate = transactionTimestamp
                settlementWindowStateChange.push(allWindows[affectedWindows[aw]])
              }
              settlementWindows.push(allWindows[affectedWindows[aw]])
            }
          }
          // seq-settlement-6.2.5, step 30
          if (settlementWindowStateChange.length) {
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
            if (settlementWindowStateChangeIdList) {
              updatePromises = []
              for (let i in settlementWindowStateChangeIdList) {
                updatePromises.push(
                  knex('settlementWindow')
                    .where('settlementWindowId', settlementWindowStateChange[i].settlementWindowId)
                    .update({currentStateChangeId: settlementWindowStateChangeIdList[i]})
                    .transacting(trx)
                )
              }
              await Promise.all(updatePromises)
            }
          }

          if (settlementAccounts.settledCount !== settlementAccountsInit.settledCount &&
            settlementAccounts.pendingSettlementCount === 0 &&
            settlementAccounts.notSettledCount === 0) {
            settlementData.settlementStateId = 'SETTLED'
            settlementData.reason = 'All setlement accounts are settled'
            settlementData.createdDate = transactionTimestamp
            // seq-settlement-6.2.5, step 34
            let settlementStateChangeId = await knex('settlementStateChange')
              .insert(settlementData).returning('settlementStateChangeId')
              .transacting(trx)
            // seq-settlement-6.2.5, step 36
            await knex('settlement')
              .where('settlementId', settlementData.settlementId)
              .update({currentStateChangeId: settlementStateChangeId})
              .transacting(trx)
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

  getById: async function ({settlementId}, enums = {}) {
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
      console.log('here')
      throw err
    }
  },

  getByParams: async function ({state, fromDateTime, toDateTime, currency, settlementWindowId, fromSettlementWindowDateTime, toSettlementWindowDateTime, participantId, accountId}, enums = {}) {
    try {
      let result = await Db.settlement.query(builder => {
        let isWhere = true
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
        if (state) { b = isWhere ? b.where('ssc.settlementStateId', state) : b.andWhere('ssc.settlementStateId', state); isWhere = false }
        if (fromDateTime) { b = isWhere ? b.where('settlement.createdDate', '>=', fromDateTime) : b.andWhere('settlement.createdDate', '>=', fromDateTime); isWhere = false }
        if (toDateTime) { b = isWhere ? b.where('settlement.createdDate', '<=', toDateTime) : b.andWhere('settlement.createdDate', '<=', toDateTime); isWhere = false }
        if (currency) { b = isWhere ? b.where('pc.currencyId', currency) : b.andWhere('pc.currencyId', currency); isWhere = false }
        if (settlementWindowId) { b = isWhere ? b.where('ssw.settlementWindowId', settlementWindowId) : b.andWhere('ssw.settlementWindowId', settlementWindowId); isWhere = false }
        if (fromSettlementWindowDateTime) { b = isWhere ? b.where('sw.createdDate', '>=', fromSettlementWindowDateTime) : b.andWhere('sw.createdDate', '>=', fromSettlementWindowDateTime); isWhere = false }
        if (toSettlementWindowDateTime) { b = isWhere ? b.where('sw.createdDate', '<=', toSettlementWindowDateTime) : b.andWhere('sw.createdDate', '<=', toSettlementWindowDateTime); isWhere = false }
        if (participantId) { b = isWhere ? b.where('pc.participantId', participantId) : b.andWhere('pc.participantId', participantId); isWhere = false }
        if (accountId) { b = isWhere ? b.where('spc.participantCurrencyId', accountId) : b.andWhere('spc.participantCurrencyId', accountId); isWhere = false }
        return b
      })
      return result
    } catch (err) {
      throw err
    }
  },

  knexTriggerEvent: async function ({idList, reason}, enums = {}) {
    try {
      const knex = await Db.getKnex()
      // Open transaction
      return await knex.transaction(async (trx) => {
        try {
          // insert new settlement
          const transactionTimestamp = new Date()
          const settlementId = await knex('settlement').insert({reason, createdDate: transactionTimestamp}).transacting(trx)
          const settlementSettlementWindowList = idList.map(settlementWindowId => {
            return {
              settlementId,
              settlementWindowId,
              createdDate: transactionTimestamp
            }
          })
          await knex.batchInsert('settlementSettlementWindow', settlementSettlementWindowList).transacting(trx)
          /* let settlementTransferParticipantIdList = */await knex
            .from(knex.raw('settlementTransferParticipant (settlementId, settlementWindowId, participantCurrencyId, transferParticipantRoleTypeId, ledgerEntryTypeId, createdDate, amount)'))
            .insert(function () {
              this.from('settlementSettlementWindow AS ssw')
                .join('transferFulfilment AS tf', 'tf.settlementWindowId', 'ssw.settlementWindowId')
                .join('transferStateChange AS tsc', function () {
                  this
                    .on('tsc.transferId', 'tf.transferId')
                    .on('tsc.transferStateId', knex.raw('?', [enums.transferStates.COMMITTED]))
                })
                .join('transferParticipant AS tp', function () {
                  this
                    .on('tp.transferId', 'tf.transferId')
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
                .sum(knex.raw(`CASE 
                            WHEN stp.transferParticipantRoleTypeId = ${enums.transferParticipantRoleTypes.PAYER_DFSP} AND stp.ledgerEntryTypeId = ${enums.ledgerEntryTypes.PRINCIPLE_VALUE} THEN amount 
                            WHEN stp.transferParticipantRoleTypeId = ${enums.transferParticipantRoleTypes.PAYEE_DFSP} AND stp.ledgerEntryTypeId = ${enums.ledgerEntryTypes.PRINCIPLE_VALUE} THEN -amount
                            WHEN stp.ledgerEntryTypeId = ${enums.ledgerEntryTypes.INTERCHANGE_FEE} THEN -amount
                            WHEN stp.ledgerEntryTypeId = ${enums.ledgerEntryTypes.HUB_FEE} THEN amount
                          end`))
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
            .update({currentStateChangeId: settlementStateChangeId})
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

    getAccountsInSettlementByIds: async function ({settlementId, participantId}, enums = {}) {
      try {
        let result = await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .select('settlementParticipantCurrencyId')
            .where({settlementId})
            .andWhere('pc.participantId', participantId)
        })
        return result
      } catch (err) {
        throw err
      }
    },

    getParticipantCurrencyBySettlementId: async function ({settlementId}, enums = {}) {
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
            .where({settlementId})
        })
        return result
      } catch (err) {
        throw err
      }
    },

    getAccountById: async function ({settlementParticipantCurrencyId}, enums = {}) {
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
            .where({settlementParticipantCurrencyId})
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
    getWindowsBySettlementIdAndAccountId: async function ({settlementId, accountId}, enums = {}) {
      try {
        let result = await Db.settlementSettlementWindow.query(builder => {
          return builder
            .join('settlementWindow AS sw', 'sw.settlementWindowId', 'settlementSettlementWindow.settlementWindowId')
            .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
            .join('settlementTransferParticipant AS stp', function () {
              this
                .on('stp.settlementWindowId', 'sw.settlementWindowId')
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
            .where({settlementId})
        })
        return result
      } catch (err) {
        throw err
      }
    },
    getWindowsBySettlementIdAndParticipantId: async function ({settlementId, participantId}, enums = {}) {
      try {
        let result = await Db.settlementSettlementWindow.query(builder => {
          return builder
            .join('settlementWindow AS sw', 'sw.settlementWindowId', 'settlementSettlementWindow.settlementWindowId')
            .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
            .join('settlementTransferParticipant AS stp', async function () {
              this
                .on('stp.settlementWindowId', 'sw.settlementWindowId')
                .onIn('stp.participantCurrencyId', await Db.participantCurrency.find({participantId}))
            })
            .distinct(
              'settlementWindow.settlementWindowId',
              'swsc.settlementWindowStateId as state',
              'swsc.reason as reason',
              'settlementWindow.createdDate as createdDate',
              'swsc.createdDate as changedDate'
            )
            .select()
            .where({settlementId})
        })
        return result
      } catch (err) {
        throw err
      }
    }
  }
}

module.exports = Facade
