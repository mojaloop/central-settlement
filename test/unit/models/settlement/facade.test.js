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

  let payload = new Map()
  payload['putById'] = [
    {
      participants: [
        {
          id: 1,
          accounts: [
            {
              id: 10,
              reason: 'Account not found',
              state: 'SETTLED'
            },
            {
              id: 1,
              reason: 'PENDING_SETTLEMENT to SETTLED',
              state: 'SETTLED'
            },
            {
              id: 2,
              reason: 'PENDING_SETTLEMENT to SETTLED',
              state: 'SETTLED'
            },
            {
              id: 1,
              reason: 'Account already processed once',
              state: 'SETTLED'
            },
            {
              id: 3,
              reason: 'Same state',
              state: 'SETTLED'
            },
            {
              id: 4,
              reason: 'State change not allowed',
              state: 'SETTLED'
            },
            {
              id: 6,
              reason: 'PENDING_SETTLEMENT to SETTLED',
              state: 'SETTLED'
            }
          ]
        },
        {
          id: 2,
          accounts: [
            {
              id: 5,
              reason: 'Participant and account mismatch',
              state: 'SETTLED'
            }
          ]
        }
      ]
    },
    {
      participants: [
        {
          id: 1,
          accounts: [
            {
              id: 1,
              reason: 'PENDING_SETTLEMENT to SETTLED',
              state: 'SETTLED'
            }
          ]
        }
      ]
    }
  ]

  let stubData = new Map()
  stubData['putById'] = [
    {
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
          settlementStateId: 'PENDING_SETTLEMENT',
          reason: 'text',
          netAmount: 100,
          currencyId: 'USD',
          key: 2
        },
        {
          participantId: 1,
          participantCurrencyId: 3,
          settlementStateId: 'SETTLED',
          reason: 'text',
          netAmount: 100,
          currencyId: 'USD',
          key: 3
        },
        {
          participantId: 1,
          participantCurrencyId: 4,
          settlementStateId: 'NOT_SETTLED',
          reason: 'text',
          netAmount: 100,
          currencyId: 'USD',
          key: 5
        },
        {
          participantId: 1,
          participantCurrencyId: 5,
          settlementStateId: 'unknown',
          reason: 'text',
          netAmount: 100,
          currencyId: 'USD',
          key: 6
        },
        {
          participantId: 1,
          participantCurrencyId: 6,
          settlementStateId: 'PENDING_SETTLEMENT',
          reason: 'text',
          netAmount: 100,
          currencyId: 'USD',
          key: 6
        },
        {
          participantId: 1,
          participantCurrencyId: 7,
          settlementStateId: 'PENDING_SETTLEMENT',
          reason: 'text',
          netAmount: 100,
          currencyId: 'USD',
          key: 7
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
        },
        {
          settlementWindowId: 5,
          settlementWindowStateId: 'PENDING_SETTLEMENT',
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
          participantCurrencyId: 3
        },
        {
          settlementWindowId: 3,
          participantCurrencyId: 1
        },
        {
          settlementWindowId: 3,
          participantCurrencyId: 2
        },
        {
          settlementWindowId: 4,
          participantCurrencyId: 4
        },
        {
          settlementWindowId: 5,
          participantCurrencyId: 6
        },
        {
          settlementWindowId: 5,
          participantCurrencyId: 7
        },
        {
          settlementWindowId: 6,
          participantCurrencyId: 5
        }
      ]
    },
    {
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
        }
      ],
      windowsList: [
        {
          settlementWindowId: 1,
          settlementWindowStateId: 'PENDING_SETTLEMENT',
          reason: 'text',
          createdDate: now
        }
      ],
      windowsAccountsList: [
        {
          settlementWindowId: 1,
          participantCurrencyId: 1
        }
      ]
    }
  ]
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

          await SettlementFacade.putById(1, payload['putById'][0])
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`putById failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await putById.test('process payload as defined in specification', async test => {
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
                      forUpdate: sandbox.stub().returns(Promise.resolve(stubData['putById'][0].settlementData))
                    })
                  })
                })
              }),
              join: sandbox.stub().returns({
                select: sandbox.stub().returns({
                  where: sandbox.stub().returns({
                    transacting: sandbox.stub().returns({
                      forUpdate: sandbox.stub().returns(Promise.resolve(stubData['putById'][0].windowsList))
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
                      forUpdate: sandbox.stub().returns(Promise.resolve(stubData['putById'][0].settlementAccountList))
                    })
                  })
                })
              })
            }),
            select: sandbox.stub().returns({
              distinct: sandbox.stub().returns({
                where: sandbox.stub().returns({
                  transacting: sandbox.stub().returns({
                    forUpdate: sandbox.stub().returns(Promise.resolve(stubData['putById'][0].windowsAccountsList))
                  })
                })
              })
            }),
            insert: sandbox.stub().returns({
              returning: sandbox.stub().returns({
                transacting: sandbox.stub().returns(Promise.resolve([21, 22, 23]))
              })
            }),
            where: sandbox.stub().returns({
              update: sandbox.stub().returns({
                transacting: sandbox.stub().returns(Promise.resolve())
              })
            })
          })

          let result = await SettlementFacade.putById(1, payload['putById'][0])
          test.ok(result, 'Result returned')
          test.equal(knexStub.callCount, 16, 'Knex called 16 times')
          test.equal(result.state, 'PENDING_SETTLEMENT', 'Settlement should remain in PENDING_SETTLEMENT state')
          test.equal(result.settlementWindows.length, 3, 'Excactly three settlement windows are expected to be affected')
          test.equal(result.settlementWindows[0].settlementWindowStateId, 'SETTLED', 'First window is SETTLED')
          test.equal(result.settlementWindows[1].settlementWindowStateId, 'SETTLED', 'Second window is SETTLED')
          test.equal(result.settlementWindows[2].settlementWindowStateId, 'PENDING_SETTLEMENT', 'Third window remains PENDING_SETTLEMENT')
          test.equal(result.participants.length, 2, 'Two participants are affected')
          test.equal(result.participants[0].accounts.length, 7, 'Seven accounts for first participant are affected')
          test.equal(result.participants[1].accounts.length, 1, 'One account for second participant is affected')
          test.equal(result.participants[0].accounts[0].id, 10, 'First account processed has id 10')
          test.equal(result.participants[0].accounts[0].errorInformation.errorDescription, 'Account not found', 'First account returns error "Account not found"')
          test.equal(result.participants[0].accounts[1].id, 1, 'Second account processed has id 1')
          test.equal(result.participants[0].accounts[1].state, 'SETTLED', 'Second account is SETTLED')
          test.equal(result.participants[0].accounts[2].id, 2, 'Third account processed has id 2')
          test.equal(result.participants[0].accounts[2].state, 'SETTLED', 'Third account is SETTLED')
          test.equal(result.participants[0].accounts[3].id, 1, 'Fourth account processed has id 1')
          test.equal(result.participants[0].accounts[3].errorInformation.errorDescription, 'Account already processed once', 'Fourth account returns error "Account already processed once"')
          test.equal(result.participants[0].accounts[4].id, 3, 'Fifth account processed has id 3')
          test.equal(result.participants[0].accounts[4].state, 'SETTLED', 'Fifth account state remains SETTLED')
          test.equal(result.participants[0].accounts[5].id, 4, 'Sixth account processed has id 4')
          test.equal(result.participants[0].accounts[5].errorInformation.errorDescription, 'State change not allowed', 'Fourth account returns error "State change not allowed"')
          test.equal(result.participants[1].accounts[0].id, 5, 'First account processed for second particpant has id 5')
          test.equal(result.participants[1].accounts[0].errorInformation.errorDescription, 'Participant and account mismatch', 'First account processed for second particpant "Participant and account mismatch"')
          test.end()
        } catch (err) {
          Logger.error(`putById failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await putById.test('SETTLE settlement when all accounts are SETTLED', async test => {
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
                      forUpdate: sandbox.stub().returns(Promise.resolve(stubData['putById'][1].settlementData))
                    })
                  })
                })
              }),
              join: sandbox.stub().returns({
                select: sandbox.stub().returns({
                  where: sandbox.stub().returns({
                    transacting: sandbox.stub().returns({
                      forUpdate: sandbox.stub().returns(Promise.resolve(stubData['putById'][1].windowsList))
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
                      forUpdate: sandbox.stub().returns(Promise.resolve(stubData['putById'][1].settlementAccountList))
                    })
                  })
                })
              })
            }),
            select: sandbox.stub().returns({
              distinct: sandbox.stub().returns({
                where: sandbox.stub().returns({
                  transacting: sandbox.stub().returns({
                    forUpdate: sandbox.stub().returns(Promise.resolve(stubData['putById'][1].windowsAccountsList))
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

          let result = await SettlementFacade.putById(1, payload['putById'][1])
          test.ok(result, 'Result returned')
          test.equal(knexStub.callCount, 10, 'Knex called 10 times')
          test.equal(result.settlementWindows.length, 1, 'Excactly one settlement window is returned as affected')
          test.equal(result.participants.length, 1, 'One participants is affected')
          test.equal(result.participants[0].accounts.length, 1, 'One account is affected')
          test.equal(result.participants[0].accounts[0].state, 'SETTLED', 'Account is SETTLED')
          test.equal(result.settlementWindows[0].settlementWindowStateId, 'SETTLED', 'Window is SETTLED')
          test.equal(result.state, 'SETTLED', 'Settlement is SETTLED')
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
