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

 * Coil
 * Jason Bruwer <jason.bruwer@coil.com>

 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))

const Tb = require('../../../src/lib/tb')
const Config = require('../../../src/lib/config')

const path = require('path')
const os = require('os')
const fs = require('fs')

const Sinon = require('sinon')
const P = require('bluebird')

const { GenericContainer, Wait } = require('testcontainers')

const TIGERBEETLE_IMAGE = 'ghcr.io/coilhq/tigerbeetle@sha256:c312832a460e7374bcbd4bd4a5ae79b8762f73df6363c9c8106c76d864e21303'
const TIGERBEETLE_CONTAINER_LOG = true
const TIGERBEETLE_DIR = '/var/lib/tigerbeetle'
const TIGERBEETLE_PORT = 5001
const TIGERBEETLE_CLUSTER = 1

// TEST DATA:
const settlementAccounts = [
  { participantCurrencyId: 1 },
  { participantCurrencyId: 2 },
  { participantCurrencyId: 3 },
  { participantCurrencyId: 4 }
]

const accountType = 2 // Settlement
const currencyZar = 'ZAR'
const currencyUsd = 'USD'

const enums = {
  ledgerAccountTypes: {
    POSITION: 1,
    SETTLEMENT: 2,
    HUB_RECONCILIATION: 3,
    HUB_MULTILATERAL_SETTLEMENT: 4,
    HUB_FEE: 5
  }
}


Test('TigerBeetle Test', async (tigerBeetleTest) => {

  // Test Defaults for TIGERBEETLE configs
  tigerBeetleTest.ok(Config.TIGERBEETLE !== undefined)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.enabled, false)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.enableMockBeetle, false)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.enableBatching, false)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.disableSQL, false)
  tigerBeetleTest.ok(Config.TIGERBEETLE.batchMaxSize < 10_000)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.cluster, 0)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint01, 5001)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint02, 5002)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint03, 5003)
  tigerBeetleTest.deepEqual(Config.HUB_ID, 1)

  let sandbox

  /* tigerBeetleTest.beforeAll(cppl => {
    console.log('cool')
  }) */

  tigerBeetleTest.beforeEach(test => {
    Config.TIGERBEETLE.enabled = true
    Config.TIGERBEETLE.enableMockBeetle = true
    Config.TIGERBEETLE.cluster = TIGERBEETLE_CLUSTER
    sandbox = Sinon.createSandbox()
    // TODO sandbox.stub(Tb.tbCachedClient, 'constructor').returns(P.resolve())
    // TODO sandbox.stub(Tb.tbCachedClient, 'tbCreateSettlementHubAccount').returns(P.resolve())
    // TODO sandbox.stub(Tb.tbCachedClient, 'createClient').returns(P.resolve())
    // TODO sandbox.stub(Tb.tbCachedClient, 'disconnect').returns(P.resolve())
    test.end()
  })

  tigerBeetleTest.afterEach(test => {
    Config.TIGERBEETLE.enabled = false
    Config.TIGERBEETLE.enableMockBeetle = false
    test.end()
  })

  const hubId = Config.HUB_ID
  tigerBeetleTest.ok((typeof hubId) !== undefined && hubId > 0)

  // Test Obtain TB client while being disabled:
  tigerBeetleTest.test('tigerbeetle client', async function (testCreateAccounts) {
    testCreateAccounts.test('error when disabled', async (test) => {
      test.deepEqual(Config.TIGERBEETLE.enabled, true)
      Config.TIGERBEETLE.enabled = false
      try {
        await Tb.tbCreateSettlementHubAccount(hubId)
        test.fail('Expected an error')
      } catch (any) {
        test.deepEqual(any.message, 'TB-Client is not enabled.', 'Disable message is not valid.')
      }
      test.end()
    })
    testCreateAccounts.end()
  })

  // Test Account Create:
  tigerBeetleTest.test('create accounts', async function (testCreateAccounts) {
    testCreateAccounts.deepEqual(Config.TIGERBEETLE.enabled, true)
    testCreateAccounts.test('create and lookup hub account', async (test) => {
      test.deepEqual(Config.TIGERBEETLE.enabled, true)
      const tigerBeetleContainer = await startTigerBeetleContainer(TIGERBEETLE_CLUSTER)
      try {
        const result = await Tb.tbCreateSettlementHubAccount(hubId, accountType, currencyUsd)
        test.deepEqual(result.length, 0)
        const lookupResult = await Tb.tbLookupHubAccount(
          hubId,
          accountType,
          currencyUsd
        )
        test.deepEqual(lookupResult.code, accountType)
        test.deepEqual(lookupResult.ledger, 840)
      } catch (any) {
        test.fail(`Unable to create settlement accounts [${hubId}:${any.message}].`)
      }
      await Tb.tbDestroy()
      await tigerBeetleContainer.stop()
      test.end()
    })

    testCreateAccounts.test('create settlement account', async (test) => {
      test.deepEqual(Config.TIGERBEETLE.enabled, true)

      try {
        const result = await Tb.tbCreateSettlementAccounts(
          settlementAccounts,
          1, // Settlement Id
          accountType, // Account Type
          currencyZar,
          false // Debits may exceed credits
        )
        test.deepEqual(result.length, 0)
      } catch (any) {
        test.fail(`Unable to create settlement accounts [${hubId}:${any.message}].`)
      }
      await Tb.tbDestroy()
      test.end()
    })
    testCreateAccounts.end()
  })

  // Test Settlement Transfers Create:
  tigerBeetleTest.test('create settlement transfers', async function (testCreateTransfers) {
    testCreateTransfers.test('create full settlement cycle', async (test) => {
      try {
        const resultHubAcc = await Tb.tbCreateSettlementHubAccount(hubId, accountType, currencyUsd)
        test.deepEqual(resultHubAcc.length, 0)
        const settlementId = 1
        const result = await Tb.tbCreateSettlementAccounts(
            settlementAccounts,
            settlementId, // Settlement Id
            accountType, // Account Type
            currencyUsd,
            false // Debits may exceed credits
        )
        test.deepEqual(result.length, 0)

        const txnIdSettlement = 'e1e4a5e5-1cef-4541-8186-a184873b7390'
        const orgTransferId = 'e1e4a5e5-1cef-4541-8186-a184873b7310'
        const hubAccount = 1, hubMultilateral = 2, recon = 3, participantCurrencyId = 50
        const amount = 5000

        // Prepare transfer to create settlement obligation:
        const resultPrepare = await Tb.tbSettlementPreparationTransfer(
            enums,
            txnIdSettlement,
            orgTransferId,
            settlementId,
            hubAccount,
            hubMultilateral,
            participantCurrencyId,
            currencyUsd,
            amount
        )
        test.deepEqual(resultPrepare.length, 0)

        // Reserve the settlement as payee:
        const resultReserve = await Tb.tbSettlementTransferReserve(
            enums,
            txnIdSettlement,
            settlementId,
            participantCurrencyId,
            hubMultilateral,
            recon,
            currencyUsd,
            amount
        )
        test.deepEqual(resultReserve.length, 0)

        // Commit the settlement as payer:
        const resultCommit = await Tb.tbSettlementTransferCommit(txnIdSettlement, settlementId)
        test.deepEqual(resultCommit.length, 0)

      } catch (any) {
        test.fail(`Unable to complete settlement transfer cycle [${hubId}:${any.message}].`)
      }
      await Tb.tbDestroy()
      test.end()
    })
    testCreateTransfers.end()
  })

  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.enabled, false)
  tigerBeetleTest.end()
})

const startTigerBeetleContainer = async (clusterId = 1) => {
  const tigerBeetleDirSrc = fs.mkdtempSync(path.join(os.tmpdir(), 'tigerbeetle-'))

  const tbContFormat = await new GenericContainer(TIGERBEETLE_IMAGE)
    .withExposedPorts(TIGERBEETLE_PORT)
    .withBindMount(tigerBeetleDirSrc, TIGERBEETLE_DIR)
    .withPrivilegedMode()
    .withCmd([
      'init',
      '--cluster=' + clusterId,
      '--replica=0',
      '--directory=' + TIGERBEETLE_DIR
    ])
    .withWaitStrategy(Wait.forLogMessage(/initialized data file/))
    .start()

  const streamTbFormat = await tbContFormat.logs()
  if (TIGERBEETLE_CONTAINER_LOG) {
    streamTbFormat
      .on('data', (line) => console.log(line))
      .on('err', (line) => console.error(line))
      .on('end', () => console.log('Stream closed for [tb-format]'))
  }

  // Give TB a chance to startup (no message currently to notify allocation is complete):
  await new Promise((f) => setTimeout(f, 1000))
  await tbContFormat.stop()

  const tbContStart = await new GenericContainer(TIGERBEETLE_IMAGE)
    .withExposedPorts(TIGERBEETLE_PORT)
    .withBindMount(tigerBeetleDirSrc, TIGERBEETLE_DIR)
    .withPrivilegedMode()
    .withCmd([
      'start',
      '--cluster=' + clusterId,
      '--replica=0',
      '--addresses=0.0.0.0:' + TIGERBEETLE_PORT,
      '--directory=' + TIGERBEETLE_DIR
    ])
    .withWaitStrategy(Wait.forLogMessage(/listening on/))
    .start()
  const streamTbStart = await tbContStart.logs()

  if (TIGERBEETLE_CONTAINER_LOG) {
    streamTbStart
      .on('data', (line) => console.log(line))
      .on('err', (line) => console.error(line))
      .on('end', () => console.log('Stream closed for [running-tb-cluster]'))
  }
  await new Promise((f) => setTimeout(f, 2000))
  return tbContStart
}
