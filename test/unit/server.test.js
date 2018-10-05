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
const Logger = require('@mojaloop/central-services-shared').Logger
const Proxyquire = require('proxyquire')

Test('Server', (serverTest) => {
  let sandbox

  serverTest.beforeEach(test => {
    try {
      sandbox = Sinon.createSandbox()
    } catch (err) {
      Logger.error(`serverTest failed with error - ${err}`)
      console.error(err.message)
    }
    test.end()
  })

  serverTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  serverTest.test('should import setup and initialize', test => {
    try {
      let initStub = sandbox.stub()
      Proxyquire('../../src/server', {
        './setup': {
          initialize: initStub
        }
      })
      test.ok(initStub.withArgs().calledOnce)
      test.end()
    } catch (err) {
      Logger.error(`serverTest failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  serverTest.end()
})
