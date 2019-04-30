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

const Boom = require('boom')
const Db = require('../../lib/db')
const Uuid = require('uuid4')
const Crypto = require('crypto')
const Config = require('../../lib/config')
const ParticipantFacade = require('@mojaloop/central-ledger/src/models/participant/facade')
const cloneDeep = require('../../utils/cloneDeep')
const Enums = require('../lib/enums')
const Utility = require('../../handlers/lib/utility')

const getNotificationMessage = function (action, destination, payload) {
  return {
    id: Uuid(),
    from: Config.HUB_NAME,
    to: destination,
    type: 'application/json',
    content: {
      headers: {
        'Content-Type': 'application/json',
        'Date': new Date().toISOString(),
        'FSPIOP-Source': Enums.headers.FSPIOP.SWITCH,
        'FSPIOP-Destination': destination
      },
      payload
    },
    metadata: {
      event: {
        action: action
      }
    }
  }
}

/**
 * @param enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT
 * @param enums.ledgerEntryTypes
 * @param enums.participantLimitTypes
 * @param enums.settlementStates.PS_TRANSFERS_RECORDED
 * @param enums.settlementStates.PS_TRANSFERS_RESERVED
 * @param enums.settlementStates.PS_TRANSFERS_COMMITTED
 * @param enums.transferParticipantRoleTypes
 * @param enums.transferParticipantRoleTypes.DFSP_POSITION
 * @param enums.transferParticipantRoleTypes.HUB
 * @param enums.transferStates
 */
const settlementTransfersPrepare = async function (settlementId, transactionTimestamp, enums, trx = null) {
  try {
    const knex = await Db.getKnex()
    let t // see (t of settlementTransferList) below

    // Retrieve list of PS_TRANSFERS_RECORDED, but not RECEIVED_PREPARE
    let settlementTransferList = await knex('settlementParticipantCurrency AS spc')
      .join('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyId', 'spc.settlementParticipantCurrencyId')
      .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'spc.participantCurrencyId')
      .leftJoin('transferDuplicateCheck AS tdc', 'tdc.transferId', 'spc.settlementTransferId')
      .select('spc.*', 'pc.currencyId')
      .where('spc.settlementId', settlementId)
      .where('spcsc.settlementStateId', enums.settlementStates.PS_TRANSFERS_RECORDED)
      .whereNotNull('spc.settlementTransferId')
      .whereNull('tdc.transferId')
      .transacting(trx)

    const trxFunction = async (trx, doCommit = true) => {
      try {
        const hashSha256 = Crypto.createHash('sha256')
        let hash = hashSha256.update(String(t.settlementTransferId))
        hash = hashSha256.digest(hash).toString('base64').slice(0, -1) // removing the trailing '=' as per the specification
        // Insert transferDuplicateCheck
        await knex('transferDuplicateCheck')
          .insert({
            transferId: t.settlementTransferId,
            hash,
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
            expirationDate: new Date(+new Date() + 1000 * Number(Config.TRANSFER_VALIDITY_SECONDS)).toISOString().replace(/[TZ]/g, ' ').trim(),
            createdDate: transactionTimestamp
          })
          .transacting(trx)

        // Retrieve Hub mlns account
        let { mlnsAccountId } = await knex('participantCurrency AS pc1')
          .join('participantCurrency AS pc2', function () {
            this.on('pc2.participantId', Config.HUB_ID)
              .andOn('pc2.currencyId', 'pc1.currencyId')
              .andOn('pc2.ledgerAccountTypeId', enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT)
              .andOn('pc2.isActive', 1)
          })
          .select('pc2.participantCurrencyId AS mlnsAccountId')
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
            participantCurrencyId: mlnsAccountId,
            transferParticipantRoleTypeId: enums.transferParticipantRoleTypes.HUB,
            ledgerEntryTypeId: ledgerEntryTypeId,
            amount: t.netAmount,
            createdDate: transactionTimestamp
          })
          .transacting(trx)
        await knex('transferParticipant')
          .insert({
            transferId: t.settlementTransferId,
            participantCurrencyId: t.participantCurrencyId,
            transferParticipantRoleTypeId: enums.transferParticipantRoleTypes.DFSP_POSITION,
            ledgerEntryTypeId: ledgerEntryTypeId,
            amount: -t.netAmount,
            createdDate: transactionTimestamp
          })
          .transacting(trx)

        // Insert transferStateChange
        await knex('transferStateChange')
          .insert({
            transferId: t.settlementTransferId,
            transferStateId: enums.transferStates.RECEIVED_PREPARE,
            reason: 'Settlement transfer prepare',
            createdDate: transactionTimestamp
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

    for (t of settlementTransferList) {
      if (trx) {
        await trxFunction(trx, false)
      } else {
        await knex.transaction(trxFunction)
      }
    }
    return 0
  } catch (err) {
    throw err
  }
}

/**
 * @param enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT
 * @param enums.ledgerEntryTypes
 * @param enums.participantLimitTypes
 * @param enums.settlementStates.PS_TRANSFERS_RECORDED
 * @param enums.settlementStates.PS_TRANSFERS_RESERVED
 * @param enums.settlementStates.PS_TRANSFERS_COMMITTED
 * @param enums.transferParticipantRoleTypes
 * @param enums.transferParticipantRoleTypes.DFSP_POSITION
 * @param enums.transferParticipantRoleTypes.HUB
 * @param enums.transferStates
 */
const settlementTransfersReserve = async function (settlementId, transactionTimestamp, enums, trx = null) {
  try {
    const knex = await Db.getKnex()
    let isLimitExceeded, transferStateChangeId

    // Retrieve list of PS_TRANSFERS_RESERVED, but not RESERVED
    let settlementTransferList = await knex('settlementParticipantCurrency AS spc')
      .join('settlementParticipantCurrencyStateChange AS spcsc', function () {
        this.on('spcsc.settlementParticipantCurrencyId', 'spc.settlementParticipantCurrencyId')
          .andOn('spcsc.settlementStateId', knex.raw('?', [enums.settlementStates.PS_TRANSFERS_RESERVED]))
      })
      .join('transferStateChange AS tsc1', function () {
        this.on('tsc1.transferId', 'spc.settlementTransferId')
          .andOn('tsc1.transferStateId', knex.raw('?', [enums.transferStates.RECEIVED_PREPARE]))
      })
      .leftJoin('transferStateChange AS tsc2', function () {
        this.on('tsc2.transferId', 'spc.settlementTransferId')
          .andOn('tsc2.transferStateId', knex.raw('?', [enums.transferStates.RESERVED]))
      })
      .join('transferParticipant AS tp1', function () {
        this.on('tp1.transferId', 'spc.settlementTransferId')
          .andOn('tp1.transferParticipantRoleTypeId', knex.raw('?', [enums.transferParticipantRoleTypes.DFSP_POSITION]))
      })
      .join('participantCurrency AS pc1', 'pc1.participantCurrencyId', 'tp1.participantCurrencyId')
      .join('participant AS p1', 'p1.participantId', 'pc1.participantId')
      .join('transferParticipant AS tp2', function () {
        this.on('tp2.transferId', 'spc.settlementTransferId')
          .andOn('tp2.transferParticipantRoleTypeId', knex.raw('?', [enums.transferParticipantRoleTypes.HUB]))
      })
      .select('tp1.transferId', 'tp1.ledgerEntryTypeId', 'tp1.participantCurrencyId AS dfspAccountId', 'tp1.amount AS dfspAmount',
        'tp2.participantCurrencyId AS hubAccountId', 'tp2.amount AS hubAmount',
        'p1.name AS dfspName', 'pc1.currencyId')
      .where('spc.settlementId', settlementId)
      .whereNull('tsc2.transferId')
      .transacting(trx)

    const trxFunction = async (trx, doCommit = true) => {
      try {
        for (let { transferId, ledgerEntryTypeId, dfspAccountId, dfspAmount, hubAccountId, hubAmount,
          dfspName, currencyId } of settlementTransferList) {
          // Persist transfer state change
          transferStateChangeId = await knex('transferStateChange')
            .insert({
              transferId,
              transferStateId: enums.transferStates.RESERVED,
              reason: 'Settlement transfer reserve',
              createdDate: transactionTimestamp
            })
            .transacting(trx)

          if (ledgerEntryTypeId === enums.ledgerEntryTypes.SETTLEMENT_NET_RECIPIENT) {
            // Select dfspPosition FOR UPDATE
            let { dfspPositionId, dfspPositionValue, dfspReservedValue } = await knex('participantPosition')
              .select('participantPositionId AS dfspPositionId', 'value AS dfspPositionValue', 'reservedValue AS dfspReservedValue')
              .where('participantCurrencyId', dfspAccountId)
              .first()
              .transacting(trx)
              .forUpdate()

            // Select dfsp NET_DEBIT_CAP limit
            let { netDebitCap } = await knex('participantLimit')
              .select('value AS netDebitCap')
              .where('participantCurrencyId', dfspAccountId)
              .andWhere('participantLimitTypeId', enums.participantLimitTypes.NET_DEBIT_CAP)
              .first()
              .transacting(trx)
              .forUpdate()
            isLimitExceeded = netDebitCap - dfspPositionValue - dfspReservedValue - dfspAmount < 0

            if (isLimitExceeded) {
              /* let { startAfterParticipantPositionChangeId } = */ await knex('participantPositionChange')
                .select('participantPositionChangeId AS startAfterParticipantPositionChangeId')
                .where('participantPositionId', dfspPositionId)
                .orderBy('participantPositionChangeId', 'desc')
                .first()
                .transacting(trx)

              // TODO: notify dfsp for NDC change
              // TODO: insert new limit with correct value for startAfterParticipantPositionChangeId
              await ParticipantFacade.adjustLimits(dfspAccountId, {
                type: 'NET_DEBIT_CAP',
                value: netDebitCap + dfspAmount
              }, trx)
            }

            // Persist dfsp latestPosition
            await knex('participantPosition')
              .update('value', dfspPositionValue + dfspAmount)
              .where('participantPositionId', dfspPositionId)
              .transacting(trx)

            // Persist dfsp position change
            await knex('participantPositionChange')
              .insert({
                participantPositionId: dfspPositionId,
                transferStateChangeId: transferStateChangeId,
                value: dfspPositionValue + dfspAmount,
                reservedValue: dfspReservedValue,
                createdDate: transactionTimestamp
              })
              .transacting(trx)

            // Send notification for position change
            const action = 'settlement-transfer-position-change'
            const destination = dfspName
            const payload = {
              currency: currencyId,
              value: dfspPositionValue + dfspAmount,
              changedDate: new Date().toISOString()
            }
            const message = Facade.getNotificationMessage(action, destination, payload)
            await Utility.produceGeneralMessage(Utility.ENUMS.NOTIFICATION, Utility.ENUMS.EVENT, message, Utility.ENUMS.STATE.SUCCESS)

            // Select hubPosition FOR UPDATE
            let { hubPositionId, hubPositionValue } = await knex('participantPosition')
              .select('participantPositionId AS hubPositionId', 'value AS hubPositionValue')
              .where('participantCurrencyId', hubAccountId)
              .first()
              .transacting(trx)
              .forUpdate()

            // Persist hub latestPosition
            await knex('participantPosition')
              .update('value', hubPositionValue + hubAmount)
              .where('participantPositionId', hubPositionId)
              .transacting(trx)

            // Persist hub position change
            await knex('participantPositionChange')
              .insert({
                participantPositionId: hubPositionId,
                transferStateChangeId: transferStateChangeId,
                value: hubPositionValue + hubAmount,
                reservedValue: 0,
                createdDate: transactionTimestamp
              })
              .transacting(trx)
          }

          if (doCommit) {
            await trx.commit
          }
        }
      } catch (err) {
        if (doCommit) {
          await trx.rollback
        }
        throw err
      }
    }

    if (trx) {
      await trxFunction(trx, false)
    } else {
      await knex.transaction(trxFunction)
    }
    return 0
  } catch (err) {
    throw err
  }
}

/**
 * @param enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT
 * @param enums.ledgerEntryTypes
 * @param enums.participantLimitTypes
 * @param enums.settlementStates.PS_TRANSFERS_RECORDED
 * @param enums.settlementStates.PS_TRANSFERS_RESERVED
 * @param enums.settlementStates.PS_TRANSFERS_COMMITTED
 * @param enums.transferParticipantRoleTypes
 * @param enums.transferParticipantRoleTypes.DFSP_POSITION
 * @param enums.transferParticipantRoleTypes.HUB
 * @param enums.transferStates
 */
const settlementTransfersAbort = async function (settlementId, transactionTimestamp, enums, trx = null) {
  try {
    const knex = await Db.getKnex()
    let transferStateChangeId

    // Retrieve list of ABORTED, but not ABORTED
    let settlementTransferList = await knex('settlementParticipantCurrency AS spc')
      .join('settlementParticipantCurrencyStateChange AS spcsc', function () {
        this.on('spcsc.settlementParticipantCurrencyId', 'spc.settlementParticipantCurrencyId')
          .andOn('spcsc.settlementStateId', knex.raw('?', [enums.settlementStates.ABORTED]))
      })
      .leftJoin('transferStateChange AS tsc1', 'tsc1.transferId', 'spc.settlementTransferId')
      .leftJoin('transferState AS ts1', function () {
        this.on('ts1.transferStateId', 'tsc1.transferStateId')
          .andOn('ts1.enumeration', knex.raw('?', [enums.transferStateEnums.RESERVED]))
      })
      .leftJoin('transferStateChange AS tsc2', 'tsc2.transferId', 'spc.settlementTransferId')
      .leftJoin('transferState AS ts2', function () {
        this.on('ts2.transferStateId', 'tsc2.transferStateId')
          .andOn('ts2.enumeration', knex.raw('?', [enums.transferStateEnums.ABORTED]))
      })
      .join('transferParticipant AS tp1', function () {
        this.on('tp1.transferId', 'spc.settlementTransferId')
          .andOn('tp1.transferParticipantRoleTypeId', knex.raw('?', [enums.transferParticipantRoleTypes.DFSP_POSITION]))
      })
      .join('participantCurrency AS pc1', 'pc1.participantCurrencyId', 'tp1.participantCurrencyId')
      .join('participant AS p1', 'p1.participantId', 'pc1.participantId')
      .join('transferParticipant AS tp2', function () {
        this.on('tp2.transferId', 'spc.settlementTransferId')
          .andOn('tp2.transferParticipantRoleTypeId', knex.raw('?', [enums.transferParticipantRoleTypes.HUB]))
      })
      .select('tp1.transferId', 'tp1.ledgerEntryTypeId', 'tp1.participantCurrencyId AS dfspAccountId', 'tp1.amount AS dfspAmount',
        'tp2.participantCurrencyId AS hubAccountId', 'tp2.amount AS hubAmount', 'tsc1.transferId AS isReserved',
        'p1.name AS dfspName', 'pc1.currencyId')
      .where('spc.settlementId', settlementId)
      .whereNull('tsc2.transferId')
      .transacting(trx)

    const trxFunction = async (trx, doCommit = true) => {
      try {
        for (let { transferId, ledgerEntryTypeId, dfspAccountId, dfspAmount, hubAccountId, hubAmount, isReserved,
          dfspName, currencyId } of settlementTransferList) {
          // Persist transfer state change
          await knex('transferStateChange')
            .insert({
              transferId,
              transferStateId: enums.transferStates.REJECTED,
              reason: 'Settlement transfer reject',
              createdDate: transactionTimestamp
            })
            .transacting(trx)
          transferStateChangeId = await knex('transferStateChange')
            .insert({
              transferId,
              transferStateId: enums.transferStates.ABORTED,
              reason: 'Settlement transfer abort',
              createdDate: transactionTimestamp
            })
            .transacting(trx)

          if (isReserved !== null && ledgerEntryTypeId === enums.ledgerEntryTypes.SETTLEMENT_NET_RECIPIENT) {
            // Select dfspPosition FOR UPDATE
            let { dfspPositionId, dfspPositionValue, dfspReservedValue } = await knex('participantPosition')
              .select('participantPositionId AS dfspPositionId', 'value AS dfspPositionValue', 'reservedValue AS dfspReservedValue')
              .where('participantCurrencyId', dfspAccountId)
              .first()
              .transacting(trx)
              .forUpdate()

            // Persist dfsp latestPosition
            await knex('participantPosition')
              .update('value', dfspPositionValue - dfspAmount)
              .where('participantPositionId', dfspPositionId)
              .transacting(trx)

            // Persist dfsp position change
            await knex('participantPositionChange')
              .insert({
                participantPositionId: dfspPositionId,
                transferStateChangeId: transferStateChangeId,
                value: dfspPositionValue - dfspAmount,
                reservedValue: dfspReservedValue,
                createdDate: transactionTimestamp
              })
              .transacting(trx)

            // Send notification for position change
            const action = 'settlement-transfer-position-change'
            const destination = dfspName
            const payload = {
              currency: currencyId,
              value: dfspPositionValue - dfspAmount,
              changedDate: new Date().toISOString()
            }
            const message = Facade.getNotificationMessage(action, destination, payload)
            await Utility.produceGeneralMessage(Utility.ENUMS.NOTIFICATION, Utility.ENUMS.EVENT, message, Utility.ENUMS.STATE.SUCCESS)

            // Select hubPosition FOR UPDATE
            let { hubPositionId, hubPositionValue } = await knex('participantPosition')
              .select('participantPositionId AS hubPositionId', 'value AS hubPositionValue')
              .where('participantCurrencyId', hubAccountId)
              .first()
              .transacting(trx)
              .forUpdate()

            // Persist hub latestPosition
            await knex('participantPosition')
              .update('value', hubPositionValue - hubAmount)
              .where('participantPositionId', hubPositionId)
              .transacting(trx)

            // Persist hub position change
            await knex('participantPositionChange')
              .insert({
                participantPositionId: hubPositionId,
                transferStateChangeId: transferStateChangeId,
                value: hubPositionValue - hubAmount,
                reservedValue: 0,
                createdDate: transactionTimestamp
              })
              .transacting(trx)
          }

          if (doCommit) {
            await trx.commit
          }
        }
      } catch (err) {
        if (doCommit) {
          await trx.rollback
        }
        throw err
      }
    }

    if (trx) {
      await trxFunction(trx, false)
    } else {
      await knex.transaction(trxFunction)
    }
    return 0
  } catch (err) {
    throw err
  }
}

/**
 * @param enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT
 * @param enums.ledgerEntryTypes
 * @param enums.participantLimitTypes
 * @param enums.settlementStates.PS_TRANSFERS_RECORDED
 * @param enums.settlementStates.PS_TRANSFERS_RESERVED
 * @param enums.settlementStates.PS_TRANSFERS_COMMITTED
 * @param enums.transferParticipantRoleTypes
 * @param enums.transferParticipantRoleTypes.DFSP_POSITION
 * @param enums.transferParticipantRoleTypes.HUB
 * @param enums.transferStates
 */
const settlementTransfersCommit = async function (settlementId, transactionTimestamp, enums, trx = null) {
  try {
    const knex = await Db.getKnex()
    let transferStateChangeId

    // Retrieve list of PS_TRANSFERS_COMMITTED, but not COMMITTED
    let settlementTransferList = await knex('settlementParticipantCurrency AS spc')
      .join('settlementParticipantCurrencyStateChange AS spcsc', function () {
        this.on('spcsc.settlementParticipantCurrencyId', 'spc.settlementParticipantCurrencyId')
          .andOn('spcsc.settlementStateId', knex.raw('?', [enums.settlementStates.PS_TRANSFERS_COMMITTED]))
      })
      .join('transferStateChange AS tsc1', function () {
        this.on('tsc1.transferId', 'spc.settlementTransferId')
          .andOn('tsc1.transferStateId', knex.raw('?', [enums.transferStates.RESERVED]))
      })
      .leftJoin('transferStateChange AS tsc2', function () {
        this.on('tsc2.transferId', 'spc.settlementTransferId')
          .andOn('tsc2.transferStateId', knex.raw('?', [enums.transferStates.COMMITTED]))
      })
      .join('transferParticipant AS tp1', function () {
        this.on('tp1.transferId', 'spc.settlementTransferId')
          .andOn('tp1.transferParticipantRoleTypeId', knex.raw('?', [enums.transferParticipantRoleTypes.DFSP_POSITION]))
      })
      .join('participantCurrency AS pc1', 'pc1.participantCurrencyId', 'tp1.participantCurrencyId')
      .join('participant AS p1', 'p1.participantId', 'pc1.participantId')
      .join('transferParticipant AS tp2', function () {
        this.on('tp2.transferId', 'spc.settlementTransferId')
          .andOn('tp2.transferParticipantRoleTypeId', knex.raw('?', [enums.transferParticipantRoleTypes.HUB]))
      })
      .select('tp1.transferId', 'tp1.ledgerEntryTypeId', 'tp1.participantCurrencyId AS dfspAccountId', 'tp1.amount AS dfspAmount',
        'tp2.participantCurrencyId AS hubAccountId', 'tp2.amount AS hubAmount',
        'p1.name AS dfspName', 'pc1.currencyId')
      .where('spc.settlementId', settlementId)
      .whereNull('tsc2.transferId')
      .transacting(trx)

    const trxFunction = async (trx, doCommit = true) => {
      try {
        for (let { transferId, ledgerEntryTypeId, dfspAccountId, dfspAmount, hubAccountId, hubAmount,
          dfspName, currencyId } of settlementTransferList) {
          // Persist transfer fulfilment and transfer state change
          const transferFulfilmentId = Uuid()
          await knex('transferFulfilmentDuplicateCheck')
            .insert({
              transferFulfilmentId,
              transferId
            })
            .transacting(trx)

          await knex('transferFulfilment')
            .insert({
              transferFulfilmentId,
              transferId,
              ilpFulfilment: 0,
              completedDate: transactionTimestamp,
              isValid: 1,
              settlementWindowId: null,
              createdDate: transactionTimestamp
            })
            .transacting(trx)

          await knex('transferStateChange')
            .insert({
              transferId,
              transferStateId: enums.transferStates.RECEIVED_FULFIL,
              reason: 'Settlement transfer commit initiated',
              createdDate: transactionTimestamp
            })
            .transacting(trx)

          transferStateChangeId = await knex('transferStateChange')
            .insert({
              transferId,
              transferStateId: enums.transferStates.COMMITTED,
              reason: 'Settlement transfer commit',
              createdDate: transactionTimestamp
            })
            .transacting(trx)

          if (ledgerEntryTypeId === enums.ledgerEntryTypes.SETTLEMENT_NET_SENDER) {
            // Select dfspPosition FOR UPDATE
            let { dfspPositionId, dfspPositionValue, dfspReservedValue } = await knex('participantPosition')
              .select('participantPositionId AS dfspPositionId', 'value AS dfspPositionValue', 'reservedValue AS dfspReservedValue')
              .where('participantCurrencyId', dfspAccountId)
              .first()
              .transacting(trx)
              .forUpdate()

            // Persist dfsp latestPosition
            await knex('participantPosition')
              .update('value', dfspPositionValue + dfspAmount)
              .where('participantPositionId', dfspPositionId)
              .transacting(trx)

            // Persist dfsp position change
            await knex('participantPositionChange')
              .insert({
                participantPositionId: dfspPositionId,
                transferStateChangeId: transferStateChangeId,
                value: dfspPositionValue + dfspAmount,
                reservedValue: dfspReservedValue,
                createdDate: transactionTimestamp
              })
              .transacting(trx)

            // Select hubPosition FOR UPDATE
            let { hubPositionId, hubPositionValue } = await knex('participantPosition')
              .select('participantPositionId AS hubPositionId', 'value AS hubPositionValue')
              .where('participantCurrencyId', hubAccountId)
              .first()
              .transacting(trx)
              .forUpdate()

            // Persist hub latestPosition
            await knex('participantPosition')
              .update('value', hubPositionValue + hubAmount)
              .where('participantPositionId', hubPositionId)
              .transacting(trx)

            // Persist hub position change
            await knex('participantPositionChange')
              .insert({
                participantPositionId: hubPositionId,
                transferStateChangeId: transferStateChangeId,
                value: hubPositionValue + hubAmount,
                reservedValue: 0,
                createdDate: transactionTimestamp
              })
              .transacting(trx)

            // Send notification for position change
            const action = 'settlement-transfer-position-change'
            const destination = dfspName
            const payload = {
              currency: currencyId,
              value: dfspPositionValue + dfspAmount,
              changedDate: new Date().toISOString()
            }
            const message = Facade.getNotificationMessage(action, destination, payload)
            await Utility.produceGeneralMessage(Utility.ENUMS.NOTIFICATION, Utility.ENUMS.EVENT, message, Utility.ENUMS.STATE.SUCCESS)
          }

          if (doCommit) {
            await trx.commit
          }
        }
      } catch (err) {
        if (doCommit) {
          await trx.rollback
        }
        throw err
      }
    }

    if (trx) {
      await trxFunction(trx, false)
    } else {
      await knex.transaction(trxFunction)
    }
    return 0
  } catch (err) {
    throw err
  }
}

const Facade = {
  getNotificationMessage,
  settlementTransfersPrepare,
  settlementTransfersReserve,
  settlementTransfersAbort,
  settlementTransfersCommit,

  /**
   * @param enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT
   * @param enums.ledgerEntryTypes
   * @param enums.participantLimitTypes
   * @param enums.settlementStates.PS_TRANSFERS_RECORDED
   * @param enums.settlementStates.PS_TRANSFERS_RESERVED
   * @param enums.settlementStates.PS_TRANSFERS_COMMITTED
   * @param enums.settlementStates.SETTLING
   * @param enums.settlementWindowStates
   * @param enums.transferParticipantRoleTypes
   * @param enums.transferParticipantRoleTypes.DFSP_POSITION
   * @param enums.transferParticipantRoleTypes.HUB
   * @param enums.transferStates
   */
  putById: async function (settlementId, payload, enums) {
    try {
      const knex = await Db.getKnex()
      return await knex.transaction(async (trx) => {
        try {
          let transactionTimestamp = new Date().toISOString().replace(/[TZ]/g, ' ').trim()

          // seq-settlement-6.2.5, step 3
          let settlementData = await knex('settlement AS s')
            .join('settlementStateChange AS ssc', 'ssc.settlementStateChangeId', 's.currentStateChangeId')
            .select('s.settlementId', 'ssc.settlementStateId', 'ssc.reason', 'ssc.createdDate')
            .where('s.settlementId', settlementId)
            .first()
            .transacting(trx)
            .forUpdate()

          if (!settlementData) {
            return Boom.badRequest(new Error('Settlement not found'))
          } else {
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

            // seq-settlement-6.2.5, step 11
            let settlementAccounts = {
              pendingSettlementCount: 0,
              psTransfersRecordedCount: 0,
              psTransfersReservedCount: 0,
              psTransfersCommittedCount: 0,
              settledCount: 0,
              abortedCount: 0,
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

              // seq-settlement-6.2.5, step 13
              switch (state) {
                case enums.settlementStates.PENDING_SETTLEMENT: {
                  settlementAccounts.pendingSettlementCount++
                  break
                }
                case enums.settlementStates.PS_TRANSFERS_RECORDED: {
                  settlementAccounts.psTransfersRecordedCount++
                  break
                }
                case enums.settlementStates.PS_TRANSFERS_RESERVED: {
                  settlementAccounts.psTransfersReservedCount++
                  break
                }
                case enums.settlementStates.PS_TRANSFERS_COMMITTED: {
                  settlementAccounts.psTransfersCommittedCount++
                  break
                }
                case enums.settlementStates.SETTLED: {
                  settlementAccounts.settledCount++
                  break
                }
                case enums.settlementStates.ABORTED: {
                  settlementAccounts.abortedCount++
                  break
                }
                default: {
                  settlementAccounts.unknownCount++
                  break
                }
              }
            }
            // seq-settlement-6.2.5, step 14
            // let settlementAccountsInit = Object.assign({}, settlementAccounts)

            // seq-settlement-6.2.5, step 15
            let allWindows = new Map()
            for (let { settlementWindowId, settlementWindowStateId, reason, createdDate } of windowsList) {
              allWindows[settlementWindowId] = { settlementWindowId, settlementWindowStateId, reason, createdDate }
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
                psTransfersRecordedCount: 0,
                psTransfersReservedCount: 0,
                psTransfersCommittedCount: 0,
                settledCount: 0,
                abortedCount: 0
              }
              switch (state) {
                case enums.settlementStates.PENDING_SETTLEMENT: {
                  windowsAccounts[wid].pendingSettlementCount++
                  break
                }
                case enums.settlementStates.PS_TRANSFERS_RECORDED: {
                  windowsAccounts[wid].psTransfersRecordedCount++
                  break
                }
                case enums.settlementStates.PS_TRANSFERS_RESERVED: {
                  windowsAccounts[wid].psTransfersReservedCount++
                  break
                }
                case enums.settlementStates.PS_TRANSFERS_COMMITTED: {
                  windowsAccounts[wid].psTransfersCommittedCount++
                  break
                }
                case enums.settlementStates.SETTLED: {
                  windowsAccounts[wid].settledCount++
                  break
                }
                case enums.settlementStates.ABORTED: {
                  windowsAccounts[wid].abortedCount++
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
              if (payload.participants.hasOwnProperty(participant)) {
                let participantPayload = payload.participants[participant]
                participants.push({ id: participantPayload.id, accounts: [] })
                let pi = participants.length - 1
                participant = participants[pi]
                // seq-settlement-6.2.5, step 19
                for (let account in participantPayload.accounts) {
                  if (participantPayload.accounts.hasOwnProperty(account)) {
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
                        externalReference: accountPayload.externalReference,
                        createdDate: transactionTimestamp,
                        netSettlementAmount: allAccounts[accountPayload.id].netSettlementAmount
                      })
                      settlementParticipantCurrencyStateChange.push({
                        settlementParticipantCurrencyId: allAccounts[accountPayload.id].key,
                        settlementStateId: accountPayload.state,
                        reason: accountPayload.reason,
                        externalReference: accountPayload.externalReference
                      })
                      allAccounts[accountPayload.id].reason = accountPayload.reason
                      allAccounts[accountPayload.id].createdDate = transactionTimestamp
                      // seq-settlement-6.2.5, step 24
                    } else if ((settlementData.settlementStateId === enums.settlementStates.PENDING_SETTLEMENT && accountPayload.state === enums.settlementStates.PS_TRANSFERS_RECORDED) ||
                      (settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_RECORDED && accountPayload.state === enums.settlementStates.PS_TRANSFERS_RESERVED) ||
                      (settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_RESERVED && accountPayload.state === enums.settlementStates.PS_TRANSFERS_COMMITTED) ||
                      ((settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_COMMITTED || settlementData.settlementStateId === enums.settlementStates.SETTLING) &&
                        accountPayload.state === enums.settlementStates.SETTLED)) {
                      processedAccounts.push(accountPayload.id)
                      participant.accounts.push({
                        id: accountPayload.id,
                        state: accountPayload.state,
                        reason: accountPayload.reason,
                        externalReference: accountPayload.externalReference,
                        createdDate: transactionTimestamp,
                        netSettlementAmount: allAccounts[accountPayload.id].netSettlementAmount
                      })
                      let spcsc = {
                        settlementParticipantCurrencyId: allAccounts[accountPayload.id].key,
                        settlementStateId: accountPayload.state,
                        reason: accountPayload.reason,
                        externalReference: accountPayload.externalReference,
                        createdDate: transactionTimestamp
                      }
                      if (accountPayload.state === enums.settlementStates.PS_TRANSFERS_RECORDED) {
                        spcsc.settlementTransferId = Uuid()
                      }
                      settlementParticipantCurrencyStateChange.push(spcsc)

                      if (accountPayload.state === enums.settlementStates.PS_TRANSFERS_RECORDED) {
                        settlementAccounts.pendingSettlementCount--
                        settlementAccounts.psTransfersRecordedCount++
                      } else if (accountPayload.state === enums.settlementStates.PS_TRANSFERS_RESERVED) {
                        settlementAccounts.psTransfersRecordedCount--
                        settlementAccounts.psTransfersReservedCount++
                      } else if (accountPayload.state === enums.settlementStates.PS_TRANSFERS_COMMITTED) {
                        settlementAccounts.psTransfersReservedCount--
                        settlementAccounts.psTransfersCommittedCount++
                      } else /* if (accountPayload.state === enums.settlementStates.SETTLED) */ { // disabled because else path not taken
                        settlementAccounts.psTransfersCommittedCount--
                        settlementAccounts.settledCount++
                      }
                      allAccounts[accountPayload.id].state = accountPayload.state
                      allAccounts[accountPayload.id].reason = accountPayload.reason
                      allAccounts[accountPayload.id].externalReference = accountPayload.externalReference
                      allAccounts[accountPayload.id].createdDate = transactionTimestamp
                      let settlementWindowId
                      for (let aw in accountsWindows[accountPayload.id].windows) {
                        settlementWindowId = accountsWindows[accountPayload.id].windows[aw]
                        if (accountPayload.state === enums.settlementStates.PS_TRANSFERS_RECORDED) {
                          windowsAccounts[settlementWindowId].pendingSettlementCount--
                          windowsAccounts[settlementWindowId].psTransfersRecordedCount++
                        } else if (accountPayload.state === enums.settlementStates.PS_TRANSFERS_RESERVED) {
                          windowsAccounts[settlementWindowId].psTransfersRecordedCount--
                          windowsAccounts[settlementWindowId].psTransfersReservedCount++
                        } else if (accountPayload.state === enums.settlementStates.PS_TRANSFERS_COMMITTED) {
                          windowsAccounts[settlementWindowId].psTransfersReservedCount--
                          windowsAccounts[settlementWindowId].psTransfersCommittedCount++
                        } else /* if (accountPayload.state === enums.settlementStates.SETTLED) */ { // disabled because else path not taken
                          windowsAccounts[settlementWindowId].psTransfersCommittedCount--
                          windowsAccounts[settlementWindowId].settledCount++
                        }
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
              }
            }
            let insertPromises = []
            let updatePromises = []
            // seq-settlement-6.2.5, step 26
            for (let spcsc of settlementParticipantCurrencyStateChange) {
              // Switched to insert from batchInsert because only LAST_INSERT_ID is returned
              // TODO: PoC - batchInsert + select inserted ids vs multiple inserts without select
              let spcscCopy = Object.assign({}, spcsc)
              delete spcscCopy.settlementTransferId
              insertPromises.push(
                knex('settlementParticipantCurrencyStateChange')
                  .insert(spcscCopy)
                  .transacting(trx)
              )
            }
            let settlementParticipantCurrencyStateChangeIdList = (await Promise.all(insertPromises)).map(v => v[0])
            // seq-settlement-6.2.5, step 29
            for (let i in settlementParticipantCurrencyStateChangeIdList) {
              let updatedColumns = { currentStateChangeId: settlementParticipantCurrencyStateChangeIdList[i] }
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

            if (settlementData.settlementStateId === enums.settlementStates.PENDING_SETTLEMENT) {
              await Facade.settlementTransfersPrepare(settlementId, transactionTimestamp, enums, trx)
            } else if (settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_RECORDED) {
              await Facade.settlementTransfersReserve(settlementId, transactionTimestamp, enums, trx)
            } else if (settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_RESERVED) {
              await Facade.settlementTransfersCommit(settlementId, transactionTimestamp, enums, trx)
            }

            let settlementWindowStateChange = []
            let settlementWindows = [] // response object
            let windowAccounts, windowAccountsInit
            for (let aw in affectedWindows) {
              windowAccounts = windowsAccounts[affectedWindows[aw]]
              windowAccountsInit = windowsAccountsInit[affectedWindows[aw]]

              if (windowAccounts.pendingSettlementCount !== windowAccountsInit.pendingSettlementCount ||
                windowAccounts.psTransfersRecordedCount !== windowAccountsInit.psTransfersRecordedCount ||
                windowAccounts.psTransfersReservedCount !== windowAccountsInit.psTransfersReservedCount ||
                windowAccounts.psTransfersCommittedCount !== windowAccountsInit.psTransfersCommittedCount ||
                windowAccounts.settledCount !== windowAccountsInit.settledCount) { // this condition is never reached because always any of the previous is true
                settlementWindows.push(allWindows[affectedWindows[aw]])

                if (windowAccounts.psTransfersCommittedCount === 0 &&
                  windowAccounts.abortedCount === 0 &&
                  windowAccounts.settledCount > 0) {
                  allWindows[affectedWindows[aw]].settlementWindowStateId = enums.settlementWindowStates.SETTLED
                  allWindows[affectedWindows[aw]].reason = 'All window settlement accounts are settled'
                  allWindows[affectedWindows[aw]].createdDate = transactionTimestamp
                  settlementWindowStateChange.push(allWindows[affectedWindows[aw]])
                }
              }
            }
            // seq-settlement-6.2.5, step 30
            insertPromises = []
            for (let swsc of settlementWindowStateChange) {
              insertPromises.push(
                knex('settlementWindowStateChange')
                  .insert(swsc)
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

            let settlementStateChanged = true
            if (settlementData.settlementStateId === enums.settlementStates.PENDING_SETTLEMENT &&
              settlementAccounts.pendingSettlementCount === 0) {
              settlementData.settlementStateId = enums.settlementStates.PS_TRANSFERS_RECORDED
              settlementData.reason = 'All settlement accounts are PS_TRANSFERS_RECORDED'
            } else if (settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_RECORDED &&
              settlementAccounts.psTransfersRecordedCount === 0) {
              settlementData.settlementStateId = enums.settlementStates.PS_TRANSFERS_RESERVED
              settlementData.reason = 'All settlement accounts are PS_TRANSFERS_RESERVED'
            } else if (settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_RESERVED &&
              settlementAccounts.psTransfersReservedCount === 0) {
              settlementData.settlementStateId = enums.settlementStates.PS_TRANSFERS_COMMITTED
              settlementData.reason = 'All settlement accounts are PS_TRANSFERS_COMMITTED'
            } else if (settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_COMMITTED &&
              settlementAccounts.psTransfersCommittedCount > 0 &&
              settlementAccounts.settledCount > 0) {
              settlementData.settlementStateId = enums.settlementStates.SETTLING
              settlementData.reason = 'Some settlement accounts are SETTLED'
            } else if ((settlementData.settlementStateId === enums.settlementStates.PS_TRANSFERS_COMMITTED ||
              settlementData.settlementStateId === enums.settlementStates.SETTLING) &&
              settlementAccounts.psTransfersCommittedCount === 0) {
              settlementData.settlementStateId = enums.settlementStates.SETTLED
              settlementData.reason = 'All settlement accounts are SETTLED'
            } else {
              settlementStateChanged = false
            }

            if (settlementStateChanged) {
              settlementData.createdDate = transactionTimestamp

              // seq-settlement-6.2.5, step 34
              let settlementStateChangeId = await knex('settlementStateChange')
                .insert(settlementData)
                .transacting(trx)
              // seq-settlement-6.2.5, step 36
              await knex('settlement')
                .where('settlementId', settlementData.settlementId)
                .update({ currentStateChangeId: settlementStateChangeId })
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

  abortById: async function (settlementId, payload, enums) {
    try {
      const knex = await Db.getKnex()

      // seq-settlement-6.2.6, step 3
      let settlementData = await Facade.getById({ settlementId })

      if (settlementData.state === enums.settlementStates.PS_TRANSFERS_COMMITTED ||
        settlementData.state === enums.settlementStates.SETTLING ||
        settlementData.state === enums.settlementStates.SETTLED) {
        throw new Error('State change is not allowed')
      } else if (settlementData.state === enums.settlementStates.ABORTED) {
        // seq-settlement-6.2.6, step 5
        let settlementStateChangeId = await knex('settlementStateChange')
          .insert({
            settlementId,
            settlementStateId: enums.settlementStates.ABORTED,
            reason: payload.reason
          })
        // seq-settlement-6.2.6, step 5a
        await knex('settlement')
          .where('settlementId', settlementId)
          .update({ currentStateChangeId: settlementStateChangeId })

        return {
          id: settlementId,
          state: payload.state,
          reason: payload.reason
        }
      } else if (settlementData.state === enums.settlementStates.PS_TRANSFERS_RESERVED) {
        // seq-settlement-6.2.6, step 6
        const transferCommittedAccount = await knex('settlementParticipantCurrency AS spc')
          .join('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'spc.currentStateChangeId')
          .where('spc.settlementId', settlementId)
          .where('spcsc.settlementStateId', enums.settlementStates.PS_TRANSFERS_COMMITTED)
          .first()
        if (transferCommittedAccount !== undefined) {
          throw new Error('At least one settlement transfer is committed')
        }
      }

      return await knex.transaction(async (trx) => {
        try {
          let transactionTimestamp = new Date().toISOString().replace(/[TZ]/g, ' ').trim()

          // seq-settlement-6.2.6, step 8
          let settlementAccountList = await knex('settlementParticipantCurrency AS spc')
            .leftJoin('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'spc.currentStateChangeId')
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'spc.participantCurrencyId')
            .select('pc.participantId', 'spc.participantCurrencyId', 'spcsc.settlementStateId', 'spcsc.reason', 'spc.netAmount', 'pc.currencyId', 'spc.settlementParticipantCurrencyId AS key'
            )
            .where('spc.settlementId', settlementId)
            .transacting(trx)
            .forUpdate()

          // seq-settlement-6.2.6, step 10
          let windowsList = await knex('settlementSettlementWindow AS ssw')
            .join('settlementWindow AS sw', 'sw.settlementWindowId', 'ssw.settlementWindowId')
            .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'sw.currentStateChangeId')
            .select('sw.settlementWindowId', 'swsc.settlementWindowStateId', 'swsc.reason', 'sw.createdDate')
            .where('ssw.settlementId', settlementId)
            .transacting(trx)
            .forUpdate()

          let insertPromises = []
          let updatePromises = []
          // seq-settlement-6.2.6, step 12
          for (let sal of settlementAccountList) {
            // Switched to insert from batchInsert because only LAST_INSERT_ID is returned
            // TODO: PoC - batchInsert + select inserted ids vs multiple inserts without select
            const spcsc = {
              settlementParticipantCurrencyId: sal.key,
              settlementStateId: enums.settlementStates.ABORTED,
              reason: payload.reason,
              externalReference: payload.externalReference
            }
            insertPromises.push(
              knex('settlementParticipantCurrencyStateChange')
                .insert(spcsc)
                .transacting(trx)
            )
          }
          let settlementParticipantCurrencyStateChangeIdList = (await Promise.all(insertPromises)).map(v => v[0])
          // seq-settlement-6.2.6, step 15
          for (let i in settlementParticipantCurrencyStateChangeIdList) {
            let updatedColumns = { currentStateChangeId: settlementParticipantCurrencyStateChangeIdList[i] }
            updatePromises.push(
              knex('settlementParticipantCurrency')
                .where('settlementParticipantCurrencyId', settlementAccountList[i].key)
                .update(updatedColumns)
                .transacting(trx)
            )
          }
          await Promise.all(updatePromises)

          await Facade.settlementTransfersAbort(settlementId, transactionTimestamp, enums, trx)

          // seq-settlement-6.2.6, step 16
          insertPromises = []
          for (let rec of windowsList) {
            const swsc = {
              settlementWindowId: rec.settlementWindowId,
              settlementWindowStateId: enums.settlementWindowStates.ABORTED,
              reason: payload.reason
            }
            insertPromises.push(
              knex('settlementWindowStateChange')
                .insert(swsc)
                .transacting(trx)
            )
          }
          let settlementWindowStateChangeIdList = (await Promise.all(insertPromises)).map(v => v[0])
          // seq-settlement-6.2.6, step 19
          updatePromises = []
          for (let i in settlementWindowStateChangeIdList) {
            updatePromises.push(
              knex('settlementWindow')
                .where('settlementWindowId', windowsList[i].settlementWindowId)
                .update({ currentStateChangeId: settlementWindowStateChangeIdList[i] })
                .transacting(trx)
            )
          }
          await Promise.all(updatePromises)

          // seq-settlement-6.2.6, step 20
          let settlementStateChangeId = await knex('settlementStateChange')
            .insert({
              settlementId,
              settlementStateId: enums.settlementStates.ABORTED,
              reason: payload.reason
            })
            .transacting(trx)
          // seq-settlement-6.2.6, step 22
          await knex('settlement')
            .where('settlementId', settlementId)
            .update({ currentStateChangeId: settlementStateChangeId })
            .transacting(trx)

          await trx.commit
          return {
            id: settlementId,
            state: payload.state,
            reason: payload.reason
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

  getById: async function ({ settlementId }) {
    try {
      return await Db.settlement.query(builder => {
        return builder
          .join('settlementStateChange AS ssc', 'ssc.settlementStateChangeId', 'settlement.currentStateChangeId')
          .select('settlement.settlementId',
            'ssc.settlementStateId AS state',
            'ssc.reason',
            'settlement.createdDate',
            'ssc.createdDate AS changedDate')
          .where('settlement.settlementId', settlementId)
          .first()
      })
    } catch (err) {
      throw err
    }
  },

  getByParams: async function ({ state, fromDateTime, toDateTime, currency, settlementWindowId, fromSettlementWindowDateTime, toSettlementWindowDateTime, participantId, accountId }) {
    try {
      return await Db.settlement.query(builder => {
        let b = builder
          .innerJoin('settlementStateChange AS ssc', 'ssc.settlementStateChangeId', 'settlement.currentStateChangeId')
          .innerJoin('settlementSettlementWindow AS ssw', 'ssw.settlementId', 'settlement.settlementId')
          .innerJoin('settlementWindow AS sw', 'sw.settlementWindowId', 'ssw.settlementWindowId')
          .innerJoin('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'sw.currentStateChangeId')
          .innerJoin('settlementTransferParticipant AS stp', function () {
            this.on('stp.settlementId', 'settlement.settlementId')
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
          const transactionTimestamp = new Date().toISOString().replace(/[TZ]/g, ' ').trim()
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
          let builder = knex
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
                .where('ssw.settlementId', settlementId[0])
                .groupBy('ssw.settlementWindowId', 'tp.participantCurrencyId', 'tp.transferParticipantRoleTypeId', 'tp.ledgerEntryTypeId')
                .select(knex.raw('? AS ??', [settlementId, 'settlementId']),
                  'ssw.settlementWindowId',
                  'tp.participantCurrencyId',
                  'tp.transferParticipantRoleTypeId',
                  'tp.ledgerEntryTypeId',
                  knex.raw('? AS ??', [transactionTimestamp, 'createdDate']))
                .sum('tp.amount AS amount')
            })
            .transacting(trx)
          await builder

          builder = knex
            .from(knex.raw('settlementParticipantCurrency (settlementId, participantCurrencyId, netAmount)'))
            .insert(function () {
              this.from('settlementTransferParticipant AS stp')
                .whereRaw('stp.settlementId = ?', settlementId[0])
                .groupBy('stp.settlementId', 'stp.participantCurrencyId')
                .select('stp.settlementId', 'stp.participantCurrencyId')
                .sum('stp.amount AS netAmount')
            }, 'settlementParticipantCurrencyId')
            .transacting(trx)
          await builder

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

          let insertPromises = []
          for (let spcsc of settlementParticipantCurrencyStateChangeList) {
            insertPromises.push(
              knex('settlementParticipantCurrencyStateChange')
                .insert(spcsc)
                .transacting(trx)
            )
          }
          const settlementParticipantCurrencyStateChangeIdList = (await Promise.all(insertPromises)).map(v => v[0])

          let updatePromises = []
          for (let index in settlementParticipantCurrencyIdList) {
            updatePromises.push(knex('settlementParticipantCurrency')
              .transacting(trx)
              .where('settlementParticipantCurrencyId', settlementParticipantCurrencyIdList[index])
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

          insertPromises = []
          for (let swsc of settlementWindowStateChangeList) {
            insertPromises.push(
              knex('settlementWindowStateChange')
                .insert(swsc)
                .transacting(trx)
            )
          }
          let settlementWindowStateChangeIdList = (await Promise.all(insertPromises)).map(v => v[0])

          updatePromises = []
          for (let index = 0; index < idList.length; index++) {
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
              settlementStateId: enums.settlementStates.PENDING_SETTLEMENT,
              reason,
              createdDate: transactionTimestamp
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
    getByListOfIds: async function (listOfIds) {
      try {
        return await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .leftJoin('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .leftJoin('participant as p', 'p.participantCurrencyId', 'pc.participantCurrencyId')
            .select(
              'settlementParticipantCurrency.netAmount as amount',
              'pc.currencyId as currency',
              'p.participantId as participant'
            )
            .whereIn('settlementWindow.settlementWindowId', listOfIds)
        })
      } catch (err) {
        throw err
      }
    },

    getAccountsInSettlementByIds: async function ({ settlementId, participantId }) {
      try {
        return await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .select('settlementParticipantCurrencyId')
            .where({ settlementId })
            .andWhere('pc.participantId', participantId)
        })
      } catch (err) {
        throw err
      }
    },

    getParticipantCurrencyBySettlementId: async function ({ settlementId }) {
      try {
        return await Db.settlementParticipantCurrency.query(builder => {
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
      } catch (err) {
        throw err
      }
    },

    getSettlementAccountById: async function (settlementParticipantCurrencyId) {
      try {
        return await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .join('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'settlementParticipantCurrency.currentStateChangeId')
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .select(
              'pc.participantId AS id',
              'settlementParticipantCurrency.participantCurrencyId',
              'spcsc.settlementStateId AS state',
              'spcsc.reason AS reason',
              'settlementParticipantCurrency.netAmount as netAmount',
              'pc.currencyId AS currency'
            )
            .where('settlementParticipantCurrency.settlementParticipantCurrencyId', settlementParticipantCurrencyId)
        })
      } catch (err) {
        throw err
      }
    },

    getSettlementAccountsByListOfIds: async function (settlementParticipantCurrencyIdList) {
      try {
        return await Db.settlementParticipantCurrency.query(builder => {
          return builder
            .join('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'settlementParticipantCurrency.currentStateChangeId')
            .join('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId')
            .select(
              'pc.participantId AS id',
              'settlementParticipantCurrency.participantCurrencyId',
              'spcsc.settlementStateId AS state',
              'spcsc.reason AS reason',
              'settlementParticipantCurrency.netAmount as netAmount',
              'pc.currencyId AS currency'
            )
            .whereIn('settlementParticipantCurrency.settlementParticipantCurrencyId', settlementParticipantCurrencyIdList)
        })
      } catch (err) {
        throw err
      }
    }
  },
  settlementSettlementWindow: {
    getWindowsBySettlementIdAndAccountId: async function ({ settlementId, accountId }) {
      try {
        return await Db.settlementSettlementWindow.query(builder => {
          return builder
            .join('settlementWindow', 'settlementWindow.settlementWindowId', 'settlementSettlementWindow.settlementWindowId')
            .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
            .join('settlementTransferParticipant AS stp', function () {
              this.on('stp.settlementWindowId', 'settlementWindow.settlementWindowId')
                .on('stp.participantCurrencyId', accountId)
            })
            .distinct(
              'settlementWindow.settlementWindowId as id',
              'swsc.settlementWindowStateId as state',
              'swsc.reason as reason',
              'settlementWindow.createdDate as createdDate',
              'swsc.createdDate as changedDate'
            )
            .select()
            .where('settlementSettlementWindow.settlementId', settlementId)
        })
      } catch (err) {
        throw err
      }
    },

    getWindowsBySettlementIdAndParticipantId: async function ({ settlementId, participantId }, enums) {
      try {
        let participantAccountList = (await Db.participantCurrency.find({ participantId, ledgerAccountTypeId: enums.ledgerAccountTypes.POSITION })).map(record => record.participantCurrencyId)
        return await Db.settlementSettlementWindow.query(builder => {
          return builder
            .join('settlementWindow', 'settlementWindow.settlementWindowId', 'settlementSettlementWindow.settlementWindowId')
            .join('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId')
            .join('settlementTransferParticipant AS stp', async function () {
              this.on('stp.settlementWindowId', 'settlementWindow.settlementWindowId')
                .onIn('stp.participantCurrencyId', participantAccountList)
            })
            .distinct(
              'settlementWindow.settlementWindowId as id',
              'swsc.settlementWindowStateId as state',
              'swsc.reason as reason',
              'settlementWindow.createdDate as createdDate',
              'swsc.createdDate as changedDate'
            )
            .select()
            .where('settlementSettlementWindow.settlementId', settlementId)
        })
      } catch (err) {
        throw err
      }
    }
  }
}

module.exports = Facade
