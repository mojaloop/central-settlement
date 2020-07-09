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
const transferParticipantStateChangeService = require('../../../src/domain/transferParticipantStateChange')
const Api = require('../helpers/api')
const Db = require('../../../src/lib/db')
const Utils = require('../helpers/utils')

const currencies = ['USD', 'TZS']

const settlementModels = [
  {
    name: 'DEFERRED_NET',
    settlementGranularityId: 2, // NET
    settlementInterchangeId: 2, // MULTILATERAL
    settlementDelayId: 2, // DEFERRED
    ledgerAccountTypeId: 1, // POSITION
    autoPositionReset: true,
    currencyId: null
  },
  {
    name: 'DEFERRED_NET_USD',
    settlementGranularityId: 2, // NET
    settlementInterchangeId: 2, // MULTILATERAL
    settlementDelayId: 2, // DEFERRED
    ledgerAccountTypeId: 1, // POSITION
    autoPositionReset: true,
    currencyId: 'USD'
  }
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
    ilpPacket: 'AYIC9AAAAAAAABdwHWcucGF5ZWVmc3AubXNpc2RuLjIyNTU2OTk5MTI1ggLKZXlKMGNtRnVjMkZqZEdsdmJrbGtJam9pTXpFek16SmtNamN0TnpRM1lpMDBPVGs1TFRnd09USXROak01T1dJM1pEa3hZakU0SWl3aWNYVnZkR1ZKWkNJNkltUTVZVEZqT1RWa0xUUmxaall0TkdFeU5DMWhObU5pTFdJek5HSTFPRFEzT1RNeU1pSXNJbkJoZVdWbElqcDdJbkJoY25SNVNXUkpibVp2SWpwN0luQmhjblI1U1dSVWVYQmxJam9pVFZOSlUwUk9JaXdpY0dGeWRIbEpaR1Z1ZEdsbWFXVnlJam9pTWpJMU5UWTVPVGt4TWpVaUxDSm1jM0JKWkNJNkluQmhlV1ZsWm5Od0luMTlMQ0p3WVhsbGNpSTZleUp3WVhKMGVVbGtTVzVtYnlJNmV5SndZWEowZVVsa1ZIbHdaU0k2SWsxVFNWTkVUaUlzSW5CaGNuUjVTV1JsYm5ScFptbGxjaUk2SWpJeU5UQTNNREE0TVRneElpd2labk53U1dRaU9pSndZWGxsY21aemNDSjlMQ0p3WlhKemIyNWhiRWx1Wm04aU9uc2lZMjl0Y0d4bGVFNWhiV1VpT25zaVptbHljM1JPWVcxbElqb2lUV0YwY3lJc0lteGhjM1JPWVcxbElqb2lTR0ZuYldGdUluMHNJbVJoZEdWUFprSnBjblJvSWpvaU1UazRNeTB4TUMweU5TSjlmU3dpWVcxdmRXNTBJanA3SW1GdGIzVnVkQ0k2SWpZd0lpd2lZM1Z5Y21WdVkza2lPaUpWVTBRaWZTd2lkSEpoYm5OaFkzUnBiMjVVZVhCbElqcDdJbk5qWlc1aGNtbHZJam9pVkZKQlRsTkdSVklpTENKcGJtbDBhV0YwYjNJaU9pSlFRVmxGVWlJc0ltbHVhWFJwWVhSdmNsUjVjR1VpT2lKRFQwNVRWVTFGVWlKOWZRAA',
    ilpCondition: 'u1cSTBLEZ03awvrLHWaQjCnd3GAB9_17Y2WhGdvepjk'
  })
}

/**
 * [init Initialise all the data required for running the scenario]
 * @return {[type]} [description]
 */
async function init () {
  Logger.info('Setting up initial data for settlement transfer test')
  try {
    Logger.info('Initializing settlement models')
    await initSettlementModels()

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
  await knex.batchInsert('settlementModel', settlementModels)
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
      await transferParticipantStateChangeService.processMsgFulfil(transfer.transferId, 'success', [])
    } catch (err) {
      Logger.error(`prepareTransferDataTest failed with error - ${err}`)
    }
  }
}

module.exports = {
  currencies,
  init
}
