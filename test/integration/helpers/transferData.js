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
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const TestConfig = require('../../integration-config')
const Logger = require('@mojaloop/central-services-logger')
const Uuid = require('uuid4')
const transferParticipantStateChangeService = require('../../../src/domain/transferParticipantStateChange')
const SettlementModelModel = require('../../../src/models/settlement/settlementModel')
const Models = require('./models')

const Db = require('../../../src/lib/db')
const axios = require('axios');
const utils = require('./utils');

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
const URI_PREFIX = 'http'
const SIMULATOR_CORR_ENDPOINT = '/payeefsp/correlationid'
const CENTRAL_LEDGER_HOST = TestConfig.CENTRAL_LEDGER_HOST
const CENTRAL_LEDGER_PORT = TestConfig.CENTRAL_LEDGER_PORT
const CENTRAL_LEDGER_BASE = ''
const ML_API_ADAPTER_HOST = TestConfig.ML_API_ADAPTER_HOST
const ML_API_ADAPTER_PORT = TestConfig.ML_API_ADAPTER_PORT
const ML_API_ADAPTER_BASE = ''
const SIMULATOR_REMOTE_HOST = TestConfig.SIMULATOR_REMOTE_HOST
const SIMULATOR_REMOTE_PORT = TestConfig.SIMULATOR_REMOTE_PORT
const SIMULATOR_HOST = TestConfig.SIMULATOR_HOST
const SIMULATOR_PORT = TestConfig.SIMULATOR_PORT
const CENTRAL_LEDGER_URL = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}`
const SIMULATOR_URL = `${URI_PREFIX}://${SIMULATOR_REMOTE_HOST}:${SIMULATOR_REMOTE_PORT}`
const ML_API_ADAPTER_URL = `${URI_PREFIX}://${ML_API_ADAPTER_HOST}:${ML_API_ADAPTER_PORT}${ML_API_ADAPTER_BASE}`
const SIMULATOR_HOST_URL = `${URI_PREFIX}://${SIMULATOR_HOST}:${SIMULATOR_PORT}${SIMULATOR_CORR_ENDPOINT}`

const localEnum = {
  transferStates: {
    COMMITTED: 'COMMITTED'
  }
}
const SLEEP_MS = 1000
const payerFsp = `fsp${utils.rand8()}`
const payeeFsp = `fsp${utils.rand8()}`
const fspList = [
  {
    fspName: payerFsp,
    endpointBase: `${SIMULATOR_URL}/payerfsp`
  },
  {
    fspName: payeeFsp,
    endpointBase: `${SIMULATOR_URL}/payeefsp`
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
    ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
    ilpCondition: 'HOr22-H3AfTDHrSkPjJtVPRdKouuMkDXTR4ejlQa8Ks'
  })
}

async function createSettlementModel (settlementModel) {
  return Models.settlementModel.create(settlementModel)
}

async function getParticipantAccount (currency) {
  const url = `${CENTRAL_LEDGER_URL}/participants/Hub/accounts?currency=${currency}`;
  const res = await axios.get(url);
  return res.data;
}

async function createParticipantAccount(currency, type) {
  return axios.post(url, body);
}

async function addParticipant(currency, fspName) {
  const url = `${CENTRAL_LEDGER_URL}/participants`
  return axios.post(url,{
    name: fspName,
    currency
  })
}

async function sendTransfer(payerFsp, payeeFsp, transfer) {
  const url = `${ML_API_ADAPTER_URL}/transfers`
  const currentDateGMT = new Date().toGMTString()
  const expirationDate = new Date((new Date()).getTime() + (24 * 60 * 60 * 1000))

  const headers = {
    Accept: 'application/vnd.interoperability.transfers+json;version=1.0',
    'Content-Type': 'application/vnd.interoperability.transfers+json;version=1.0',
    Date: currentDateGMT,
    'FSPIOP-Source': payerFsp,
    'FSPIOP-Destination': payeeFsp
  }
  const body = {
    transferId: transfer.transferId,
    payerFsp,
    payeeFsp,
    amount: transfer.amount,
    ilpPacket: transfer.ilpPacket,
    condition: transfer.ilpCondition,
    expiration: expirationDate.toISOString(),
    extensionList: {
      extension: [{
        key: 'prepare',
        value: 'description'
      }]
    }
  }
  const res = await axios.post(url, body, {
    headers: headers
  })
}

async function init () {
  Logger.info('SETTING UP');
  try {
   Logger.info('Initializing settlement models');
   await initSettlementModels();

   Logger.info('Checking hub accounts exist');
   await checkHubAccountsExist();

   Logger.info('init participants');
   await initParticipants();
   Logger.info('init participants endpoints');

   await initParticipantEndpoints();
   Logger.info('init debit cap');
   await initNetDebitCapPositionAndLimits();
   Logger.info('init transfers');
   await initTransfers();
  }
  catch (err) {
    Logger.error('Error setting up initial settlement data');
  }
}

async function initSettlementModels() {
  // await Db.connect(Config.DATABASE)
  const knex = await Db.getKnex()
  const raw = await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  await Db.settlementModel.truncate();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
  await knex.batchInsert('settlementModel', settlementModels);
  // await Db.disconnect();
}
async function checkHubAccountsExist() {
  for (const currency of currencies) {
      const response = await getParticipantAccount(currency);
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
        await createParticipantAccount(currency, 'HUB_RECONCILIATION')
      }
      if (hubMLNSAccountExists  === false) {
       await createParticipantAccount(currency, 'HUB_MULTILATERAL_SETTLEMENT')
      }
    }
}

async function initParticipants() {
  const promises = []
  for (const currency of currencies) {
    for (const fsp of fspList) {
      // promises.push(addParticipant(currency, fsp.fspName));
      await addParticipant(currency, fsp.fspName);

    }
  }
  // await Promise.all(promises);
}


async function initNetDebitCapPositionAndLimits() {
  for (const currency of currencies) {
    for (const fsp of fspList) {
      await createNetDebitCapInitialPositionAndLimit(fsp.fspName, 0 , currency, 1000)
    }
  }
}

async function createNetDebitCapInitialPositionAndLimit(participant, initialPosition, currency, limitValue) {
  const url = `${CENTRAL_LEDGER_URL}/participants/${participant}/initialPositionAndLimits`

  return axios.post(url, {
    currency,
    limit: {
      type: 'NET_DEBIT_CAP',
      value: limitValue //1000
    },
    initialPosition: initialPosition //0
  })
}

async function initParticipantEndpoints() {
  try {
    for (const fsp of fspList) {
      // deadlock if doing all at the same time..
      await addParticipantEndpoint(fsp.fspName, 'FSPIOP_CALLBACK_URL_TRANSFER_POST', `${fsp.endpointBase}/transfers`)
      await addParticipantEndpoint(fsp.fspName, 'FSPIOP_CALLBACK_URL_TRANSFER_PUT', `${fsp.endpointBase}/transfers/{{transferId}}`)
      await addParticipantEndpoint(fsp.fspName, 'FSPIOP_CALLBACK_URL_TRANSFER_ERROR', `${fsp.endpointBase}/transfers/{{transferId}}/error`)
    }
  }
  catch (err) {
    console.log('err', err.response.data);
  }
}


async function addParticipantEndpoint(participant, endpointType, endpoint) {
  const url = `${CENTRAL_LEDGER_URL}/participants/${participant}/endpoints`
  const body = {
    type: endpointType,
    value: endpoint
  }
  const res = await axios.post(url, body)
}

async function initTransfers() {
  for (const transfer of transfers) {
      try {
        const res = await sendTransfer(payerFsp, payeeFsp, transfer)
        await waitForTransferToBeCommited(transfer.transferId, SLEEP_MS);
      } catch (err) {
        Logger.error(`prepareTransferDataTest failed with error - ${err}`)
      }
    }
}


async function waitForTransferToBeCommited(transferId, sleepMs) {
  return new Promise(async (resolve , reject ) => {
    const url = `${SIMULATOR_HOST_URL}/${transferId}`
    for (let i = 0; i < 10; i++) {

      try {
        const simulatorResponse = await axios.get(url);
        if (simulatorResponse.data && simulatorResponse.data.transferState === localEnum.transferStates.COMMITTED) {
          await transferParticipantStateChangeService.processMsgFulfil(transferId, 'success', [])
          resolve();
        }
      } catch (err) {
        if (err.type === 'invalid-json') {
          Logger.info(`Transfer not processed yet. Awaiting ${sleepMs} ms...`)
        } else {
          Logger.info(err.message)
          reject(err);
        }
      }
      await utils.sleep(sleepMs)
    }
    reject('Transfer did not commit in time');
  });

}
/**
 * The following services must be running:
 * central-ledger, ml-api-adapter, simulator, mysql, kafka
 */
module.exports = {
  currencies,
  createSettlementModel,
  init,
}
