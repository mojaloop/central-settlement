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

const path = require('path')
const os = require('os')

const Proxyquire = require('proxyquire')
const Defaults = require('../../../config/default.json')

//const StartedTestContainer = require('testcontainers')
const Tb = require('../../../src/lib/tb')
const Config = require('../../../src/lib/config')

const Sinon = require('sinon')
const P = require('bluebird')

const ScriptsLoader = require("../../../src/lib/scriptsLoader");

const { GenericContainer, StartedTestContainer, Wait } = require('testcontainers')
const fs = require('fs')

const TIGERBEETLE_IMAGE = 'ghcr.io/coilhq/tigerbeetle@sha256:c312832a460e7374bcbd4bd4a5ae79b8762f73df6363c9c8106c76d864e21303'
const TIGERBEETLE_CONTAINER_LOG = true
const TIGERBEETLE_DIR = '/var/lib/tigerbeetle'
const TIGERBEETLE_PORT = 5001
const TIGERBEETLE_CLUSTER = 1

Test('TigerBeetle Test', async (tigerBeetleTest) => {
  let sandbox

  tigerBeetleTest.beforeEach(test => {
    Config.TIGERBEETLE.enabled = true
    Config.TIGERBEETLE.enableMockBeetle = true
    Config.TIGERBEETLE.cluster = TIGERBEETLE_CLUSTER
    sandbox = Sinon.createSandbox()
    //TODO sandbox.stub(Tb.tbCachedClient, 'constructor').returns(P.resolve())
    //TODO sandbox.stub(Tb.tbCachedClient, 'tbCreateSettlementHubAccount').returns(P.resolve())
    //TODO sandbox.stub(Tb.tbCachedClient, 'createClient').returns(P.resolve())
    //TODO sandbox.stub(Tb.tbCachedClient, 'disconnect').returns(P.resolve())

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
  /*tigerBeetleTest.test('tigerbeetle client', async function (testCreateAccounts) {
    testCreateAccounts.test('error when disabled', async (test) => {
      Config.TIGERBEETLE.enabled = false
      await test.ok(Config.TIGERBEETLE.enabled === false)
      try {
        await Tb.tbCreateSettlementHubAccount(hubId)
        test.fail('Expected an error')
      } catch (any) {
        test.deepEqual(any.message, 'TB-Client is not enabled.', 'Disable message is not valid.')
      }
      test.end()
    })
    testCreateAccounts.end()
  })*/

  // Test Account Create:
  tigerBeetleTest.test('create accounts', async function (testCreateAccounts) {
    testCreateAccounts.test('create and lookup hub account', async (test) => {
      const tigerBeetleContainer = await startTigerBeetleContainer(TIGERBEETLE_CLUSTER)
      try {
        const accountType = 1
        const currency = 'USD'
        const result = await Tb.tbCreateSettlementHubAccount(hubId, accountType, currency)
        test.ok(result.length === 0)
        /*const lookupResult = Tb.tbLookupHubAccount(
          hubId,
          accountType,
          currency
        )
        test.ok(lookupResult.length === 1)*/
        // TODO more tests on the result...
      } catch (any) {
        test.fail(`Unable to create settlement accounts [${hubId}:${any.message}].`)
      }
      Tb.tbDestroy()
      await tigerBeetleContainer.stop()
      test.end()
    })

    testCreateAccounts.test('create settlement account', async (test) => {
      const settlementAccounts = [
        { participantCurrencyId : 1 },
        { participantCurrencyId : 2 },
        { participantCurrencyId : 3 },
        { participantCurrencyId : 4 }
      ]

      const accountType = 2
      const currency = 'ZAR'

      try {
        const result = [] /* TODO Tb.tbCreateSettlementAccounts(
          settlementAccounts,
          1, // Settlement Id
          accountType, // Account Type
          currency,
          false // Debits may exceed credits
        )*/
        test.ok(result.length === 0)

      } catch (any) {
        test.fail(`Unable to create settlement accounts [${hubId}:${any.message}].`)
      }

      test.end()
    })
    testCreateAccounts.end()
  })

  // Test Settlement Transfers Create:
  tigerBeetleTest.test('create settlement transfers', async function (testCreateTransfers) {
    testCreateTransfers.test('create and lookup settlement transfer', async (test) => {
      try {
        const accountType = 1
        const currency = 'USD'

        // TODO create a hub account
        // TODO create a settlement account
        // TODO transfer

        const result = []//TODO await Tb.tbCreateSettlementHubAccount(hubId, accountType, currency)
        test.ok(result.length === 0)
        /*const lookupResult = Tb.tbLookupHubAccount(
          hubId,
          accountType,
          currency
        )
        test.ok(lookupResult.length === 1)*/
        // TODO more tests on the result...

      } catch (any) {
        test.fail(`Unable to create settlement accounts [${hubId}:${any.message}].`)
      }
      test.end()
    })
    testCreateTransfers.end()
  })

  await tigerBeetleTest.ok(Config.TIGERBEETLE.enabled === false)
  tigerBeetleTest.end()
})

const startTigerBeetleContainer = async (clusterId = 1) => {
  const tigerBeetleDirSrc = fs.mkdtempSync(path.join(os.tmpdir(), 'tigerbeetle-'))

  //const { name: tigerBeetleDir } = tmp.dirSync({ unsafeCleanup: true })
  // TODO const @jason (waiting for TB 0.10.0): tigerBeetleFile = `${TIGERBEETLE_DIR}/cluster_${clusterId}_replica_0_test.tigerbeetle`

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
