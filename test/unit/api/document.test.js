/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation

 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Base = require('../base')
const Db = require('../../../src/lib/db')
const CLDb = require('@mojaloop/central-ledger/src/lib/db')

Test('the API document', async (documentTest) => {
  let server
  let sandbox
  documentTest.beforeEach(async t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Db, 'connect').returns(Promise.resolve({}))
    sandbox.stub(CLDb, 'connect').returns(Promise.resolve({}))
    server = await Base.setup()
    t.end()
  })

  documentTest.afterEach(async t => {
    await server.stop()
    sandbox.restore()
    t.end()
  })

  await documentTest.test('is served where the platform reads it', async t => {
    const res = await server.inject({ method: 'GET', url: '/.authz/openapi' })
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json')
    t.ok(JSON.parse(res.payload).openapi.startsWith('3.1'))

    const again = await server.inject({
      method: 'GET',
      url: '/.authz/openapi',
      headers: { 'if-none-match': res.headers.etag }
    })
    t.equal(again.statusCode, 304)
    t.end()
  })

  await documentTest.end()
})
