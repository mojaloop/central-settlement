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

 * Modusbox
 - Deon Botha <deon.botha@modusbox.com>
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Config = require('../../../src/lib/config')
const Proxyquire = require('proxyquire')
const Routes = require('../../../src/api/routes')

Test('cli', async (cliTest) => {
  cliTest.beforeEach(test => {
    console.log('start')
    test.end()
  })

  cliTest.afterEach(test => {
    console.log('end')
    test.end()
  })

  cliTest.test('yes', async (test) => {
    test.end()
  })

  cliTest.test('Commander should', async (commanderTest) => {
    let sandbox
    let SetupStub

    commanderTest.beforeEach(test => {
      sandbox = Sinon.createSandbox()

      SetupStub = {
        initialize: sandbox.stub().returns(Promise.resolve())
      }

      process.argv = []
      Proxyquire.noPreserveCache() // enable no caching for module requires

      test.end()
    })

    commanderTest.afterEach(test => {
      sandbox.restore()
      Proxyquire.preserveCache()

      test.end()
    })

    commanderTest.test('???  Start all Handlers up via all switches', async test => {
      const argv = [
        'node',
        'index.js',
        'handler',
        '--settlementwindow'
      ]

      process.argv = argv

      const Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      const settlementwindowHandler = {
        type: 'settlementwindow',
        enabled: true
      }

      const handlerList = [
        settlementwindowHandler
      ]

      const initOptions = {
        service: 'handler',
        port: Config.PORT,
        modules: [Routes],
        runMigrations: false,
        handlers: handlerList,
        runHandlers: !Config.HANDLERS_DISABLED
      }

      test.ok(Index)
      test.notok(SetupStub.initialize.calledWith(initOptions))
      test.end()
    })

    commanderTest.test('??? argv Start all Handlers up via all switches', async test => {
      const argv = [
        'node',
        'index.js'
      ]

      process.argv = argv

      sandbox.stub(process, 'exit')

      const Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      const settlementwindowHandler = {
        type: 'settlementwindow',
        enabled: true
      }

      const handlerList = [
        settlementwindowHandler
      ]

      const initOptions = {
        service: 'handler',
        port: Config.PORT,
        modules: [Routes],
        runMigrations: false,
        handlers: handlerList,
        runHandlers: !Config.HANDLERS_DISABLED
      }

      test.ok(Index)
      test.notok(SetupStub.initialize.calledWith(initOptions))
      test.ok(process.exit.called)
      test.end()
    })

    commanderTest.end()
  })

  cliTest.end()
})
