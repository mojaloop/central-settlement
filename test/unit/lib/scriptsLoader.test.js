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

 * ModusBox
 - Lazola Lucas <lazola.lucas@modusbox.com>
 --------------
 ******/
'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const ScriptsLoader = require('../../../src/lib/scriptsLoader')
const ScriptEngine = require('../../../src/lib/scriptEngine')

const scriptDirectory = '/test/unit/data'
const scriptType = 'notification'
const scriptAction = 'commit'
const scriptStatus = 'success'

const ledgerEntriesStub = {
  ledgerEntries: [{
    transferId: '532bc6a1-c880-4c8d-bbf8-385f4dd33483',
    ledgerAccountTypeId: 'INTERCHANGE_FEE',
    ledgerEntryTypeId: 'INTERCHANGE_FEE',
    amount: '0.09',
    currency: 'TZS',
    payerFspId: 'testfsp2',
    payeeFspId: 'testfsp3'
  }]
}

const message = {
  id: 'c9af8344-278b-4dcb-8b99-80bca31ebaf4',
  from: 'dfsp1',
  to: 'dfsp2',
  type: 'application/json',
  content: {
    uriParams: {
      id: 'b51ec534-ee48-4575-b6a9-ead2955b8999'
    },
    payload: {
      settlementWindowId: '3',
      reason: 'test'
    }
  },
  metadata: {
    event: {
      id: '852926be-7019-4537-a3a3-07b6e6e0cd14',
      type: 'settlement',
      action: 'commit',
      createdAt: '2020-07-20T15:07:31.273Z',
      state: {
        status: 'success',
        code: 0
      }
    }
  },
  pp: ''
}

const expectedScriptsMap = {
  notification: {
    commit: {
      success: [
        {
          filename: 'dummyFeeCalculationTestScript.js',
          startTime: '2020-06-01T00:00:00.000Z',
          endTime: '2100-12-31T23:59:59.999Z',
          script: {}
        },
        {
          filename: 'interchangeCalculationTestScript.js',
          startTime: '2020-06-01T00:00:00.000Z',
          endTime: '2020-12-31T23:59:59.999Z',
          script: {}
        }
      ]
    }
  }
}

const expectedScriptResults = {
  ledgerEntries: [
    {
      transferId: '532bc6a1-c880-4c8d-bbf8-385f4dd33483',
      ledgerAccountTypeId: 'INTERCHANGE_FEE',
      ledgerEntryTypeId: 'INTERCHANGE_FEE',
      amount: '0.09',
      currency: 'TZS',
      payerFspId: 'testfsp2',
      payeeFspId: 'testfsp3'
    },
    {
      transferId: '532bc6a1-c880-4c8d-bbf8-385f4dd33483',
      ledgerAccountTypeId: 'INTERCHANGE_FEE',
      ledgerEntryTypeId: 'INTERCHANGE_FEE',
      amount: '0.09',
      currency: 'TZS',
      payerFspId: 'testfsp2',
      payeeFspId: 'testfsp3'
    }
  ]
}
Test('ScriptsLoader', async (scriptsLoaderTest) => {
  let sandbox

  scriptsLoaderTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  scriptsLoaderTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  scriptsLoaderTest.test('loadScripts should', loadScriptsTest => {
    loadScriptsTest.test('load scripts that are in the scriptDirectory and return the contents ', async (test) => {
      const result = await ScriptsLoader.loadScripts(scriptDirectory)
      test.equal(JSON.stringify(result), JSON.stringify(expectedScriptsMap))
      test.end()
    })
    loadScriptsTest.test('load scripts fail gracefully if no directory exists and return empty contents ', async (test) => {
      const result = await ScriptsLoader.loadScripts('test/unit/missing_folder')
      test.equal(result, {})
      test.end()
    })
    loadScriptsTest.end()
  })
  scriptsLoaderTest.test('executeScripts should', executeScriptsTest => {
    executeScriptsTest.test('execute two scripts', async (test) => {
      const scripts = {
        notification: {
          commit: {
            success: [
              {
                filename: 'dummyFeeCalculation.js',
                startTime: new Date('2020-06-01T00:00:00.000Z'),
                endTime: new Date('2100-12-31T23:59:59.999Z'),
                script: {}
              },
              {
                filename: 'interchangeFeeCalculation1.js',
                startTime: new Date('2020-06-01T00:00:00.000Z'),
                endTime: new Date('2100-12-31T23:59:59.999Z'),
                script: {}
              }
            ]
          }
        }
      }
      const executeStub = sandbox.stub(ScriptEngine, 'execute')
      executeStub.resolves(ledgerEntriesStub)
      const result = await ScriptsLoader.executeScripts(scripts, scriptType, scriptAction, scriptStatus, message)
      test.deepEqual(result, expectedScriptResults)
      test.end()
    })
    executeScriptsTest.test('return an empty object when the ScriptEngine returns no ledger entries  ', async (test) => {
      const scripts = {
        notification: {
          commit: {
            success: [
              {
                filename: 'interchangeFeeCalculation1.js',
                startTime: new Date('2020-06-01T00:00:00.000Z'),
                endTime: new Date('2100-12-31T23:59:59.999Z'),
                script: {}
              }
            ]
          }
        }
      }
      const executeStub = sandbox.stub(ScriptEngine, 'execute')
      executeStub.resolves({})
      const result = await ScriptsLoader.executeScripts(scripts, scriptType, scriptAction, scriptStatus, message)
      test.deepEqual(result, {})
      test.end()
    })
    executeScriptsTest.test('throw an error when a script execution fails', async (test) => {
      const scripts = {
        notification: {
          commit: {
            success: [
              {
                filename: 'dummyFeeCalculation.js',
                startTime: new Date('2020-06-01T00:00:00.000Z'),
                endTime: new Date('2100-12-31T23:59:59.999Z'),
                script: {}
              },
              {
                filename: 'interchangeFeeCalculation.js',
                startTime: new Date('2020-06-01T00:00:00.000Z'),
                endTime: new Date('2100-12-31T23:59:59.999Z'),
                script: {}
              }
            ]
          }
        }
      }
      const executeStub = sandbox.stub(ScriptEngine, 'execute')
      executeStub.throws()
      try {
        await ScriptsLoader.executeScripts(scripts, scriptType, scriptAction, scriptStatus, message)
        test.fail('Should have thrown an error!')
        test.end()
      } catch (err) {
        test.equal(err.message, 'Script execution was unsuccessful', 'should throw an error message when a script fails')
        test.end()
      }
    })

    executeScriptsTest.test('NOT execute as the Script startTime is in the future', async (test) => {
      const scripts = {
        notification: {
          commit: {
            success: [
              {
                filename: 'interchangeFeeCalculation.js',
                startTime: new Date('2100-06-01T00:00:00.000Z'),
                endTime: new Date('2100-12-31T23:59:59.999Z'),
                script: {}
              }
            ]
          }
        }
      }
      const result = await ScriptsLoader.executeScripts(scripts, scriptType, scriptAction, scriptStatus, message)
      test.deepEqual(result, {})
      test.end()
    })

    executeScriptsTest.test('NOT execute as the Script endTime is in the past', async (test) => {
      const scripts = {
        notification: {
          commit: {
            success: [
              {
                filename: 'interchangeFeeCalculation.js',
                startTime: new Date('2000-06-01T00:00:00.000Z'),
                endTime: new Date('2000-12-31T23:59:59.999Z'),
                script: {}
              }
            ]
          }
        }
      }
      const result = await ScriptsLoader.executeScripts(scripts, scriptType, scriptAction, scriptStatus, message)
      test.deepEqual(result, {})
      test.end()
    })

    executeScriptsTest.test('NOT execute as the Script scriptStatus is not met, ', async (test) => {
      const scripts = {
        notification: {
          commit: {
            abort: [
              {
                filename: 'interchangeFeeCalculation.js',
                startTime: new Date('2020-06-01T00:00:00.000Z'),
                endTime: new Date('2100-12-31T23:59:59.999Z'),
                script: {}
              }
            ]
          }
        }
      }
      const result = await ScriptsLoader.executeScripts(scripts, scriptType, scriptAction, scriptStatus, message)
      test.deepEqual(result, {})
      test.end()
    })
    executeScriptsTest.end()
  })
  scriptsLoaderTest.end()
})
