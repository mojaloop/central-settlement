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

 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 --------------
 ******/

'use strict'

const Db = require('../index')

module.exports = {}

const settlementModel = require('./settlement')

const Facade = {

  putById: async function (settlementParticipantCurrencyStateChange, enums = {}) {
    try {
      const knex = await Db.getKnex()
      // Open transaction
      return await knex.transaction(async (trx) => {
        const settlementParticipantCurrencyStateChangeIdList = await knex.batchInsert('settlementParticipantCurrencyStateChange', settlementParticipantCurrencyStateChange).transacting(trx)
        if (settlementParticipantCurrencyStateChangeIdList) {
          for (let id of settlementParticipantCurrencyStateChangeIdList) {
            let temp = settlementParticipantCurrencyStateChange[id]
            temp.settlementParticipantCurrencyStateChangeId = id
          }
        } else {
          throw new Error('insert failed')
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
          const settlementId = await settlementModel.create({reason, createdDate: transactionTimestamp})
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
          //const settlementParticipantCurrencyIdList = await knex('settlementParticipantCurrency').select('settlementParticipantCurrencyId').where('settlementId', settlementId)
          const settlementParticipantCurrencyIdList = await Db.settlementParticipantCurrency.find({settlementId})

          const settlementParticipantCurrencyStateChangeList = settlementParticipantCurrencyIdList.map(settlementParticipantCurrencyId => {
            return {
              settlementParticipantCurrencyId,
              settlementStateId: enums.settlementStates.PENDING_SETTLEMENT,
              reason,
              createdDate: transactionTimestamp
            }
          })
          const settlementParticipantCurrencyStateChangeIdList = await knex.batchInsert('settlementParticipantCurrencyStateChange', settlementParticipantCurrencyStateChangeList).transacting(trx)
          let updatePromises = []
          for (let index in settlementParticipantCurrencyIdList) {
            updatePromises.push
            (await knex('settlementParticipantCurrency').transacting(trx)
              .whereIn('settlementParticipantCurrencyId', settlementParticipantCurrencyIdList)
              .update({
                currentStateChangeId: settlementParticipantCurrencyStateChangeIdList[index]
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
          const settlementWindowStateChangeIdList = await knex.batchInsert('settlementWindowStateChange', settlementWindowStateChangeList).transacting(trx)
          updatePromises = []
          for (let index in settlementWindowStateChangeIdList) {
            updatePromises.push(await knex('settlementWindow').transacting(trx)
              .where('settlementWindowId', idList[index])
              .update({
                currentStateChangeId: settlementWindowStateChangeIdList[index]
              }))
          }
          await Promise.all(updatePromises)
          const settlementStateChangeId = await knex('settlementStateChange').transacting(trx)
            .insert({
              settlementId,
              settlementStateId: enums.settlementStates.PENDING_SETTLEMENT
            },
            'settlementStateChangeId')
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
