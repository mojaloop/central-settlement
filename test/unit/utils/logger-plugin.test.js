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
 * Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
let Logger = require('@mojaloop/central-services-shared').Logger
const Proxyquire = require('proxyquire')
// const checkEmpty = require('./../../../src/utils/truthyProperty')

Test('loggerPlugin utility', async (loggerPluginTest) => {
  let sandbox

  loggerPluginTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  loggerPluginTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  await loggerPluginTest.test('should register logger-plugin', async test => {
    try {
      let serverStub = sandbox.stub()
      serverStub.events = {
        on: sandbox.stub()
      }
      let eventMock = {
        tags: ['tagged'],
        data: 'data'
      }
      const loggerInfoStub = sandbox.stub()
      const loggerPluginProxy = Proxyquire('../../../src/utils/logger-plugin', {
        '@mojaloop/central-services-shared': {
          Logger: {
            info: loggerInfoStub
          }
        }
      })
      serverStub.events.on.callsArgWith(1, eventMock)
      await loggerPluginProxy.plugin.register(serverStub)
      delete eventMock.tags
      await loggerPluginProxy.plugin.register(serverStub)
      test.ok(!(serverStub.events.on.notCalled), 'server.events.on is called once')
      test.ok(!(loggerInfoStub.notCalled), 'Logger.info with arg event.data is called once')
      test.end()
    } catch (err) {
      Logger.error(`create failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await loggerPluginTest.test('should log all logs', async test => {
    try {
      let serverStub = sandbox.stub()
      serverStub.events = {
        on: sandbox.stub()
      }
      let eventMock = {
        tags: ['info'],
        data: 'data'
      }
      const loggerInfoStub = sandbox.stub()
      const loggerPluginProxy = Proxyquire('../../../src/utils/logger-plugin', {
        '@mojaloop/central-services-shared': {
          Logger: {
            info: loggerInfoStub
          }
        }
      })
      serverStub.events.on.callsArgWith(1, eventMock)
      await loggerPluginProxy.plugin.register(serverStub)
      delete eventMock.tags
      await loggerPluginProxy.plugin.register(serverStub)
      test.ok(!(serverStub.events.on.notCalled), 'server.events.on is called once')
      test.ok(!(loggerInfoStub.notCalled), 'Logger.info with arg event.data is called once')
      test.end()
    } catch (err) {
      Logger.error(`create failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await loggerPluginTest.test('should log errors', async test => {
    try {
      let serverStub = sandbox.stub()
      serverStub.events = {
        on: sandbox.stub()
      }
      let eventMock = {
        tags: ['error'],
        error: new Error('error')
      }
      const loggerInfoStub = sandbox.stub()
      const loggerPluginProxy = Proxyquire('../../../src/utils/logger-plugin', {
        '@mojaloop/central-services-shared': {
          Logger: {
            info: loggerInfoStub
          }
        }
      })
      serverStub.events.on.callsArgWith(1, eventMock)
      await loggerPluginProxy.plugin.register(serverStub)
      delete eventMock.tags
      await loggerPluginProxy.plugin.register(serverStub)
      test.ok(!(serverStub.events.on.notCalled), 'server.events.on is called once')
      test.ok(!(loggerInfoStub.notCalled), 'Logger.info with arg event.data is called once')
      test.end()
    } catch (err) {
      Logger.error(`create failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await loggerPluginTest.test('should log for requests', async test => {
    try {
      let serverStub = sandbox.stub()
      serverStub.events = {
        on: sandbox.stub()
      }
      let eventMock = {
        tags: ['request'],
        data: {
          method: 'method',
          path: 'path'
        }
      }
      const checkEmpty = Sinon.stub()
      const loggerInfoStub = sandbox.stub()
      const loggerPluginProxy = Proxyquire('../../../src/utils/logger-plugin', {
        '@mojaloop/central-services-shared': {
          Logger: {
            info: loggerInfoStub
          }
        }
      })
      checkEmpty.returns(1)
      serverStub.events.on.callsArgWith(1, eventMock)
      await loggerPluginProxy.plugin.register(serverStub)
      delete eventMock.tags
      await loggerPluginProxy.plugin.register(serverStub)
      test.ok(!(serverStub.events.on.notCalled), 'server.events.on is called once')
      test.ok(!(loggerInfoStub.notCalled), 'Logger.info with arg event.data is called once')
      test.end()
    } catch (err) {
      Logger.error(`create failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await loggerPluginTest.test('should log empty requests', async test => {
    try {
      let serverStub = sandbox.stub()
      serverStub.events = {
        on: sandbox.stub()
      }
      let eventMock = {
        tags: ['request'],
        data: {
          method: 'method',
          path: 'path'
        }
      }
      const checkEmpty = Sinon.stub()
      const loggerInfoStub = sandbox.stub()
      const loggerPluginProxy = Proxyquire('../../../src/utils/logger-plugin', {
        '@mojaloop/central-services-shared': {
          Logger: {
            info: loggerInfoStub
          }
        }
      })
      checkEmpty.returns(0)
      serverStub.events.on.callsArgWith(1, eventMock)
      await loggerPluginProxy.plugin.register(serverStub)
      delete eventMock.tags
      await loggerPluginProxy.plugin.register(serverStub)
      test.ok(!(serverStub.events.on.notCalled), 'server.events.on is called once')
      test.ok(!(loggerInfoStub.notCalled), 'Logger.info with arg event.data is called once')
      test.end()
    } catch (err) {
      Logger.error(`create failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  await loggerPluginTest.test('should log empty requests', async test => {
    try {
      let serverStub = sandbox.stub()
      serverStub.events = {
        on: sandbox.stub()
      }
      let eventMock = {
        tags: ['response'],
        data: 'data'
      }
      const loggerInfoStub = sandbox.stub()
      const loggerPluginProxy = Proxyquire('../../../src/utils/logger-plugin', {
        '@mojaloop/central-services-shared': {
          Logger: {
            info: loggerInfoStub
          }
        }
      })
      serverStub.events.on.callsArgWith(1, eventMock)
      await loggerPluginProxy.plugin.register(serverStub)
      delete eventMock.tags
      await loggerPluginProxy.plugin.register(serverStub)
      test.ok(!(serverStub.events.on.notCalled), 'server.events.on is called once')
      test.ok(!(loggerInfoStub.notCalled), 'Logger.info with arg event.data is called once')
      test.end()
    } catch (err) {
      Logger.error(`create failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  loggerPluginTest.end()
})
