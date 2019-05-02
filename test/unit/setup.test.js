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
const Logger = require('@mojaloop/central-services-shared').Logger
const Proxyquire = require('proxyquire')
const Path = require('path')
const Config = require('../../src/lib/config')

Test('Server Setup', async setupTest => {
  let sandbox
  let serverStub
  let HapiStub
  let HapiOpenAPIStub
  let PathStub
  let DbStub
  let EnumsStub
  let ConfigStub
  let EngineStub
  let SetupProxy

  setupTest.beforeEach(test => {
    try {
      sandbox = Sinon.createSandbox()

      serverStub = {
        register: sandbox.stub(),
        method: sandbox.stub(),
        start: sandbox.stub(),
        log: sandbox.stub(),
        plugins: {
          openapi: {
            setHost: sandbox.stub()
          }
        },
        info: {
          host: Config.HOSTNAME,
          port: Config.PORT
        },
        ext: sandbox.stub()
      }
      HapiStub = {
        Server: sandbox.stub().returns(serverStub)
      }
      DbStub = {
        connect: sandbox.stub().returns(Promise.resolve())
      }
      HapiOpenAPIStub = sandbox.stub()
      PathStub = Path
      EnumsStub = [sandbox.stub()]
      ConfigStub = Config
      EngineStub = sandbox.stub()

      SetupProxy = Proxyquire('../../src/setup', {
        'hapi': HapiStub,
        'hapi-openapi': HapiOpenAPIStub,
        'path': PathStub,
        './lib/db': DbStub,
        './models/lib/enums': EnumsStub,
        './lib/config': ConfigStub,
        'catbox-memory': EngineStub
      })
    } catch (err) {
      Logger.error(`setupTest failed with error - ${err}`)
      console.error(err.message)
    }
    test.end()
  })

  setupTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  await setupTest.test('init should', async initTest => {
    try {
      await initTest.test('test 1', async test => {
        try {
          let server = await SetupProxy.initialize()
          test.ok(server, 'return server object')
          test.ok(HapiStub.Server.calledOnce, 'Hapi.Server called once')
          test.ok(DbStub.connect.calledOnce, 'Db.connect called once')
          test.ok(serverStub.register.calledOnce, 'server.register called once')
          test.ok(serverStub.method.calledOnce, 'server.method called once')
          test.ok(serverStub.start.calledOnce, 'server.start called once')
          test.ok(serverStub.plugins.openapi.setHost.calledOnce, 'server.plugins.openapi.setHost called once')
          test.ok(serverStub.ext.calledOnce, 'server.ext called once')
          test.end()
        } catch (err) {
          Logger.error(`init failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await initTest.test('should catch errors and console.error output', async test => {
        try {
          const e = new Error('Database unavailable')
          DbStub.connect = sandbox.stub().throws(e)
          let consoleErrorStub = sandbox.stub(console, 'error')
          await SetupProxy.initialize()
          test.ok(consoleErrorStub.withArgs(e).calledOnce)
          consoleErrorStub.restore()
          test.end()
        } catch (err) {
          Logger.error(`init failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await initTest.test('should catch errors after createServer and use server.log', async test => {
        try {
          const e = new Error('setHost error')
          serverStub.plugins.openapi.setHost = sandbox.stub().throws(e)
          await SetupProxy.initialize()
          test.ok(serverStub.log.withArgs('error', e.message).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`init failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await initTest.test('invoke server method enums', async test => {
        try {
          await SetupProxy.__testonly__.getEnums(0)
          test.ok(EnumsStub[0].withArgs().calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`init failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await initTest.end()
    } catch (err) {
      Logger.error(`setupTest failed with error - ${err}`)
      initTest.fail()
      initTest.end()
    }
  })

  await setupTest.end()
})
