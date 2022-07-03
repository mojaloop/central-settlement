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

 * Jason Bruwer <jason.bruwer@coil.com>

 --------------
 ******/
'use strict'

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const TbNode = require('tigerbeetle-node')
const createClient = TbNode.createClient
const Config = require('../lib/config')
const util = require('util')
const crypto = require("crypto")
const uuidv4Gen = require('uuid4')

let tbCachedClient;

let inFlight = [];

const secret = 'This is a secret 🤫'

const getTBClient = async () => {
  try {
    if (!Config.TIGERBEETLE.enabled) return null

    if (tbCachedClient == null) {
      Logger.info('TB-Client-Enabled. Connecting to R-01 '+ Config.TIGERBEETLE.replicaEndpoint01)
      Logger.info('TB-Client-Enabled. Connecting to R-02 '+Config.TIGERBEETLE.replicaEndpoint02)
      Logger.info('TB-Client-Enabled. Connecting to R-03 '+Config.TIGERBEETLE.replicaEndpoint03)

      tbCachedClient = await createClient({
        cluster_id: Config.TIGERBEETLE.cluster,
        replica_addresses:
          [
            Config.TIGERBEETLE.replicaEndpoint01,
            Config.TIGERBEETLE.replicaEndpoint02,
            Config.TIGERBEETLE.replicaEndpoint03
          ]
      })
    }
    return tbCachedClient;
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * Settlement obligation has been created via `createSettlementEvent`.
 * After this is called, we should be in a settlement state of
 * `PENDING_SETTLEMENT` -> `PS_TRANSFERS_RECORDED`
 *
 * @param settlementTransferId
 * @param orgTransferId
 * @param settlementId
 * @param drParticipantCurrencyIdHub
 * @param drParticipantCurrencyIdHubRecon
 * @param crParticipantCurrencyIdDFSP
 * @param currencyTxt
 * @param amount
 * @returns {Promise<{}|*>}
 */
const tbSettlementPreparationTransfer = async (
    settlementTransferId,
    orgTransferId,
    settlementId,
    drParticipantCurrencyIdHub,
    drParticipantCurrencyIdHubRecon,
    crParticipantCurrencyIdDFSP,
    currencyTxt,
    amount
) => {
  try {
    const client = await getTBClient()
    if (client == null) return {}

    const currencyU16 = obtainLedgerFromCurrency(currencyTxt)

    //TODO org transfer is [POSITION]

    const accTypeHubToRecon = 1001//TODO @jason, config [HUB_RECONCILIATION]
    const transferRecon = {
      id: uuidToBigInt(settlementTransferId), // u128
      debit_account_id: BigInt(drParticipantCurrencyIdHub),  // u128
      credit_account_id: BigInt(drParticipantCurrencyIdHubRecon), // u128
      user_data: BigInt(settlementId),
      reserved: BigInt(0),
      pending_id: 0,
      timeout: 0n, // u64, in nano-seconds.
      ledger: currencyU16,
      code: accTypeHubToRecon,
      flags: TbNode.TransferFlags.linked, // linked
      amount: BigInt(amount), // u64
      timestamp: 0n, //u64, Reserved: This will be set by the server.
    }

    const accTypeReconToDFSP = 1002//TODO @jason, config [HUB_MULTILATERAL_SETTLEMENT]
    const transferDFSPToHub = {
      id: uuidToBigInt(`${uuidv4Gen()}`),
      debit_account_id: BigInt(drParticipantCurrencyIdHubRecon),  // u128
      credit_account_id: BigInt(crParticipantCurrencyIdDFSP), // u128
      user_data: BigInt(orgTransferId),
      reserved: BigInt(0), // two-phase condition can go in here / Buffer.alloc(32, 0)
      pending_id: 0,
      timeout: 0n, // u64, in nano-seconds.
      ledger: currencyU16,
      code: accTypeReconToDFSP,  // u32
      flags: 0, // u32 (last txn in the chain of lined events)
      amount: BigInt(amount), // u64
      timestamp: 0n, //u64, Reserved: This will be set by the server.
    }

    const errors = await client.createTransfers([transferRecon, transferDFSPToHub])
    if (errors.length > 0) {
      const errorTxt = errorsToString(TbNode.CreateTransferError, errors);

      Logger.error('Transfer-ERROR: '+errorTxt)
      const fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
          'TB-Transfer-Preparation entry failed for [' + txnId + ':' + errorTxt + '] : '+ util.inspect(errors));
      throw fspiopError
    }
    return errors
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const tbSettlementTransferReserve = async (
    settlementTransferId,
    settlementId,
    drParticipantCurrencyIdHub,
    crParticipantCurrencyIdDFSP,
    currencyTxt,
    amount
) => {
  try {
    const client = await getTBClient()
    if (client == null) return {}

    const currencyU16 = obtainLedgerFromCurrency(currencyTxt)

    const accTypeHubToRecon = 1001//TODO @jason, config [HUB_MULTILATERAL_SETTLEMENT]
    const transferReservation = {
      id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId),
      debit_account_id: BigInt(crParticipantCurrencyIdDFSP),  // u128
      credit_account_id: BigInt(drParticipantCurrencyIdHub), // u128
      user_data: BigInt(settlementId),
      reserved: BigInt(0),
      pending_id: 0,
      timeout: 0n, // u64, in nano-seconds.
      ledger: currencyU16,
      code: accTypeHubToRecon,
      flags: TbNode.TransferFlags.pending, // pending
      amount: BigInt(amount), // u64
      timestamp: 0n, //u64, Reserved: This will be set by the server.
    }

    const errors = await client.createTransfers([transferReservation])
    if (errors.length > 0) {
      const errorTxt = errorsToString(TbNode.CreateTransferError, errors);

      Logger.error('Transfer-ERROR: '+errorTxt)
      const fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
          'TB-Transfer-Preparation entry failed for [' + txnId + ':' + errorTxt + '] : '+ util.inspect(errors));
      throw fspiopError
    }
    return errors
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const tbSettlementTransferCommit = async (
    settlementTransferId,
    settlementId,
) => {
  try {
    const client = await getTBClient()
    if (client == null) return {}

    const transferCommit = {
      id: uuidToBigInt(`${uuidv4Gen()}`),
      debit_account_id: 0n,  // u128
      credit_account_id: 0n, // u128
      user_data: 0n,
      reserved: BigInt(0),
      pending_id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId),
      timeout: 0n, // u64, in nano-seconds.
      ledger: 0n,
      code: 0n,
      flags: TbNode.TransferFlags.post_pending_transfer, // post
      amount: 0n, // u64
      timestamp: 0n, //u64, Reserved: This will be set by the server.
    }

    const errors = await client.createTransfers([transferCommit])
    if (errors.length > 0) {
      const errorTxt = errorsToString(TbNode.CreateTransferError, errors);

      Logger.error('Transfer-ERROR: '+errorTxt)
      const fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
          'TB-Transfer-Preparation entry failed for [' + txnId + ':' + errorTxt + '] : '+ util.inspect(errors));
      throw fspiopError
    }
    return errors
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const tbSettlementTransferAbort = async (
    settlementTransferId,
    settlementId,
) => {
  try {
    const client = await getTBClient()
    if (client == null) return {}

    const transferAbort = {
      id: uuidToBigInt(`${uuidv4Gen()}`),
      debit_account_id: 0n,  // u128
      credit_account_id: 0n, // u128
      user_data: 0n,
      reserved: BigInt(0),
      pending_id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId),
      timeout: 0n, // u64, in nano-seconds.
      ledger: 0n,
      code: 0n,
      flags: TbNode.TransferFlags.void_pending_transfer, // void
      amount: 0n, // u64
      timestamp: 0n, //u64, Reserved: This will be set by the server.
    }

    const errors = await client.createTransfers([transferAbort])
    if (errors.length > 0) {
      const errorTxt = errorsToString(TbNode.CreateTransferError, errors);

      Logger.error('Transfer-ERROR: '+errorTxt)
      const fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
          'TB-Transfer-Preparation entry failed for [' + txnId + ':' + errorTxt + '] : '+ util.inspect(errors));
      throw fspiopError
    }
    return errors
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * Create all the settlement accounts.
 *
 * @param id Hub/Hub Recon/DFSPS id
 * @param accountType Numeric account type
 * @param currencyTxt ISO-4217 alphabetic code
 */
const tbCreateSettlementAccounts = async (
    settlementAccounts,
    settlementId,
    accountType,
    currencyTxt,
    debitsNotExceedCredits
) => {
  try {
    const client = await getTBClient()
    if (client == null) return {}

    const tbAccountsArray = [];
    for (const accIter of settlementAccounts) {
      const userData = BigInt(settlementId)
      const participantCurrencyId = BigInt(accIter.participantCurrencyId)
      const currencyU16 = obtainLedgerFromCurrency(currencyTxt)
      const id = tbSettlementAccountIdFrom(participantCurrencyId, userData)

      const account = {
        id: id,
        user_data: userData, // u128, settlementId
        reserved: Buffer.alloc(48, 0), // [48]u8
        ledger: currencyU16,   // u32, currency
        code: accountType, // u16, settlement
        flags: !!debitsNotExceedCredits ? AccountFlags.debits_must_not_exceed_credits : 0,  // u32
        debits_pending: 0n,  // u64
        debits_posted: 0n,  // u64
        credits_pending: 0n, // u64
        credits_posted: 0n, // u64
        timestamp: 0n, // u64, Reserved: This will be set by the server.
      }
      tbAccountsArray.push(account);
    }

    const errors = await client.createAccounts(tbAccountsArray)
    if (errors.length > 0) {
      const errorTxt = errorsToString(TbNode.CreateAccountError, errors);

      Logger.error('CreateAccount-ERROR: '+errorTxt)
      const fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
          'TB-Account entry failed for [' + userData + ':' + errorTxt + '] : '+ util.inspect(errors));
      throw fspiopError
    }
    return errors
  } catch (err) {
    console.error(`TB: Unable to create account.`)
    console.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * Create a Hub account used for settlement.
 *
 * @param id Hub/Hub Recon id
 * @param accountType Numeric account type for Hub or Hub Recon
 * @param currencyTxt ISO-4217 alphabetic code
 */
const tbCreateSettlementHubAccount = async (
    id,
    accountType = 1,
    currencyTxt = 'USD'
) => {
  try {
    const client = await getTBClient()
    if (client == null) return {}

    const userData = BigInt(id)
    const currencyU16 = obtainLedgerFromCurrency(currencyTxt)
    const tbId = tbAccountIdFrom(userData, currencyU16, accountType)

    //TODO @jason perform account lookup based on ID first...
    console.info(`JASON::: 1.2 Creating Account ${util.inspect(currencyU16)} - ${tbId}   `)

    const account = {
      id: tbId,
      user_data: userData, // u128, opaque third-party identifier to link this account (many-to-one) to an external entity:
      reserved: Buffer.alloc(48, 0), // [48]u8
      ledger: currencyU16,   // u32, currency
      code: accountType, // u16, settlement
      flags: 0,  // u32
      debits_pending: 0n,  // u64
      debits_posted: 0n,  // u64
      credits_pending: 0n, // u64
      credits_posted: 0n, // u64
      timestamp: 0n, // u64, Reserved: This will be set by the server.
    }

    const errors = await client.createAccounts([account])
    if (errors.length > 0) {
      const errorTxt = errorsToString(TbNode.CreateAccountError, errors);

      Logger.error('CreateAccount-ERROR: '+errorTxt)
      const fspiopError = ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
          'TB-Account entry failed for [' + userData + ':' + errorTxt + '] : '+ util.inspect(errors));
      throw fspiopError
    }
    return errors
  } catch (err) {
    console.error(`TB: Unable to create account.`)
    console.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const tbDestroy = async () => {
  try {
    const client = await getTBClient()
    if (client == null) return {}
    Logger.info('Destroying TB client')
    client.destroy()
    tbCachedClient = undefined
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const obtainLedgerFromCurrency = (currencyTxt) => {
  switch (currencyTxt) {
    case 'KES' : return 404;
    case 'ZAR' : return 710;
    default : return 840;//USD
  }
}

const errorsToString = (resultEnum, errors) => {
  let errorListing = '';
  for (let val of errors) {
    errorListing = errorListing.concat('['+val.code+':'+enumLabelFromCode(resultEnum, val.code)+'],');
  }
  return errorListing;
}

const tbAccountIdFrom = (userData, currencyTxt, accountTypeNumeric) => {
  const combined = `${userData}-${currencyTxt}-${accountTypeNumeric}`
  const hash = sha256(combined)
  return BigInt(`0x${hash}`)
}

const tbSettlementAccountIdFrom = (partCurrencyId, settlementId) => {
  const hash = sha256(`${partCurrencyId}-${settlementId}`)
  return BigInt(`0x${hash}`)
}

const tbMultilateralTransferSettlementId = (settlementId, settlementTransferId) => {
  const hash = sha256(`${settlementId}-${settlementTransferId}`)
  return BigInt(`0x${hash}`)
}

const sha256 = (txt) => {
  const hashSha256 = Crypto.createHash('sha256')
  let hash = hashSha256.update(txt)
  hash = hashSha256.digest(hash).toString('hex')
  return BigInt("0x"+hash)
}

const uuidToBigInt = (uuid) => {
  return BigInt("0x" + uuid.replace(/-/g, ''))
}

const enumLabelFromCode = (resultEnum, errCode) => {
  const errorEnum = Object.keys(resultEnum)
  return errorEnum[errCode + ((errorEnum.length / 2) - 1)]
}

module.exports = {
  tbCreateAccount,
  tbDestroy
}

