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

 * ModusBox
 - Deon Botha <deon.botha@modusbox.com>
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 - Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/
'use strict'
const Db = require('../../lib/db')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const Utility = require('@mojaloop/central-services-shared').Util
const location = { module: 'TransferFulfilHandler', method: '', path: '' }
// const Config = require('../../lib/config')

const Facade = {
  insertLedgerEntry: async function (ledgerEntry, trx = null) {
    try {
      const knex = await Db.getKnex()
      const trxFunction = async (trx, doCommit = true) => {
        try {
          knex.from(knex.raw('?? (??, ??, ??, ??, ??)', ['transferParticipant', 'transferId', 'participantCurrencyId', 'transferParticipantRoleTypeId', 'ledgerEntryTypeId', 'amount']))
            .insert(function () {
              this.select(knex.raw('?', transferId), 'PC.participantCurrencyId')
                .select(knex.raw('IFNULL (??, ??) as ??', ['T1.transferparticipantroletypeId', 'T2.transferparticipantroletypeId', 'RoleType']))
                .select('E.ledgerEntryTypeId')
                .select(knex.raw('CASE ?? WHEN ? THEN ? WHEN ? THEN ? ELSE ? END AS ??', ['P.name', ledgerEntry.payerFspId, ledgerEntry.amount, ledgerEntry.payeeFspId, ledgerEntry.amount * -1, 0, 'amount']))
                .from('participantCurrency as PC')
                .innerJoin('participant as P', 'P.participantId', 'PC.participantId')
                .innerJoin('ledgerEntryType as E', 'E.LedgerAccountTypeId', 'PC.LedgerAccountTypeId')
                .leftOuterJoin('transferParticipantRoleType as T1', function () { this.on('P.name', '=', knex.raw('?', [ledgerEntry.payerFspId])).andOn('T1.name', knex.raw('?', ['PAYER_DFSP'])) })
                .leftOuterJoin('transferParticipantRoleType as T2', function () { this.on('P.name', '=', knex.raw('?', [ledgerEntry.payeeFspId])).andOn('T2.name', knex.raw('?', ['PAYEE_DFSP'])) })
                .where('E.name', ledgerEntry.ledgerEntryTypeId)
                .whereIn('P.name', [ledgerEntry.payerFspId, ledgerEntry.payeeFspId])
                .where('PC.currencyId', ledgerEntry.currency)
            }).transacting(trx)
          if (doCommit) {
            await trx.commit
          }
        } catch (err) {
          if (doCommit) {
            await trx.rollback
          }
          throw err
        }
      }
      if (trx) {
        return await trxFunction(trx, false)
      } else {
        return await knex.transaction(trxFunction)
      }
    } catch (err) {
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  },
  insertLedgerEntries: async function (ledgerEntries, trx = null) {
    Logger.info(`Ledger entries: ${JSON.stringify(ledgerEntries)}`)
    try {
      const knex = await Db.getKnex()
      const trxFunction = async (trx, doCommit = true) => {
        try {
          for (const ledgerEntry of ledgerEntries) {
            Logger.info(`Inserting ledger entry: ${JSON.stringify(ledgerEntry)}`)
            await knex.from(knex.raw('?? (??, ??, ??, ??, ??)', ['transferParticipant', 'transferId', 'participantCurrencyId', 'transferParticipantRoleTypeId', 'ledgerEntryTypeId', 'amount']))
              .insert(function () {
                this.select(knex.raw('?', transferId), 'PC.participantCurrencyId')
                  .select(knex.raw('IFNULL (??, ??) as ??', ['T1.transferparticipantroletypeId', 'T2.transferparticipantroletypeId', 'RoleType']))
                  .select('E.ledgerEntryTypeId')
                  .select(knex.raw('CASE ?? WHEN ? THEN ? WHEN ? THEN ? ELSE ? END AS ??', ['P.name', ledgerEntry.payerFspId, ledgerEntry.amount, ledgerEntry.payeeFspId, ledgerEntry.amount * -1, 0, 'amount']))
                  .from('participantCurrency as PC')
                  .innerJoin('participant as P', 'P.participantId', 'PC.participantId')
                  .innerJoin('ledgerEntryType as E', 'E.LedgerAccountTypeId', 'PC.LedgerAccountTypeId')
                  .leftOuterJoin('transferParticipantRoleType as T1', function () { this.on('P.name', '=', knex.raw('?', [ledgerEntry.payerFspId])).andOn('T1.name', knex.raw('?', ['PAYER_DFSP'])) })
                  .leftOuterJoin('transferParticipantRoleType as T2', function () { this.on('P.name', '=', knex.raw('?', [ledgerEntry.payeeFspId])).andOn('T2.name', knex.raw('?', ['PAYEE_DFSP'])) })
                  .where('E.name', ledgerEntry.ledgerEntryTypeId)
                  .whereIn('P.name', [ledgerEntry.payerFspId, ledgerEntry.payeeFspId])
                  .where('PC.currencyId', ledgerEntry.currency)
              })
              .transacting(trx)
          }
          if (doCommit) {
            await trx.commit
          }
        } catch (err) {
          if (doCommit) {
            await trx.rollback
          }
          throw err
        }
      }
      if (trx) {
        return await trxFunction(trx, false)
      } else {
        return await knex.transaction(trxFunction)
      }
    } catch (err) {
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  },
  updateTransferSettlement: async function (transferId, status, trx = null) {
    Logger.info(Utility.breadcrumb(location, { method: 'updateTransferSettlement' }))
    try {
      const knex = await Db.getKnex()
      const trxFunction = async (trx, doCommit = true) => {
        try {
          await knex.from(knex.raw('transferParticipantStateChange (transferParticipantId, settlementWindowStateId, reason)'))
            .insert(function () {
              this.from('transferParticipant AS TP')
                .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
                .innerJoin('settlementModel AS S', 'PC.ledgerAccountTypeId', 'S.ledgerAccountTypeId')
                .innerJoin('settlementGranularity AS G', 'S.settlementGranularityId', 'G.settlementGranularityId')
                .leftOuterJoin('settlementWindowState AS SW1', function () { this.on('G.name', '=', knex.raw('?', ['NET'])).andOn('SW1.settlementWindowStateId', '=', knex.raw('?', ['OPEN'])) })
                .leftOuterJoin('settlementWindowState AS SW2', function () { this.on('G.name', '=', knex.raw('?', ['GROSS'])).onIn('SW2.settlementWindowStateId', ['OPEN', 'PENDING_SETTLEMENT', 'SETTLED']) })
                .leftOuterJoin('settlementWindowState AS SW3', function () { this.on(knex.raw('?', [status]), '=', knex.raw('?', ['error'])).andOn('SW3.settlementWindowStateId', '=', knex.raw('?', ['ABORTED'])) })
                .distinct(knex.raw('TP.transferParticipantId, IFNULL(?? , IFNULL(??, ??)), ?', ['SW3.settlementWindowStateId', 'SW2.settlementWindowStateId', 'SW1.settlementWindowStateId', 'Automatically generated from Transfer fulfil']))
                .where(function () {
                  this.where({ 'TP.transferId': transferId })
                  this.andWhere(function () {
                    this.whereRaw('S.currencyId = ??', ['PC.currencyId'])
                    this.orWhere(function () {
                      this.whereNull('S.currencyId')
                      this.whereNotIn('PC.currencyId', knex('settlementModel AS S1').select('S1.currencyId').whereRaw('S1.ledgerAccountTypeId = ??', ['S.ledgerAccountTypeId']).whereNotNull('S1.currencyId'))
                    })
                  })
                  this.whereNotExists(function () {
                    this.select('*').from('transferParticipantStateChange AS TSC')
                    this.innerJoin('transferParticipant AS TP1', 'TSC.transferParticipantId', 'TP1.transferParticipantId')
                    this.where({ 'TP1.transferId': transferId })
                  })
                })
            })
            .transacting(trx)
          if (doCommit) {
            await trx.commit
          }
        } catch (err) {
          if (doCommit) {
            await trx.rollback
          }
          throw err
        }
      }
      if (trx) {
        return await trxFunction(trx, false)
      } else {
        return await knex.transaction(trxFunction)
      }
    } catch (err) {
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }
  /*,
      getTransactionRequest: async function (transactionId) {
        try {
          const requestedEndpoint = `${Config.SWITCH_ENDPOINT}/transactions/${transactionId}`
          Logger.debug(`transfers endpoint url: ${requestedEndpoint}`)
          return await Utility.Request.sendRequest(requestedEndpoint, { 'fspiop-source': 'HUB' }, 'HUB', 'HUB')
        } catch (err) {
          Logger.error(err)
          throw ErrorHandler.Factory.reformatFSPIOPError(err)
        }
      } */
}

module.exports = Facade
