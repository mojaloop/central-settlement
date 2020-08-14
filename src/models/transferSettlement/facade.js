/*****
sure
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

        const promises = []
        promises.push(knex('transferParticipant').insert(recordsToInsert).transacting(trx))
        recordsToInsert.forEach(record => {
          const query = knex('participantPosition')
           .where('participantCurrencyId', '=', record.participantCurrencyId)
           .increment('value', record.amount)
           .transacting(trx)
          promises.push(query)
        })

      await Promise.all(promises)
      const transferStateChangeId = await knex('transferStateChange')
        .select('transferStateChangeId')
        .where('transferId', transferId)
        .andWhere('transferStateId', 'COMMITTED')
        .transacting(trx)

      const participantPositionRecords = await  knex('participantPosition')
       .select('participantPositionId', 'value', 'reservedValue')
       .where('participantCurrencyId', recordsToInsert[0].participantCurrencyId)
       .orWhere('participantCurrencyId',  recordsToInsert[1].participantCurrencyId)
       .transacting(trx)

      const participantPositionChangeRecords = participantPositionRecords.map(participantPositionRecord => {
         participantPositionRecord.transferStateChangeId = transferStateChangeId[0].transferStateChangeId
         return participantPositionRecord;
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
            this.from('transfe, rParticipant AS TP')
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
                  .innerJoin('settlementModel AS M', 'PC.ledgerAccountTypeId', 'PC.ledgerAccountTypeId')
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
              .innerJoin('settlementModel AS M', 'PC.ledgerAccountTypeId', 'M.ledgerAccountTypeId')
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
                  .innerJoin('settlementModel AS M', 'PC.ledgerAccountTypeId', 'M.ledgerAccountTypeId')
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
                      .innerJoin('settlementModel AS M', 'PC.ledgerAccountTypeId', 'PC.ledgerAccountTypeId')
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
