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

 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Db = require('../../../../src/models')
const Logger = require('@mojaloop/central-services-shared').Logger
const SettlementFacade = require('../../../../src/models/settlement/facade')

Test('Settlement facade', async (settlementFacadeTest) => {
  let sandbox
  let clock
  let now = new Date()

  settlementFacadeTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    // Db.participant = { query: sandbox.stub() }
    clock = Sinon.useFakeTimers(now.getTime())
    test.end()
  })

  settlementFacadeTest.afterEach(test => {
    sandbox.restore()
    clock.restore()
    test.end()
  })

  let payload = {
    participants: [
      {
        id: 1,
        accounts: [
          {
            id: 5,
            reason: 'Account not found',
            state: 'SETTLED'
          },
          {
            id: 1,
            reason: 'PENDING_SETTLEMENT to SETTLED',
            state: 'SETTLED'
          },
          {
            id: 1,
            reason: 'Account already processed once',
            state: 'SETTLED'
          },
          {
            id: 2,
            reason: 'Same state',
            state: 'SETTLED'
          },
          {
            id: 3,
            reason: 'State change not allowed',
            state: 'SETTLED'
          }
        ]
      },
      {
        id: 2,
        accounts: [
          {
            id: 4,
            reason: 'Participant and account mismatch',
            state: 'SETTLED'
          }
        ]
      }
    ]
  }
  const testData = {
    settlementData: {
      settlementId: 1,
      settlementStateId: 'PENDING_SETTLEMENT',
      reason: 'reason',
      createdDate: now
    },
    settlementAccountList: [
      {
        participantId: 1,
        participantCurrencyId: 1,
        settlementStateId: 'PENDING_SETTLEMENT',
        reason: 'text',
        netAmount: 100,
        currencyId: 'USD',
        key: 1
      },
      {
        participantId: 1,
        participantCurrencyId: 2,
        settlementStateId: 'SETTLED',
        reason: 'text',
        netAmount: 100,
        currencyId: 'USD',
        key: 1
      },
      {
        participantId: 1,
        participantCurrencyId: 3,
        settlementStateId: 'NOT_SETTLED',
        reason: 'text',
        netAmount: 100,
        currencyId: 'USD',
        key: 1
      },
      {
        participantId: 1,
        participantCurrencyId: 4,
        settlementStateId: 'unknown',
        reason: 'text',
        netAmount: 100,
        currencyId: 'USD',
        key: 1
      }
    ],
    windowsList: [
      {
        settlementWindowId: 1,
        settlementWindowStateId: 'PENDING_SETTLEMENT',
        reason: 'text',
        createdDate: now
      },
      {
        settlementWindowId: 2,
        settlementWindowStateId: 'SETTLED',
        reason: 'text',
        createdDate: now
      },
      {
        settlementWindowId: 3,
        settlementWindowStateId: 'NOT_SETTLED',
        reason: 'text',
        createdDate: now
      },
      {
        settlementWindowId: 4,
        settlementWindowStateId: 'other',
        reason: 'text',
        createdDate: now
      }
    ],
    windowsAccountsList: [
      {
        settlementWindowId: 1,
        participantCurrencyId: 1
      },
      {
        settlementWindowId: 2,
        participantCurrencyId: 2
      },
      {
        settlementWindowId: 3,
        participantCurrencyId: 3
      },
      {
        settlementWindowId: 4,
        participantCurrencyId: 4
      }
    ]
  }

  await settlementFacadeTest.test('putById should', async putById => {
    try {
      await putById.test('throw error if no settlement is not found', async test => {
        try {
          let settlementData

          sandbox.stub(Db, 'getKnex')
          const knexStub = sandbox.stub()
          const trxStub = sandbox.stub()
          trxStub.commit = sandbox.stub()
          knexStub.transaction = sandbox.stub().callsArgWith(0, trxStub)

          Db.getKnex.returns(knexStub)
          knexStub.returns({
            join: sandbox.stub().returns({
              select: sandbox.stub().returns({
                where: sandbox.stub().returns({
                  first: sandbox.stub().returns({
                    transacting: sandbox.stub().returns({
                      forUpdate: sandbox.stub().returns(Promise.resolve(settlementData))
                    })
                  })
                })
              })
            })
          })

          await SettlementFacade.putById(1, payload)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`putById failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await putById.test('test title', async test => {
        try {
          sandbox.stub(Db, 'getKnex')
          const knexStub = sandbox.stub()
          const trxStub = sandbox.stub()
          trxStub.commit = sandbox.stub()
          knexStub.transaction = sandbox.stub().callsArgWith(0, trxStub)

          Db.getKnex.returns(knexStub)
          knexStub.returns({
            join: sandbox.stub().returns({
              select: sandbox.stub().returns({
                where: sandbox.stub().returns({
                  first: sandbox.stub().returns({
                    transacting: sandbox.stub().returns({
                      forUpdate: sandbox.stub().returns(Promise.resolve(testData.settlementData))
                    })
                  })
                })
              }),
              join: sandbox.stub().returns({
                select: sandbox.stub().returns({
                  where: sandbox.stub().returns({
                    transacting: sandbox.stub().returns({
                      forUpdate: sandbox.stub().returns(Promise.resolve(testData.windowsList))
                    })
                  })
                })
              })
            }),
            leftJoin: sandbox.stub().returns({
              join: sandbox.stub().returns({
                select: sandbox.stub().returns({
                  where: sandbox.stub().returns({
                    transacting: sandbox.stub().returns({
                      forUpdate: sandbox.stub().returns(Promise.resolve(testData.settlementAccountList))
                    })
                  })
                })
              })
            }),
            select: sandbox.stub().returns({
              distinct: sandbox.stub().returns({
                where: sandbox.stub().returns({
                  transacting: sandbox.stub().returns({
                    forUpdate: sandbox.stub().returns(Promise.resolve(testData.windowsAccountsList))
                  })
                })
              })
            }),
            insert: sandbox.stub().returns({
              returning: sandbox.stub().returns({
                transacting: sandbox.stub().returns(Promise.resolve([1]))
              })
            }),
            where: sandbox.stub().returns({
              update: sandbox.stub().returns({
                transacting: sandbox.stub().returns(Promise.resolve([1]))
              })
            })
          })

          let result = await SettlementFacade.putById(1, payload)
          test.pass('Success')
          test.ok(result, 'result returned')
          // test.ok(Array.isArray(), 'array of ... is returned')
          // test.ok(knexStub.withArgs('...').calledThrice, 'knex called with ... thrice')
          // test.ok(knexStub.withArgs('...').calledOnce, 'knex called with ... once')
          // test.ok(knexStub.withArgs('...').calledOnce, 'knex called with .. once')
          // test.pass('completed successfully')
          test.end()
        } catch (err) {
          Logger.error(`putById failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await putById.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      putById.fail()
      putById.end()
    }
  })

  await settlementFacadeTest.end()
})
