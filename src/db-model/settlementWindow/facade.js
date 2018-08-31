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

const Facade = {
  getById: async function ({ settlementWindowId }, enums = {}) {
    try {
      let result = await Db.settlementWindow.query(async (builder) => {
        return await builder
          .leftJoin('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
          .select(
            'settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate'
          )
          .first()
          .where('settlementWindow.settlementWindowId', settlementWindowId)
      })
      return result
    } catch (err) {
      throw err
    }
  },

  getByListOfIds: async function (listOfIds, enums = {}) {
    try {
      let result = await Db.settlementWindow.query(async (builder) => {
        return await builder
          .leftJoin('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
          .select(
            'settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate'
          )
          .whereRaw(`settlementWindow.settlementWindowId IN (${listOfIds}) AND swsc.createdDate > settlementWindow.createdDate`)
      })
      return result
    } catch (err) {
      throw err
    }
  },

  getByParams: async function ({ query }, enums = {}) {
    try {
      let { participantId, state, fromDateTime, toDateTime } = query
      state = state ? ` = "${state.toUpperCase()}"` : 'IS NOT NULL'
      fromDateTime = fromDateTime ? fromDateTime : new Date('01-01-1970').toISOString()
      toDateTime = toDateTime ? toDateTime : new Date().toLocaleString()
      let result = await Db.settlementWindow.query(async (builder) => {
        if (!participantId)
          return await builder
            .leftJoin('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
            .select(
              'settlementWindow.settlementWindowId',
              'swsc.settlementWindowStateId as state',
              'swsc.reason as reason',
              'settlementWindow.createdDate as createdDate',
              'swsc.createdDate as changedDate'
            )
            .whereRaw(`swsc.settlementWindowStateId ${state} AND settlementWindow.createdDate >= '${fromDateTime}' AND settlementWindow.createdDate <= '${toDateTime}'`)
            .orderBy('changedDate', 'desc')
        else return await builder
          .leftJoin('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
          .leftJoin('transferFulfilment AS tf', 'tf.settlementWindowId', 'settlementWindow.settlementWindowId')
          .leftJoin('transferParticipant AS tp', 'tp.transferId', 'tf.transferId')
          .leftJoin('participantCurrency AS pc', 'pc.participantCurrencyId', 'tp.participantCurrencyId')
          .select(
            'settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate'
          )
          .whereRaw(`pc.participantId = ${participantId} AND swsc.settlementWindowStateId ${state} AND settlementWindow.createdDate >= '${fromDateTime}' AND settlementWindow.createdDate <= '${toDateTime}'`)
          .orderBy('changedDate', 'desc')
      })
      return result
    } catch (err) {
      throw err
    }
  },

  close: async function ({ settlementWindowId, state, reason }, enums = {}) {
    try {
      const knex = await Db.getKnex()
      let settlementWindowCurrentState = await Facade.getById({ settlementWindowId })
      if (settlementWindowCurrentState && settlementWindowCurrentState.state !== enums.OPEN) {
        let err = new Error('2001')
        throw err
      } else {
        return await knex.transaction(async (trx) => {
          try {
            const transactionTimestamp = new Date()
            let settlmentWindowStateChangeId = await knex('settlementWindowStateChange').transacting(trx)
              .insert({
                settlementWindowStateId: enums[state.toUpperCase()],
                reason,
                settlementWindowId,
                createdDate: transactionTimestamp
              })
            await knex('settlementWindow').transacting(trx)
              .where({ settlementWindowId })
              .update({
                currentStateChangeId: settlmentWindowStateChangeId
              })
            let newSettlementWindowId = await knex('settlementWindow').transacting(trx)
              .insert({
                reason,
                createdDate: transactionTimestamp
              })
            let newSettlementWindowStateChangeId = await knex('settlementWindowStateChange').transacting(trx)
              .insert({
                settlementWindowId: newSettlementWindowId[0],
                settlementWindowStateId: enums.OPEN,
                reason,
                createdDate: transactionTimestamp
              })
            await knex('settlementWindow').transacting(trx)
              .where({
                settlementWindowId: newSettlementWindowId
              })
              .update({
                currentStateChangeId: newSettlementWindowStateChangeId
              })
            await trx.commit
            return newSettlementWindowId[0]
          } catch (err) {
            await trx.rollback
            throw err
          }
        })
          .catch((err) => {
            throw err
          })
      }
    } catch (err) {
      throw err
    }
  },
  getBySettlementId: async function ({ settlementId }, enums = {}) {
    try {
      return await Db.settlementSettlementWindow.query(async (builder) => {
        return await builder
          .join('settlementWindow AS sw', 'sw.settlementWindowId', 'settlementSettlementWindow.settlementWindowId')
          .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'sw.currentStateChangeId')
          .select(
            'sw.settlementWindowId AS settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'sw.createdDate as createdDate',
            'swsc.createdDate as changedDate'
          )
          .where('settlementSettlementWindow.settlementId', settlementId)
      })
    } catch (err) {
      throw err
    }
  },
}

module.exports = Facade
