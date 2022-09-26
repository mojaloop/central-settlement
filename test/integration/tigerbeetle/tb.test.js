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
// TODO const { startTigerBeetleContainer } = require('../../util')
const Sinon = require('sinon')

const TIGERBEETLE_CLUSTER = 1

// TEST DATA:
const settlementAccounts = [
  { participantCurrencyId: 1 },
  { participantCurrencyId: 2 },
  { participantCurrencyId: 3 },
  { participantCurrencyId: 4 }
]

const currencyUsd = 'USD'
const currencyZar = 'ZAR'

const enums = {
  ledgerAccountTypes: {
    POSITION: 1,
    SETTLEMENT: 2,
    HUB_RECONCILIATION: 3,
    HUB_MULTILATERAL_SETTLEMENT: 4,
    HUB_FEE: 5
  }
}

Test('TigerBeetle - ', async (tigerBeetleTest) => {
  // Test Defaults for TIGERBEETLE configs
  tigerBeetleTest.ok(Config.TIGERBEETLE !== undefined, 'config [TIGERBEETLE] not undefined')
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.enabled, false, 'tigerbeetle enabled')
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.enableBatching, false, 'batching not enabled')
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.disableSQL, false, 'sql not disabled')
  tigerBeetleTest.ok(Config.TIGERBEETLE.batchMaxSize < 10_000, 'batches less than 10k')
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.cluster, 1, 'cluster value [1]')
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint01, 5001, 'first replicate port')
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint02, 5002, 'second replicate port')
  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.replicaEndpoint03, 5003, 'third replicate port')
  tigerBeetleTest.deepEqual(Config.HUB_ID, 1, 'hub account id is [1]')

  let sandbox
  tigerBeetleTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    Config.TIGERBEETLE.enabled = true
    Config.TIGERBEETLE.cluster = TIGERBEETLE_CLUSTER
    test.end()
  })

  tigerBeetleTest.afterEach(test => {
    sandbox.restore()
    Config.TIGERBEETLE.enabled = false
    test.end()
  })

  const hubId = Config.HUB_ID
  tigerBeetleTest.ok((typeof hubId) !== 'undefined' && hubId > 0)

  // Test Obtain TB client while being disabled:
  tigerBeetleTest.test('tigerbeetle client', async function (testCreateAccounts) {
    testCreateAccounts.test('error when disabled', async (test) => {
      test.deepEqual(Config.TIGERBEETLE.enabled, true, 'tigerbeetle enabled')
      Config.TIGERBEETLE.enabled = false
      try {
        await Tb.tbCreateSettlementHubAccount(hubId)
        test.fail('Expected an error')
      } catch (any) {
        test.deepEqual(any.message, 'TB-Client is not enabled.', 'tigerbeetle not enabled')
      }
      test.end()
    })
    testCreateAccounts.end()
  })

  // Test Settlement Account create and Settlement Transfers:
  tigerBeetleTest.test('create settlement accounts, transfers and abort', async function (testCreateTransfers) {
    testCreateTransfers.deepEqual(Config.TIGERBEETLE.enabled, true, 'tigerbeetle enabled')

    testCreateTransfers.test('create full settlement cycle', async (test) => {
      // TODO const tigerBeetleContainer = await startTigerBeetleContainer(TIGERBEETLE_CLUSTER)
      try {
        const resultHubAcc = await Tb.tbCreateSettlementHubAccount(hubId, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, currencyUsd)
        test.deepEqual(resultHubAcc.length, 0, `create multilateral account for hub currency [${currencyUsd}]`)
        const hubAccLookedUp = await Tb.tbLookupHubAccount(hubId, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, currencyUsd)
        test.ok(hubAccLookedUp.id > 0, 'usd: hub multilateral account lookup successful')
        test.deepEqual(hubAccLookedUp.code, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, 'usd: account multilateral code match')
        test.deepEqual(hubAccLookedUp.ledger, 840, 'usd: currency for multilateral lookup match')

        const resultReconAcc = await Tb.tbCreateSettlementHubAccount(hubId, enums.ledgerAccountTypes.HUB_RECONCILIATION, currencyUsd)
        test.deepEqual(resultReconAcc.length, 0, `create recon account for hub currency [${currencyUsd}]`)
        const reconAccLookedUp = await Tb.tbLookupHubAccount(hubId, enums.ledgerAccountTypes.HUB_RECONCILIATION, currencyUsd)
        test.ok(reconAccLookedUp.id > 0, 'hub recon account lookup successful')
        test.deepEqual(reconAccLookedUp.code, enums.ledgerAccountTypes.HUB_RECONCILIATION, 'account recon code match')
        test.deepEqual(reconAccLookedUp.ledger, 840, 'currency for recon lookup match')

        // Make use of the combined service:
        const combinedCreateAnother = await Tb.tbLookupCreateSettlementHubAccount(hubId, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, currencyZar)
        test.ok(combinedCreateAnother.id > 0, 'usd: hub multilateral account lookup successful')
        test.deepEqual(combinedCreateAnother.code, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, 'usd: account multilateral code match')
        test.deepEqual(combinedCreateAnother.ledger, 710, 'usd: currency for multilateral lookup match')

        const combinedCreateAnotherLookup = await Tb.tbLookupCreateSettlementHubAccount(hubId, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, currencyZar)
        test.ok(combinedCreateAnotherLookup.id > 0, '2nd-usd: hub multilateral account lookup successful')
        test.deepEqual(combinedCreateAnotherLookup.code, enums.ledgerAccountTypes.HUB_MULTILATERAL_SETTLEMENT, '2nd-usd: account multilateral code match')
        test.deepEqual(combinedCreateAnotherLookup.ledger, 710, '2nd-usd: currency for multilateral lookup match')

        // Create Settlement accounts:
        const settlementId = 1
        const result = await Tb.tbCreateSettlementAccounts(
          enums,
          settlementAccounts,
          settlementId, // Settlement Id
          currencyUsd,
          false // Debits may exceed credits
        )
        test.deepEqual(result.length, 0, `${settlementAccounts.length} accounts created`)

        const settlementAcc1LookedUp = await Tb.tbLookupSettlementAccount(
          settlementAccounts[0].participantCurrencyId,
          settlementId
        )
        test.ok(settlementAcc1LookedUp.id > 0, 'first account lookup successful')

        let txnIdSettlement = 'e1e4a5e5-1cef-4541-8186-a184873b7390' // from API
        let orgTransferId = 'e1e4a5e5-1cef-4541-8186-a184873b7310' // obtained from CL lookup
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
        test.deepEqual(resultPrepare.length, 0, 'settlement obligation created')

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
        test.deepEqual(resultReserve.length, 0, 'settlement payee reservation')

        // Commit the settlement as payer:
        const resultCommit = await Tb.tbSettlementTransferCommit(txnIdSettlement, settlementId)
        test.deepEqual(resultCommit.length, 0, 'settlement payer completed, settlement committed')

        // Not allowed to abort an already committed settlement:
        const resultCommitAbort = await Tb.tbSettlementTransferAbort(txnIdSettlement, settlementId)
        test.deepEqual(resultCommitAbort.length, 2, 'not able to abort a committed settlement')

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
        test.deepEqual(resultPrepareForAbort.length, 0, 'abort: settlement obligation')

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
        test.deepEqual(resultReserveForAbort.length, 0, 'abort: settlement payee reservation')

        const resultAbort = await Tb.tbSettlementTransferAbort(txnIdSettlement, settlementId)
        test.deepEqual(resultAbort.length, 0, 'abort: settlement payer')
      } catch (any) {
        console.error(any)
        test.fail(`Unable to complete settlement transfer cycle [${hubId}:${any.message}].`)
      }
      await Tb.tbDestroy()
      // TODO await tigerBeetleContainer.stop()
      test.end()
    })
    testCreateTransfers.end()
  })

  tigerBeetleTest.deepEqual(Config.TIGERBEETLE.enabled, false)
  tigerBeetleTest.end()
})
