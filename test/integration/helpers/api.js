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
 - Claudio Viola <claudio.viola@modusbox.com>
 --------------
 ******/
'use strict'

const Config = require('../config')
const axios = require('axios')
const Utils = require('./utils')
const Logger = require('@mojaloop/central-services-logger')

async function getParticipantAccount (currency) {
  const url = `${Config.CENTRAL_LEDGER_URL}/participants/Hub/accounts?currency=${currency}`
  const res = await axios.get(url)
  return res.data
}

async function createParticipantAccount (currency, type) {
  const url = `${Config.CENTRAL_LEDGER_URL}/participants/Hub/accounts`
  const body = {
    currency,
    type
  }
  return axios.post(url, body)
}

async function addParticipant (currency, fspName) {
  const url = `${Config.CENTRAL_LEDGER_URL}/participants`
  return axios.post(url, {
    name: fspName,
    currency
  })
}

async function addParticipantEndpoint (participant, endpointType, endpoint) {
  const url = `${Config.CENTRAL_LEDGER_URL}/participants/${participant}/endpoints`
  const body = {
    type: endpointType,
    value: endpoint
  }
  return axios.post(url, body)
}

async function createNetDebitCapInitialPositionAndLimit (participant, initialPosition, currency, limitValue) {
  const url = `${Config.CENTRAL_LEDGER_URL}/participants/${participant}/initialPositionAndLimits`
  return axios.post(url, {
    currency,
    limit: {
      type: 'NET_DEBIT_CAP',
      value: limitValue
    },
    initialPosition: initialPosition
  })
}

async function sendTransfer (payerFsp, payeeFsp, transfer) {
  const url = `${Config.ML_API_ADAPTER_URL}/transfers`
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
  return axios.post(url, body, {
    headers: headers
  })
}

async function waitForTransferToBeCommited (transferId, sleepMs, iterations) {
  const localEnum = {
    transferStates: {
      COMMITTED: 'COMMITTED'
    }
  }
  const url = `${Config.SIMULATOR_HOST_URL}/${transferId}`
  for (let i = 0; i < iterations; i++) {
    Logger.info(`Waiting for transfer ${transferId} to be committed...`)
    try {
      const simulatorResponse = await axios.get(url)
      if (simulatorResponse.data && simulatorResponse.data.transferState === localEnum.transferStates.COMMITTED) {
        return
      }
    } catch (err) {
      if (err.type === 'invalid-json') {
        Logger.info(`Transfer not processed yet. Awaiting ${sleepMs} ms...`)
      } else {
        Logger.info(err.message)
        throw err
      }
    }
    await Utils.sleep(sleepMs)
  }
  throw new Error('Transfer did not commit in time')
}

module.exports = {
  addParticipant,
  addParticipantEndpoint,
  createNetDebitCapInitialPositionAndLimit,
  createParticipantAccount,
  getParticipantAccount,
  sendTransfer,
  waitForTransferToBeCommited
}
