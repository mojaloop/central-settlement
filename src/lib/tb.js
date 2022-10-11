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
// const Logger = require('@mojaloop/central-services-logger')
const TbNode = require('tigerbeetle-node')
const createClient = TbNode.createClient
const Config = require('../lib/config')
const util = require('util')
const crypto = require('crypto')
const uuidv4Gen = require('uuid4')

let tbCachedClient

const getTBClient = async () => {
  if (!Config.TIGERBEETLE.enabled) {
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
      'TB-Client is not enabled.')
  }

  if (tbCachedClient == null) {
    tbCachedClient = await createClient({
      cluster_id: Config.TIGERBEETLE.cluster,
      replica_addresses: [Config.TIGERBEETLE.replicaEndpoint01]
    })
  }
  return tbCachedClient
}

/**
 * Create a Hub account used for settlement.
 *
 * @param id Hub/Hub Recon id
 * @param accountType Numeric account type for Hub or Hub Recon
 *    1->POSITION
 *    2->SETTLEMENT
 *    3->HUB_RECONCILIATION
 *    4->HUB_MULTILATERAL_SETTLEMENT
 *    5->INTERCHANGE_FEE
 *    6->INTERCHANGE_FEE_SETTLEMENT
 * @param currencyTxt ISO-4217 alphabetic code
 */
const tbLookupCreateSettlementHubAccount = async (
  id,
  accountType = 2,
  currencyTxt = 'USD'
) => {
  const account = await tbLookupHubAccount(id, accountType, currencyTxt)
  if (account.id) return account

  // Create:
  const errors = await tbCreateSettlementHubAccount(id, accountType, currencyTxt)
  if (errors.length === 0) return await tbLookupHubAccount(id, accountType, currencyTxt)
  else {
    const errorTxt = errorsToString(TbNode.CreateAccountError, errors)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
        `TB-Account entry failed for [${currencyTxt}:${errorTxt}] : ${util.inspect(errors)}`)
  }
}

/**
 * Create a Hub account used for settlement.
 *
 * @param id Hub/Hub Recon id
 * @param accountType Numeric account type for Hub or Hub Recon
 *    1->POSITION
 *    2->SETTLEMENT
 *    3->HUB_RECONCILIATION
 *    4->HUB_MULTILATERAL_SETTLEMENT
 *    5->INTERCHANGE_FEE
 *    6->INTERCHANGE_FEE_SETTLEMENT
 * @param currencyTxt ISO-4217 alphabetic code
 */
const tbCreateSettlementHubAccount = async (
  id,
  accountType = 2,
  currencyTxt = 'USD'
) => {
  const client = await getTBClient()

  const userData = BigInt(id)
  const currencyU16 = obtainLedgerFromCurrency(currencyTxt)
  const tbId = tbAccountIdFrom(userData, currencyU16, accountType)

  const account = {
    id: tbId,
    user_data: userData, // u128, opaque third-party identifier to link this account (many-to-one) to an external entity:
    reserved: Buffer.alloc(48, 0), // [48]u8
    ledger: currencyU16, // u32, currency
    code: accountType, // u16, settlement
    flags: 0, // u32
    debits_pending: 0n, // u64
    debits_posted: 0n, // u64
    credits_pending: 0n, // u64
    credits_posted: 0n, // u64
    timestamp: 0n // u64, Reserved: This will be set by the server.
  }

  const errors = await client.createAccounts([account])
  /* if (errors.length > 0) {
    const errorTxt = errorsToString(TbNode.CreateAccountError, errors)
    Logger.error('CreateAccount-ERROR: ' + errorTxt)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.MODIFIED_REQUEST,
        `TB-Account entry failed for [${userData}:${errorTxt}] : ${util.inspect(errors)}`)
  } */
  return errors
}

/**
 * Create all the settlement accounts.
 *
 * @param id Hub/Hub Recon/DFSPS id
 * @param accountType Numeric account type
 * @param currencyTxt ISO-4217 alphabetic code
 */
const tbCreateSettlementAccounts = async (
  enums,
  settlementAccounts,
  settlementId,
  currencyTxt,
  debitsNotExceedCredits
) => {
  const client = await getTBClient()

  const tbAccountsArray = []
  for (const accIter of settlementAccounts) {
    const userData = BigInt(settlementId)
    const participantCurrencyId = BigInt(accIter.participantCurrencyId)
    const id = tbSettlementAccountIdFrom(participantCurrencyId, userData)
    const currencyU16 = obtainLedgerFromCurrency(currencyTxt)

    tbAccountsArray.push({
      id,
      user_data: userData, // u128, settlementId
      reserved: Buffer.alloc(48, 0), // [48]u8
      ledger: currencyU16, // u32, currency
      code: enums.ledgerAccountTypes.SETTLEMENT, // u16, settlement
      flags: debitsNotExceedCredits ? TbNode.AccountFlags.debits_must_not_exceed_credits : 0, // u32
      debits_pending: 0n, // u64
      debits_posted: 0n, // u64
      credits_pending: 0n, // u64
      credits_posted: 0n, // u64
      timestamp: 0n // u64, Reserved: This will be set by the server.
    })
  }

  return await client.createAccounts(tbAccountsArray)
}

const tbLookupHubAccount = async (
  id,
  accountType = 2,
  currencyTxt = 'USD'
) => {
  const client = await getTBClient()

  const userData = BigInt(id)
  const currencyU16 = obtainLedgerFromCurrency(currencyTxt)
  const tbId = tbAccountIdFrom(userData, currencyU16, accountType)

  const accounts = await client.lookupAccounts([tbId])
  return accounts.length > 0 ? accounts[0] : {}
}

const tbLookupSettlementAccount = async (
  participantCurrencyId,
  settlementId
) => {
  const client = await getTBClient()

  const userData = BigInt(settlementId)
  const participantCurrencyIdBI = BigInt(participantCurrencyId)
  const id = tbSettlementAccountIdFrom(participantCurrencyIdBI, userData)

  const accounts = await client.lookupAccounts([id])
  return accounts.length > 0 ? accounts[0] : {}
}

/**
 * Settlement obligation has been created via `createSettlementEvent`.
 * After this is called, we should be in a settlement state  of
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
  enums,
  settlementTransferId,
  orgTransferId,
  settlementId,
  drParticipantCurrencyIdHubRecon,
  crDrParticipantCurrencyIdHubMultilateral,
  crParticipantCurrencyIdDFSP,
  currencyTxt,
  amount
) => {
  const client = await getTBClient()

  const currencyU16 = obtainLedgerFromCurrency(currencyTxt)
  const transferRecon = {
    id: uuidToBigInt(settlementTransferId), // u128
    debit_account_id: BigInt(drParticipantCurrencyIdHubRecon), // u128
    credit_account_id: BigInt(crDrParticipantCurrencyIdHubMultilateral), // u128
    user_data: BigInt(settlementId),
    reserved: BigInt(0),
    pending_id: 0n,
    timeout: 0n, // u64, in nano-seconds.
    ledger: currencyU16,
    code: enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT,
    flags: TbNode.TransferFlags.linked, // linked
    amount: BigInt(amount), // u64
    timestamp: 0n // u64, Reserved: This will be set by the server.
  }

  const partCurrencyId = tbSettlementAccountIdFrom(crParticipantCurrencyIdDFSP, settlementId)
  const transferDFSPToHub = {
    id: uuidToBigInt(`${uuidv4Gen()}`),
    debit_account_id: BigInt(crDrParticipantCurrencyIdHubMultilateral), // u128
    credit_account_id: partCurrencyId, // u128
    user_data: uuidToBigInt(orgTransferId),
    reserved: 0n, // two-phase condition can go in here / Buffer.alloc(32, 0)
    pending_id: 0n,
    timeout: 0n, // u64, in nano-seconds.
    ledger: currencyU16,
    code: enums.ledgerAccountTypes.SETTLEMENT, // u32
    flags: 0, // u32 (last txn in the chain of lined events)
    amount: BigInt(amount), // u64
    timestamp: 0n // u64, Reserved: This will be set by the server.
  }

  return await client.createTransfers([transferRecon, transferDFSPToHub])
}

const tbSettlementTransferReserve = async (
  enums,
  settlementTransferId,
  settlementId,
  drParticipantCurrencyIdDFSP,
  crDrParticipantCurrencyIdHubMultilateral,
  crParticipantCurrencyIdHubRecon,
  currencyTxt,
  amount,
  timeoutSeconds
) => {
  const client = await getTBClient()

  const currencyU16 = obtainLedgerFromCurrency(currencyTxt)
  let timeoutNanoseconds = 1000000000n
  if (timeoutSeconds !== undefined) {
    timeoutNanoseconds = BigInt(timeoutSeconds * 1000000000)
  }

  const partCurrencyId = tbSettlementAccountIdFrom(drParticipantCurrencyIdDFSP, settlementId)
  const transferHubToDFSPReserve = {
    id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId, 1),
    debit_account_id: partCurrencyId, // u128
    credit_account_id: BigInt(crDrParticipantCurrencyIdHubMultilateral), // u128
    user_data: BigInt(settlementId),
    reserved: 0n,
    pending_id: 0n,
    timeout: timeoutNanoseconds, // u64, in nano-seconds.
    ledger: currencyU16,
    code: enums.ledgerAccountTypes.SETTLEMENT,
    flags: TbNode.TransferFlags.linked | TbNode.TransferFlags.pending, // pending+linked
    amount: BigInt(amount), // u64
    timestamp: 0n // u64, Reserved: This will be set by the server.
  }

  const transferMultiToRecon = {
    id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId, 2),
    debit_account_id: BigInt(crDrParticipantCurrencyIdHubMultilateral), // u128
    credit_account_id: BigInt(crParticipantCurrencyIdHubRecon), // u128
    user_data: uuidToBigInt(settlementTransferId),
    reserved: 0n,
    pending_id: 0n,
    timeout: timeoutNanoseconds, // u64, in nano-seconds.
    ledger: currencyU16,
    code: enums.ledgerAccountTypes.HUB_RECONCILIATION,
    flags: TbNode.TransferFlags.pending, // linked+pending
    amount: BigInt(amount), // u64
    timestamp: 0n // u64, Reserved: This will be set by the server.
  }

  return await client.createTransfers([transferHubToDFSPReserve, transferMultiToRecon])
}

const tbSettlementTransferCommit = async (
  settlementTransferId,
  settlementId
) => {
  const client = await getTBClient()

  const commits = [
    {
      id: uuidToBigInt(`${uuidv4Gen()}`),
      debit_account_id: 0n, // u128
      credit_account_id: 0n, // u128
      user_data: 0n,
      reserved: 0n,
      pending_id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId, 1),
      timeout: 0n, // u64, in nano-seconds.
      ledger: 0,
      code: 0,
      flags: TbNode.TransferFlags.linked | TbNode.TransferFlags.post_pending_transfer, // post
      amount: 0n, // u64
      timestamp: 0n // u64, Reserved: This will be set by the server.
    }, {
      id: uuidToBigInt(`${uuidv4Gen()}`),
      debit_account_id: 0n, // u128
      credit_account_id: 0n, // u128
      user_data: 0n,
      reserved: 0n,
      pending_id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId, 2),
      timeout: 0n, // u64, in nano-seconds.
      ledger: 0,
      code: 0,
      flags: TbNode.TransferFlags.post_pending_transfer, // post
      amount: 0n, // u64
      timestamp: 0n // u64, Reserved: This will be set by the server.
    }
  ]

  return await client.createTransfers(commits)
}

const tbSettlementTransferAbort = async (
  settlementTransferId,
  settlementId
) => {
  const client = await getTBClient()

  const aborts = [
    {
      id: uuidToBigInt(`${uuidv4Gen()}`),
      debit_account_id: 0n, // u128
      credit_account_id: 0n, // u128
      user_data: 0n,
      reserved: BigInt(0),
      pending_id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId, 1),
      timeout: 0n, // u64, in nano-seconds.
      ledger: 0,
      code: 0,
      flags: TbNode.TransferFlags.linked | TbNode.TransferFlags.void_pending_transfer, // void
      amount: 0n, // u64
      timestamp: 0n // u64, Reserved: This will be set by the server.
    }, {
      id: uuidToBigInt(`${uuidv4Gen()}`),
      debit_account_id: 0n, // u128
      credit_account_id: 0n, // u128
      user_data: 0n,
      reserved: BigInt(0),
      pending_id: tbMultilateralTransferSettlementId(settlementId, settlementTransferId, 2),
      timeout: 0n, // u64, in nano-seconds.
      ledger: 0,
      code: 0,
      flags: TbNode.TransferFlags.void_pending_transfer, // void
      amount: 0n, // u64
      timestamp: 0n // u64, Reserved: This will be set by the server.
    }
  ]

  return await client.createTransfers(aborts)
}

const tbDestroy = async () => {
  try {
    if (tbCachedClient == null) return {}
    tbCachedClient.destroy()
    tbCachedClient = undefined
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const obtainLedgerFromCurrency = (currencyTxt) => {
  switch (currencyTxt) {
    case 'KES' : return 404
    case 'ZAR' : return 710
    case 'AED' : return 784
    case 'EUR' : return 978
    default : return 840// USD
  }
}

const tbAccountIdFrom = (userData, currencyTxt, accountTypeNumeric) => {
  return sha256(`${userData}-${currencyTxt}-${accountTypeNumeric}`)
}

const tbSettlementAccountIdFrom = (partCurrencyId, settlementId) => {
  return sha256(`${partCurrencyId}-${settlementId}`)
}

const tbMultilateralTransferSettlementId = (settlementId, settlementTransferId, qualifier) => {
  return sha256(`${settlementId}-${settlementTransferId}-${qualifier}`)
}

const sha256 = (txt) => {
  const hashSha256 = crypto.createHash('sha256')
  let hash = hashSha256.update(txt)
  hash = hashSha256.digest(hash).toString('hex')
  // TODO need to remove this, and retest:
  hash = hash.substring(0, 32)// 6107f0019cf7ff3bd35c7566c9dd3ae4530ead129527e091191f8ce04421f816
  return BigInt(BigInt(`0x${hash}`).toString() / 2)
}

const uuidToBigInt = (uuid) => {
  return BigInt('0x' + uuid.replace(/-/g, ''))
}

const errorsToString = (resultEnum, errors) => {
  let errorListing = ''
  for (const val of errors) {
    errorListing = errorListing.concat(`[${val.code}:${enumLabelFromCode(resultEnum, val.code)}],`)
  }
  return errorListing
}

const enumLabelFromCode = (resultEnum, errCode) => {
  const errorEnum = Object.keys(resultEnum)
  return errorEnum[errCode + ((errorEnum.length / 2) - 1)]
}

const printHubAccountInfo = async (color, id, accountType = 2, currencyTxt = 'USD') => {
  const accToPrint = await tbLookupHubAccount(id, accountType, currencyTxt)
  await printAccountInfo(color, accToPrint)
}

const printSettlementAccountInfo = async (color, participantCurrencyId, settlementId) => {
  const accToPrint = await tbLookupSettlementAccount(participantCurrencyId, settlementId)
  await printAccountInfo(color, accToPrint)
}

const printAccountInfo = async (color, account) => {
  // ${util.inspect(account)}
  console.log(color, `AccountInfo - ID[${account.id}]\nLedger[${account.ledger}]\nAccType[${account.code}]\n
    Debits_Pending[${account.debits_pending}]\n
    Debits_Posted[${account.debits_posted}]`)
}

module.exports = {
  // Accounts:
  tbCreateSettlementAccounts,
  tbCreateSettlementHubAccount,
  tbLookupHubAccount,
  tbLookupSettlementAccount,
  // Transfers:
  tbSettlementPreparationTransfer,
  tbSettlementTransferReserve,
  tbSettlementTransferCommit,
  tbSettlementTransferAbort,
  // Cleanup:
  tbDestroy,
  // Helpers:
  tbLookupCreateSettlementHubAccount,
  printHubAccountInfo,
  printSettlementAccountInfo
}
