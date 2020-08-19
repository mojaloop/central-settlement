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
 - Claudio Viola <claudio.viola@modusbox.com>
 --------------
 ******/
'use strict'
const Db = require('../../lib/db')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const Utility = require('@mojaloop/central-services-shared').Util
const location = { module: 'TransferFulfilHandler', method: '', path: '' }
// const Config = require('../../lib/config')

async function insertLedgerEntry (ledgerEntry, transferId, trx = null) {
  try {
    const knex = await Db.getKnex()
    const trxFunction = async (trx, doCommit = true) => {
      try {
        const recordsToInsert = await knex.select(knex.raw('? AS transferId', transferId), 'PC.participantCurrencyId')
          .select(knex.raw('IFNULL (??, ??) as ??', ['T1.transferparticipantroletypeId', 'T2.transferparticipantroletypeId', 'transferParticipantRoleTypeId']))
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
          .transacting(trx)

        await knex('transferParticipant')
          .insert(recordsToInsert)
          .transacting(trx)

        await Promise.all(recordsToInsert.map(async record => {
          const queryResult = await knex('participantPosition')
            .where('participantCurrencyId', '=', record.participantCurrencyId)
            .increment('value', record.amount)
            .transacting(trx)
          if (queryResult === 0) {
            throw ErrorHandler.Factory.createInternalServerFSPIOPError(`Unable to update participantPosition record for participantCurrencyId: ${record.participantCurrencyId}`)
          }
        }))

        const transferStateChangeId = await knex('transferStateChange')
          .select('transferStateChangeId')
          .where('transferId', transferId)
          .andWhere('transferStateId', 'COMMITTED')
          .transacting(trx)
        if (transferStateChangeId.length === 0 || !transferStateChangeId[0].transferStateChangeId || transferStateChangeId.length > 1) {
          throw ErrorHandler.Factory.createInternalServerFSPIOPError(`Unable to find transfer with COMMITTED state for transferId : ${transferId}`)
        }

        const participantPositionRecords = await knex('participantPosition')
          .select('participantPositionId', 'value', 'reservedValue')
          .where('participantCurrencyId', recordsToInsert[0].participantCurrencyId)
          .orWhere('participantCurrencyId', recordsToInsert[1].participantCurrencyId)
          .transacting(trx)

        if (participantPositionRecords.length !== 2) {
          throw ErrorHandler.Factory.createInternalServerFSPIOPError(`Unable to find all participantPosition records for ParticipantCurrency: {${recordsToInsert[0].participantCurrencyId},${recordsToInsert[1].participantCurrencyId}}`)
        }
        const participantPositionChangeRecords = participantPositionRecords.map(participantPositionRecord => {
          participantPositionRecord.transferStateChangeId = transferStateChangeId[0].transferStateChangeId
          return participantPositionRecord
        })

        await knex('participantPositionChange')
          .insert(participantPositionChangeRecords)
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

async function insertLedgerEntries (ledgerEntries, transferId, trx = null) {
  Logger.info(`Ledger entries: ${JSON.stringify(ledgerEntries)}`)
  try {
    const knex = await Db.getKnex()
    const trxFunction = async (trx, doCommit = true) => {
      try {
        for (const ledgerEntry of ledgerEntries) {
          Logger.info(`Inserting ledger entry: ${JSON.stringify(ledgerEntry)}`)
          await insertLedgerEntry(ledgerEntry, transferId, trx)
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
}

async function updateTransferSettlement (transferId, status, trx = null) {
  Logger.info(Utility.breadcrumb(location, { method: 'updateTransferSettlement' }))
  try {
    const knex = await Db.getKnex()
    const trxFunction = async (trx, doCommit = true) => {
      try {
        // Insert Transfer State.
        const transferState = [
          {
            transferStateId: 'SETTLED',
            enumeration: 'SETTLED',
            description: 'The transfer has been settled',
            isActive: 1
          }
        ]
        await knex.raw(knex('transferState').insert(transferState).toString().replace('insert', 'INSERT IGNORE'))
          .transacting(trx)

        // Insert TransferParticipant ledger entry type.
        await knex.from(knex.raw('transferParticipant (transferID, participantCurrencyId, transferParticipantRoleTypeId, ledgerEntryTypeId, amount)'))
          .insert(function () {
            this.from('transferParticipant AS TP')
              .select('TP.transferId', 'TP.participantCurrencyId', 'TP.transferParticipantRoleTypeId', 'TP.ledgerEntryTypeId', knex.raw('?? * -1', ['TP.amount']))
              .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
              .innerJoin('settlementModel AS M', 'PC.ledgerAccountTypeId', 'M.ledgerAccountTypeId')
              .innerJoin('settlementGranularity AS G', 'M.settlementGranularityId', 'G.settlementGranularityId')
              .where(function () {
                this.where({ 'TP.transferId': transferId })
                this.andWhere(function () {
                  this.andWhere({ 'G.name': 'GROSS' })
                })
              })
              .union(function () {
                this.select('TP.transferId', 'PC1.participantCurrencyId', 'TP.transferParticipantRoleTypeId', 'TP.ledgerEntryTypeId', 'TP.amount')
                  .from('transferParticipant AS TP')
                  .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
                  .innerJoin('settlementModel AS M', 'PC.ledgerAccountTypeId', 'M.ledgerAccountTypeId')
                  .innerJoin('settlementGranularity AS G', 'M.settlementGranularityId', 'G.settlementGranularityId')
                  .innerJoin('participantCurrency AS PC1', function () {
                    this.on('PC1.currencyId', 'PC.currencyId')
                      .andOn('PC1.participantId', 'PC.participantId')
                      .andOn('PC1.ledgerAccountTypeId', 'M.settlementAccountTypeId')
                  })
                  .where(function () {
                    this.where({ 'TP.transferId': transferId })
                    this.andWhere(function () {
                      this.andWhere({ 'G.name': 'GROSS' })
                    })
                  })
              })
          })
          .transacting(trx)

        // Insert a new status for the transfer.
        const transferStateChange = [
          {
            transferId: transferId,
            transferStateId: 'SETTLED',
            reason: 'Gross settlement process'
          }
        ]

        await knex('transferStateChange').insert(transferStateChange)
          .transacting(trx)

        // Update the positions
        await knex('participantPosition AS PP')
          .update({ value: knex.raw('?? - ??', ['PP.value', 'TR.amount']) })
          .innerJoin(function () {
            this.from('transferParticipant AS TP')
              .select('PC.participantCurrencyId', 'TP.Amount')
              .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
              .innerJoin('settlementModel AS M', 'M.ledgerAccountTypeId', 'PC.ledgerAccountTypeId')
              .innerJoin('settlementGranularity AS G', 'M.settlementGranularityId', 'G.settlementGranularityId')
              .where(function () {
                this.where({ 'TP.transferId': transferId })
                this.andWhere(function () {
                  this.andWhere({ 'G.name': 'GROSS' })
                })
              })
              .union(function () {
                this.select('PC1.participantCurrencyId', 'TP.amount')
                  .from('transferParticipant AS TP')
                  .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
                  .innerJoin('settlementModel AS M', 'M.ledgerAccountTypeId', 'PC.ledgerAccountTypeId')
                  .innerJoin('settlementGranularity AS G', 'M.settlementGranularityId', 'G.settlementGranularityId')
                  .innerJoin('participantCurrency AS PC1', function () {
                    this.on('PC1.currencyId', 'PC.currencyId')
                      .andOn('PC1.participantId', 'PC.participantId')
                      .andOn('PC1.ledgerAccountTypeId', 'M.settlementAccountTypeId')
                  })
                  .where(function () {
                    this.where({ 'TP.transferId': transferId })
                    this.andWhere(function () {
                      this.andWhere({ 'G.name': 'GROSS' })
                    })
                  })
              })
          }).joinRaw('AS TR ON PP.participantCurrencyId = TR.ParticipantCurrencyId')
          .transacting(trx)

        // Insert new participant position change records
        await knex.from(knex.raw('participantPositionChange (participantPositionId, transferStateChangeId, value, reservedValue)'))
          .insert(function () {
            this.from('participantPosition AS PP')
              .select('PP.participantPositionId', 'TSC.transferStateChangeId', 'PP.value', 'PP.reservedValue')
              .innerJoin(function () {
                this.from('transferParticipant AS TP')
                  .select('PC.participantCurrencyId')
                  .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
                  .innerJoin('settlementModel AS M', 'M.ledgerAccountTypeId', 'PC.ledgerAccountTypeId')
                  .innerJoin('settlementGranularity AS G', 'M.settlementGranularityId', 'G.settlementGranularityId')
                  .where(function () {
                    this.where({ 'TP.transferId': transferId })
                    this.andWhere(function () {
                      this.andWhere({ 'G.name': 'GROSS' })
                    })
                  })
                  .union(function () {
                    this.select('PC1.participantCurrencyId')
                      .from('transferParticipant AS TP')
                      .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
                      .innerJoin('settlementModel AS M', 'M.ledgerAccountTypeId', 'PC.ledgerAccountTypeId')
                      .innerJoin('settlementGranularity AS G', 'M.settlementGranularityId', 'G.settlementGranularityId')
                      .innerJoin('participantCurrency AS PC1', function () {
                        this.on('PC1.currencyId', 'PC.currencyId')
                          .andOn('PC1.participantId', 'PC.participantId')
                          .andOn('PC1.ledgerAccountTypeId', 'M.settlementAccountTypeId')
                      })
                      .where(function () {
                        this.where({ 'TP.transferId': transferId })
                        this.andWhere(function () {
                          this.andWhere({ 'G.name': 'GROSS' })
                        })
                      })
                  })
              })
            this.joinRaw('AS TR ON PP.participantCurrencyId = TR.ParticipantCurrencyId')
              .innerJoin('transferStateChange AS TSC', function () {
                this.on('TSC.transferID', knex.raw('?', [transferId]))
                  .andOn('TSC.transferStateId', '=', knex.raw('?', ['SETTLED']))
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

const Facade = {
  insertLedgerEntry,
  insertLedgerEntries,
  updateTransferSettlement

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
