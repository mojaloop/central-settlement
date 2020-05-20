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
const Enum = require('@mojaloop/central-services-shared').Enum

const Facade = {
  // close is just an example
  updateTransferParticipantStateChange: async function (settlementWindowId, reason) {
    const knex = await Db.getKnex()
    const settlementWindowCurrentState = await Facade.getById({ settlementWindowId })
    if (!settlementWindowCurrentState) {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, `Window ${settlementWindowId} does not exist`)
    } if (settlementWindowCurrentState && settlementWindowCurrentState.state !== Enum.Settlements.SettlementWindowState.PROCESSING) {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, `Window ${settlementWindowId} is not in processing state`)
    } else {
      return knex.transaction(async (trx) => {
        try {
          const transactionTimestamp = new Date()

          // Insert settlementWindowContent
          let builder = knex
            .from(knex.raw('settlementWindowContent (settlementWindowId, ledgerAccountTypeId, currencyId, createdDate)'))
            .insert(function () {
              this.from('transferFulfilment AS tf')
                .join('transferParticipant AS tp', 'tp.transferId', 'tf.transferId')
                .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'tp.participantCurrencyId')
                .where('tf.settlementWindowId', settlementWindowId)
                .distinct('tf.settlementWindowId', 'pc.ledgerAccountTypeId', 'pc.currencyId',
                  knex.raw('? AS ??', [transactionTimestamp, 'createdDate']))
            })
            .transacting(trx)
          await builder

          // Insert settlementContentAggregation
          builder = knex
            .from(knex.raw('settlementContentAggregation (settlementWindowContentId, participantCurrencyId, transferParticipantRoleTypeId, ledgerEntryTypeId, currentStateId, createdDate, amount)'))
            .insert(function () {
              this.from('transferFulfilment AS tf')
                .join('transferParticipant AS tp', 'tp.transferId', 'tf.transferId')
                .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'tp.participantCurrencyId')
                .join('settlementWindowContent AS swc', function () {
                  this.on('swc.settlementWindowId', 'tf.settlementWindowId')
                    .on('swc.ledgerAccountTypeId', 'pc.ledgerAccountTypeId')
                    .on('swc.currencyId', 'pc.currencyId')
                })
                .where('tf.settlementWindowId', settlementWindowId)
                .groupBy('swc.settlementWindowContentId', 'pc.participantCurrencyId', 'tp.transferParticipantRoleTypeId', 'tp.ledgerEntryTypeId')
                .select('swc.settlementWindowContentId', 'pc.participantCurrencyId', 'tp.transferParticipantRoleTypeId', 'tp.ledgerEntryTypeId',
                  knex.raw('? AS ??', [Enum.Settlements.SettlementWindowState.CLOSED, 'settlementWindowStateId']),
                  knex.raw('? AS ??', [transactionTimestamp, 'createdDate']))
                .sum('tp.amount AS amount')
            })
            .transacting(trx)
          await builder

          // Insert settlementWindowContentStateChange
          builder = knex
            .from(knex.raw('settlementWindowContentStateChange (settlementWindowContentId, settlementWindowStateId, reason, createdDate)'))
            .insert(function () {
              this.from('settlementWindowContent AS swc')
                .where('swc.settlementWindowId', settlementWindowId)
                .select('swc.settlementWindowContentId',
                  knex.raw('? AS ??', [Enum.Settlements.SettlementWindowState.CLOSED, 'settlementWindowStateId']),
                  knex.raw('? AS ??', [reason, 'reason']),
                  knex.raw('? AS ??', [transactionTimestamp, 'createdDate']))
            })
            .transacting(trx)
          await builder

          // Update settlementWindowContent pointers to current states, inserted by previous command
          const settlementWindowContentStateChangeList = await knex('settlementWindowContentStateChange AS swcsc')
            .join('settlementWindowContent AS swc', 'swc.settlementWindowContentId', 'swcsc.settlementWindowContentId')
            .select('swc.settlementWindowContentId', 'swcsc.settlementWindowContentStateChangeId')
            .where('swc.settlementWindowId', settlementWindowId)
            .transacting(trx)
          const updatePromises = []
          for (const i in settlementWindowContentStateChangeList) {
            const updatedColumns = { currentStateChangeId: settlementWindowContentStateChangeList[i].settlementWindowContentStateChangeId }
            updatePromises.push(
              knex('settlementWindowContent')
                .where('settlementWindowContentId', settlementWindowContentStateChangeList[i].settlementWindowContentId)
                .update(updatedColumns)
                .transacting(trx)
            )
          }
          await Promise.all(updatePromises)

          const settlementWindowStateChangeId = await knex('settlementWindowStateChange').transacting(trx)
            .insert({
              settlementWindowStateId: Enum.Settlements.SettlementWindowState.CLOSED,
              reason,
              settlementWindowId,
              createdDate: transactionTimestamp
            })
          await knex('settlementWindow').transacting(trx)
            .where({ settlementWindowId })
            .update({ currentStateChangeId: settlementWindowStateChangeId })

          await trx.commit
          return true
        } catch (err) {
          await trx.rollback
          throw ErrorHandler.Factory.reformatFSPIOPError(err)
        }
      })
        .catch((err) => {
          throw ErrorHandler.Factory.reformatFSPIOPError(err)
        })
    }
  }
}

module.exports = Facade
