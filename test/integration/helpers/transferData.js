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
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const TestConfig = require('../../integration-config')
const Logger = require('@mojaloop/central-services-shared').Logger
const fetch = require('node-fetch')
const Uuid = require('uuid4')

const rand8 = () => {
  return Math.floor(Math.random() * 1000000000)
}
const sleep = (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

/**
 * The following services must be running:
 * central-ledger, ml-api-adapter, simulator, mysql, kafka
 */
module.exports = () => {
  Test('PrepareTransferData should', prepareTransferDataTest => {
    const URI_PREFIX = 'http'
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
    const SIMULATOR_CORR_ENDPOINT = '/payeefsp/correlationid'
    const payerFsp = `fsp${rand8()}`
    const payeeFsp = `fsp${rand8()}`
    const fspList = [
      {
        fspName: payerFsp,
        endpointBase: `${URI_PREFIX}://${SIMULATOR_REMOTE_HOST}:${SIMULATOR_REMOTE_PORT}/payerfsp`
      },
      {
        fspName: payeeFsp,
        endpointBase: `${URI_PREFIX}://${SIMULATOR_REMOTE_HOST}:${SIMULATOR_REMOTE_PORT}/payeefsp`
      }
    ]
    const currency = 'USD'
    const transferId = Uuid()
    const transferAmount = (10 + Math.floor(Math.random() * 9000) / 100).toString().substr(0, 5) // transfer amount between 10.00 and 100
    const ilpPacket = 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9'
    const ilpCondition = 'HOr22-H3AfTDHrSkPjJtVPRdKouuMkDXTR4ejlQa8Ks'
    const localEnum = {
      transferStates: {
        COMMITTED: 'COMMITTED'
      }
    }
    const sleepMilliseconds = 750

    let sandbox
    prepareTransferDataTest.beforeEach(test => {
      sandbox = Sinon.createSandbox()
      test.end()
    })
    prepareTransferDataTest.afterEach(test => {
      sandbox.restore()
      test.end()
    })

    prepareTransferDataTest.test('check if Hub accounts exists', async test => {
      try {
        let url = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}/participants/Hub/accounts?currency=${currency}`
        let opts = { method: 'GET' }
        let res = await fetch(url, opts)
        test.equal(res.status, 200, 'returned 200 OK')

        let response = await res.json()
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

        if (hubReconciliationAccountExists) {
          test.pass(`${currency} HUB_RECONCILIATION found`)
        } else {
          try {
            let url = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}/participants/Hub/accounts`
            let headers = {
              'Content-Type': 'application/json'
            }
            let body = {
              currency: 'USD',
              type: 'HUB_RECONCILIATION'
            }
            let opts = {
              method: 'POST',
              headers,
              body: JSON.stringify(body)
            }
            let res = await fetch(url, opts)
            test.equal(res.status, 201, 'returned 201 Created')
          } catch (err) {
            Logger.error(`creating HUB_RECONCILIATION failed with error - ${err}`)
            test.fail()
          }
        }

        if (hubMLNSAccountExists) {
          test.pass(`${currency} HUB_MULTILATERAL_SETTLEMENT found`)
        } else {
          try {
            let url = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}/participants/Hub/accounts`
            let headers = {
              'Content-Type': 'application/json'
            }
            let body = {
              currency: 'USD',
              type: 'HUB_MULTILATERAL_SETTLEMENT'
            }
            let opts = {
              method: 'POST',
              headers,
              body: JSON.stringify(body)
            }
            let res = await fetch(url, opts)
            test.equal(res.status, 201, 'returned 201 Created')
          } catch (err) {
            Logger.error(`creating HUB_MULTILATERAL_SETTLEMENT failed with error - ${err}`)
            test.fail()
          }
        }

        test.end()
      } catch (err) {
        Logger.error(`prepareTransferDataTest failed with error - ${err}`)
        test.fail()
        test.end()
      }
    })

    prepareTransferDataTest.test('add participant and participant account', async test => {
      for (let fsp of fspList) {
        try {
          let url = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}/participants`
          let headers = {
            'Content-Type': 'application/json'
          }
          let body = {
            name: fsp.fspName,
            currency: currency
          }
          let opts = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          }
          let res = await fetch(url, opts)
          test.equal(res.status, 201, `returned 201 Created for ${fsp.fspName}`)
        } catch (err) {
          Logger.error(`prepareTransferDataTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      }
      test.end()
    })

    prepareTransferDataTest.test('add participant account limits', async test => {
      for (let fsp of fspList) {
        try {
          let url = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}/participants/${fsp.fspName}/initialPositionAndLimits`
          let headers = {
            'Content-Type': 'application/json'
          }
          let body = {
            currency: currency,
            limit: {
              type: 'NET_DEBIT_CAP',
              value: 1000
            },
            initialPosition: 0
          }
          let opts = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          }
          let res = await fetch(url, opts)
          test.equal(res.status, 201, `returned 201 created limits for ${fsp.fspName}`)
        } catch (err) {
          Logger.error(`prepareTransferDataTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      }
      test.end()
    })

    prepareTransferDataTest.test('add participant FSPIOP_CALLBACK_URL_TRANSFER_POST endpoint', async test => {
      let headers = {
        'Content-Type': 'application/json'
      }
      for (let fsp of fspList) {
        try {
          let url = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}/participants/${fsp.fspName}/endpoints`
          let body = {
            type: 'FSPIOP_CALLBACK_URL_TRANSFER_POST',
            value: `${fsp.endpointBase}/transfers`
          }
          let opts = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          }
          let res = await fetch(url, opts)
          test.equal(res.status, 201, `returned 201 created endpoint for ${fsp.fspName}`)
        } catch (err) {
          Logger.error(`prepareTransferDataTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      }
      test.end()
    })

    prepareTransferDataTest.test('add participant FSPIOP_CALLBACK_URL_TRANSFER_PUT endpoint', async test => {
      let headers = {
        'Content-Type': 'application/json'
      }
      for (let fsp of fspList) {
        try {
          let url = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}/participants/${fsp.fspName}/endpoints`
          let body = {
            type: 'FSPIOP_CALLBACK_URL_TRANSFER_PUT',
            value: `${fsp.endpointBase}/transfers/{{transferId}}`
          }
          let opts = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          }
          let res = await fetch(url, opts)
          test.equal(res.status, 201, `returned 201 created endpoint for ${fsp.fspName}`)
        } catch (err) {
          Logger.error(`prepareTransferDataTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      }
      test.end()
    })

    prepareTransferDataTest.test('create FSPIOP_CALLBACK_URL_TRANSFER_ERROR endpoint', async test => {
      let headers = {
        'Content-Type': 'application/json'
      }
      for (let fsp of fspList) {
        try {
          let url = `${URI_PREFIX}://${CENTRAL_LEDGER_HOST}:${CENTRAL_LEDGER_PORT}${CENTRAL_LEDGER_BASE}/participants/${fsp.fspName}/endpoints`
          let body = {
            type: 'FSPIOP_CALLBACK_URL_TRANSFER_ERROR',
            value: `${fsp.endpointBase}//transfers/{{transferId}}/error`
          }
          let opts = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          }
          let res = await fetch(url, opts)
          test.equal(res.status, 201, `returned 201 created endpoint for ${fsp.fspName}`)
        } catch (err) {
          Logger.error(`prepareTransferDataTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      }
      test.end()
    })

    prepareTransferDataTest.test(`create a transfer for the amount of ${transferAmount} ${currency}`, async test => {
      let currentDateGMT = new Date().toGMTString()
      let expirationDate = new Date((new Date()).getTime() + (24 * 60 * 60 * 1000))

      let headers = {
        'Accept': 'application/vnd.interoperability.transfers+json;version=1.0',
        'Content-Type': 'application/vnd.interoperability.transfers+json;version=1.0',
        'Date': currentDateGMT,
        'FSPIOP-Source': payerFsp,
        'FSPIOP-Destination': payeeFsp
      }
      let url = `${URI_PREFIX}://${ML_API_ADAPTER_HOST}:${ML_API_ADAPTER_PORT}${ML_API_ADAPTER_BASE}/transfers`
      let body = {
        transferId,
        payerFsp,
        payeeFsp,
        amount: {
          currency,
          amount: transferAmount
        },
        ilpPacket,
        condition: ilpCondition,
        expiration: expirationDate.toISOString(),
        extensionList: {
          extension: [{
            key: 'prepare',
            value: 'description'
          }]
        }
      }
      let opts = {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      }

      let simulatorUrl = `${URI_PREFIX}://${SIMULATOR_HOST}:${SIMULATOR_PORT}${SIMULATOR_CORR_ENDPOINT}/${transferId}`

      try {
        let res = await fetch(url, opts)
        test.equal(res.status, 202, `transfer PREPARE request returned 202 Accepted`)

        let transferCommitted = false
        for (let i = 0; i < 10; i++) {
          let simulatorRes = await fetch(simulatorUrl)
          try {
            let simulatorResponse = await simulatorRes.json()
            if (simulatorResponse && simulatorResponse.transferState === localEnum.transferStates.COMMITTED) {
              transferCommitted = true
              break
            }
          } catch (err) {
            if (err.type === 'invalid-json') {
              Logger.info(`Transfer not processed yet. Awaiting ${sleepMilliseconds} ms...`)
            } else {
              Logger.info(err.message)
              throw err
            }
          }
          await sleep(sleepMilliseconds)
        }
        test.ok(transferCommitted, 'transfer successfully COMMITTED by payee fsp')
        test.end()
      } catch (err) {
        Logger.error(`prepareTransferDataTest failed with error - ${err}`)
        test.fail()
        test.end()
      }
    })

    prepareTransferDataTest.end()
  })
}
