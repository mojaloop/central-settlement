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
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 - Claudio Viola <claudio.viola@modusbox.com>
 --------------
 ******/

'use strict'

const Config = require('../config')
const Logger = require('@mojaloop/central-services-logger')
const Uuid = require('uuid4')
const transferParticipantStateChangeService = require('../../../src/domain/transferSettlement')
const Api = require('../helpers/api')
const Db = require('../../../src/lib/db')
const Utils = require('../helpers/utils')

const currencies = ['USD', 'TZS']

const settlementModels = [
  {
    name: 'DEFERRED_NET',
    settlementGranularity: 'NET',
    settlementInterchange: 'MULTILATERAL',
    settlementDelay: 'DEFERRED',
    settlementCurrency: 'USD',
    requireLiquidityCheck: true,
    type: 'POSITION',
    autoPositionReset: true,
    ledgerAccountType: 'SETTLEMENT',
    settlementAccountType: 'POSITION'
  }
  // {
  //   name: 'CGS',
  //   settlementGranularity: 'GROSS',
  //   settlementInterchange: 'BILATERAL',
  //   settlementDelay: 'IMMEDIATE',
  //   requireLiquidityCheck: true,
  //   ledgerAccountType: 'POSITION',
  //   autoPositionReset: false,
  //   settlementAccountType: 'SETTLEMENT'
  // },
  // {
  //   name: 'INTERCHANGEFEE',
  //   settlementGranularity: 'NET',
  //   settlementInterchange: 'MULTILATERAL',
  //   settlementDelay: 'DEFERRED',
  //   requireLiquidityCheck: false,
  //   ledgerAccountType: 'INTERCHANGE_FEE',
  //   autoPositionReset: true,
  //   settlementAccountType: 'INTERCHANGE_FEE_SETTLEMENT'
  // }
  // {
  //   name: 'DEFERREDNETUSD',
  //   settlementGranularity: 'NET',
  //   settlementInterchange: 'MULTILATERAL',
  //   settlementDelay: 'DEFERRED',
  //   ledgerAccountType: 'POSITION',
  //   autoPositionReset: true,
  //   currency: 'USD',
  //   requireLiquidityCheck: true,
  //   settlementAccountType: 'SETTLEMENT'
  // }
]

const payerFsp = `fsp${Utils.rand8()}`
const payeeFsp = `fsp${Utils.rand8()}`
const fspList = [
  {
    fspName: payerFsp,
    endpointBase: `${Config.SIMULATOR_URL}/payerfsp`
  },
  {
    fspName: payeeFsp,
    endpointBase: `${Config.SIMULATOR_URL}/payeefsp`
  }
]
const transfers = []
for (const currency of currencies) {
  transfers.push({
    transferId: Uuid(),
    amount: {
      amount: (10 + Math.floor(Math.random() * 9000) / 100).toString().substr(0, 5), // transfer amount between 10.00 and 100
      currency
    },
    ilpPacket: 'AQAAAAAAAADIEHByaXZhdGUucGF5ZWVmc3CCAiB7InRyYW5zYWN0aW9uSWQiOiIyZGY3NzRlMi1mMWRiLTRmZjctYTQ5NS0yZGRkMzdhZjdjMmMiLCJxdW90ZUlkIjoiMDNhNjA1NTAtNmYyZi00NTU2LThlMDQtMDcwM2UzOWI4N2ZmIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNzcxMzgwMzkxMyIsImZzcElkIjoicGF5ZWVmc3AifSwicGVyc29uYWxJbmZvIjp7ImNvbXBsZXhOYW1lIjp7fX19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI3NzEzODAzOTExIiwiZnNwSWQiOiJwYXllcmZzcCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnt9fX0sImFtb3VudCI6eyJjdXJyZW5jeSI6IlVTRCIsImFtb3VudCI6IjIwMCJ9LCJ0cmFuc2FjdGlvblR5cGUiOnsic2NlbmFyaW8iOiJERVBPU0lUIiwic3ViU2NlbmFyaW8iOiJERVBPU0lUIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIiLCJyZWZ1bmRJbmZvIjp7fX19',
    ilpCondition: 'HOr22-H3AfTDHrSkPjJtVPRdKouuMkDXTR4ejlQa8Ks'
  })
}

/**
 * [init Initialise all the data required for running the scenario]
 * @return {[type]} [description]
 */
async function init () {
  Logger.info('Setting up initial data for settlement transfer test')
  try {
    // Logger.info('Initializing settlement models')
    // await initSettlementModels()

    Logger.info('Checking that hub accounts exist')
    await checkHubAccountsExist()

    Logger.info('Initializing participants')
    await initParticipants()
    Logger.info('Initializing participants endpoints')

    await initParticipantEndpoints()
    Logger.info('Initializing participants net debit cap')
    await initNetDebitCapPositionAndLimits()
    Logger.info('Initializing transfers')
    await initTransfers()
  } catch (err) {
    Logger.error(`Error setting up initial settlement data ${err}`)
    process.exit(1)
  }
}

/**
 * [initSettlementModels Initialize the settlement models required for the test]
 * @return {[type]} [description]
 */
async function initSettlementModels () {
  const knex = await Db.getKnex()
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;')
  await Db.settlementModel.truncate()
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;')
  await Api.createSettlementModel(settlementModels[0])
  // await Api.createSettlementModel(settlementModels[1])
}

/**
 * [checkHubAccountsExist Checks that the right hubs exist, if not create them]
 * @return {[type]} [description]
 */
async function checkHubAccountsExist () {
  for (const currency of currencies) {
    const response = await Api.getParticipantAccount(currency)
    let hubReconciliationAccountExists = false
    let hubMLNSAccountExists = false
    if (response && response.length) {
      hubReconciliationAccountExists = response.findIndex(account => {
        return account.ledgerAccountType === 'HUB_RECONCILIATION'
      }) >= 0
      hubMLNSAccountExists = response.findIndex(account => {
        return account.ledgerAccountType === 'HUB_MULTILATERAL_SETTLEMENT'
      }) >= 0
    }

    if (hubReconciliationAccountExists === false) {
      await Api.createParticipantAccount(currency, 'HUB_RECONCILIATION')
    }
    if (hubMLNSAccountExists === false) {
      await Api.createParticipantAccount(currency, 'HUB_MULTILATERAL_SETTLEMENT')
    }
  }
}

/**
 * [initParticipants creates participants for the scenario test]
 * @return {[Promise<void>]} [description]
 */
async function initParticipants () {
  for (const currency of currencies) {
    for (const fsp of fspList) {
      await Api.addParticipant(currency, fsp.fspName)
    }
  }
}

/**
 * [initNetDebitCapPositionAndLimits Initialize participant net debit cap and initial position for each currency]
 * @return {[Promise<void>]} [description]
 */
async function initNetDebitCapPositionAndLimits () {
  for (const currency of currencies) {
    for (const fsp of fspList) {
      await Api.createNetDebitCapInitialPositionAndLimit(fsp.fspName, 0, currency, 1000)
    }
  }
}

/**
 * [initParticipantEndpoints Sets up participant endpoints]
 * @return {[Promise<void>]} [description]
 */
async function initParticipantEndpoints () {
  for (const fsp of fspList) {
    // reaching deadlock if doing promise.all
    await Api.addParticipantEndpoint(fsp.fspName, 'FSPIOP_CALLBACK_URL_TRANSFER_POST', `${fsp.endpointBase}/transfers`)
    await Api.addParticipantEndpoint(fsp.fspName, 'FSPIOP_CALLBACK_URL_TRANSFER_PUT', `${fsp.endpointBase}/transfers/{{transferId}}`)
    await Api.addParticipantEndpoint(fsp.fspName, 'FSPIOP_CALLBACK_URL_TRANSFER_ERROR', `${fsp.endpointBase}/transfers/{{transferId}}/error`)
  }
}

/**
 * [initTransfers Initiailize transfers for the settlement scenario]
 * @return {[Promise<void>]} [description]
 */
async function initTransfers () {
  const SLEEP_MS = 1000
  for (const transfer of transfers) {
    try {
      await Api.sendTransfer(payerFsp, payeeFsp, transfer)
      await Api.waitForTransferToBeCommited(transfer.transferId, SLEEP_MS, 10)
      await transferParticipantStateChangeService.processMsgFulfil(transfer.transferId, 'success')
    } catch (err) {
      Logger.error(`prepareTransferDataTest failed with error - ${err}`)
    }
  }
}

module.exports = {
  currencies,
  init
}
