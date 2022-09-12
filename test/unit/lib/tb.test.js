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
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.enableBatching, false)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.disableSQL, false)
  tigerBeetleTest.ok(Config.TIGERBEETLE.batchMaxSize < 10_000)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.cluster, 1)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint01, 5001)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint02, 5002)
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint03, 5003)
  tigerBeetleTest.deepEqual(Config.HUB_ID, 1)

  tigerBeetleTest.beforeEach(test => {
    Config.TIGERBEETLE.enabled = true
    Config.TIGERBEETLE.cluster = TIGERBEETLE_CLUSTER
    test.end()
  })

  tigerBeetleTest.afterEach(test => {
    Config.TIGERBEETLE.enabled = false
    test.end()
  })

  const hubId = Config.HUB_ID
  tigerBeetleTest.ok((typeof hubId) !== 'undefined' && hubId > 0)

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

  // Test Settlement Account create and Settlement Transfers:
  tigerBeetleTest.test('create settlement accounts, transfers and abort', async function (testCreateTransfers) {
    testCreateTransfers.deepEqual(Config.TIGERBEETLE.enabled, true)

    testCreateTransfers.test('create full settlement cycle', async (test) => {
      const tigerBeetleContainer = await startTigerBeetleContainer(TIGERBEETLE_CLUSTER)
      try {
        const resultHubAcc = await Tb.tbCreateSettlementHubAccount(hubId, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, currencyUsd)
        test.deepEqual(resultHubAcc.length, 0)
        const hubAccLookedUp = await Tb.tbLookupHubAccount(hubId, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, currencyUsd)
        test.ok(hubAccLookedUp.id > 0)
        test.deepEqual(hubAccLookedUp.code, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT)
        test.deepEqual(hubAccLookedUp.ledger, 840)

        const resultReconAcc = await Tb.tbCreateSettlementHubAccount(hubId, enums.ledgerAccountTypes.HUB_RECONCILIATION, currencyUsd)
        test.deepEqual(resultReconAcc.length, 0)
        const reconAccLookedUp = await Tb.tbLookupHubAccount(hubId, enums.ledgerAccountTypes.HUB_RECONCILIATION, currencyUsd)
        test.ok(reconAccLookedUp.id > 0)
        test.deepEqual(reconAccLookedUp.code, enums.ledgerAccountTypes.HUB_RECONCILIATION)
        test.deepEqual(reconAccLookedUp.ledger, 840)

        const settlementId = 1
        const result = await Tb.tbCreateSettlementAccounts(
          enums,
          settlementAccounts,
          settlementId, // Settlement Id
          currencyUsd,
          false // Debits may exceed credits
        )
        test.deepEqual(result.length, 0)

        const settlementAcc1LookedUp = await Tb.tbLookupSettlementAccount(
          settlementAccounts[0].participantCurrencyId,
          settlementId
        )
        test.ok(settlementAcc1LookedUp.id > 0)

        let txnIdSettlement = 'e1e4a5e5-1cef-4541-8186-a184873b7390'
        let orgTransferId = 'e1e4a5e5-1cef-4541-8186-a184873b7310'
        let amount = 5000

        // Prepare transfer to create settlement obligation:
        const resultPrepare = await Tb.tbSettlementPreparationTransfer(
          enums,
          txnIdSettlement,
          orgTransferId,
          settlementId,
          hubAccLookedUp.id,
          reconAccLookedUp.id,
          settlementAccounts[0].participantCurrencyId,
          currencyUsd,
          amount
        )
        test.deepEqual(resultPrepare.length, 0)

        // Reserve the settlement as payee:
        const resultReserve = await Tb.tbSettlementTransferReserve(
          enums,
          txnIdSettlement,
          settlementId,
          settlementAccounts[0].participantCurrencyId,
          hubAccLookedUp.id,
          reconAccLookedUp.id,
          currencyUsd,
          amount
        )
        test.deepEqual(resultReserve.length, 0)

        // Commit the settlement as payer:
        const resultCommit = await Tb.tbSettlementTransferCommit(txnIdSettlement, settlementId)
        test.deepEqual(resultCommit.length, 0)

        // Not allowed to abort an already committed settlement:
        const resultCommitAbort = await Tb.tbSettlementTransferAbort(txnIdSettlement, settlementId)
        test.deepEqual(resultCommitAbort.length, 2)

        // Abort a new settlement:
        txnIdSettlement = 'e1e4a5e5-1cef-4541-8186-a184873b7391'
        orgTransferId = 'e1e4a5e5-1cef-4541-8186-a184873b7311'
        amount = 5000

        const resultPrepareForAbort = await Tb.tbSettlementPreparationTransfer(
          enums,
          txnIdSettlement,
          orgTransferId,
          settlementId,
          hubAccLookedUp.id,
          reconAccLookedUp.id,
          settlementAccounts[0].participantCurrencyId,
          currencyUsd,
          amount
        )
        test.deepEqual(resultPrepareForAbort.length, 0)

        const resultReserveForAbort = await Tb.tbSettlementTransferReserve(
          enums,
          txnIdSettlement,
          settlementId,
          settlementAccounts[0].participantCurrencyId,
          hubAccLookedUp.id,
          reconAccLookedUp.id,
          currencyUsd,
          amount
        )
        test.deepEqual(resultReserveForAbort.length, 0)

        const resultAbort = await Tb.tbSettlementTransferAbort(txnIdSettlement, settlementId)
        test.deepEqual(resultAbort.length, 0)
      } catch (any) {
        console.error(any)
        test.fail(`Unable to complete settlement transfer cycle [${hubId}:${any.message}].`)
      }
      await Tb.tbDestroy()
      await tigerBeetleContainer.stop()
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
  setTimeout(() => {}, 1000)
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

  Config.TIGERBEETLE.replicaEndpoint01 = tbContStart.getMappedPort(TIGERBEETLE_PORT)

  setTimeout(() => {}, 2000)
  return tbContStart
}
