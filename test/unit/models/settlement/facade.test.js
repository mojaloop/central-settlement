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
const Db = require('../../../../src/models')
const Logger = require('@mojaloop/central-services-shared').Logger
const SettlementFacade = require('../../../../src/models/settlement/facade')

Test('Settlement facade', async (settlementFacadeTest) => {
  let sandbox
  let clock
  let now = new Date()

  settlementFacadeTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
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
  payload['knexTriggerEvent'] = {
    idList: [1, 2],
    reason: 'text'
  }

  let enums = new Map()
  enums['knexTriggerEvent'] = {
    transferStates: {
      COMMITTED: 'COMMITTED'
    },
    transferParticipantRoleTypes: {
      PAYER_DFSP: 'PAYER_DFSP',
      PAYEE_DFSP: 'PAYEE_DFSP'
    },
    ledgerEntryTypes: {
      PRINCIPLE_VALUE: 'PRINCIPLE_VALUE',
      INTERCHANGE_FEE: 'INTERCHANGE_FEE',
      HUB_FEE: 'HUB_FEE'
    },
    settlementStates: {
      PENDING_SETTLEMENT: 'PENDING_SETTLEMENT'
    }
  }

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
  stubData['knexTriggerEvent'] = {
    settlementId: 1,
    settlementParticipantCurrencyList: [
      {
        settlementParticipantCurrencyId: 'USD'
      }
    ],
    settlementParticipantCurrencyStateChangeIdList: [
      {
        settlementParticipantCurrencyStateChangeId: 11
      }
    ],
    settlementWindowStateChangeIdList: [
      {
        settlementWindowStateChangeId: 3
      },
      {
        settlementWindowStateChangeId: 4
      }
    ]
  }
  await settlementFacadeTest.test('putById should', async putByIdTest => {
    try {
      await putByIdTest.test('throw error if settlement is not found', async test => {
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
                      forUpdate: sandbox.stub().returns(
                        Promise.resolve(settlementData)
                      )
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

      await putByIdTest.test('process payload as defined in specification', async test => {
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
                      forUpdate: sandbox.stub().returns(
                        Promise.resolve(stubData['putById'][0].settlementData)
                      )
                    })
                  })
                })
              }),
              join: sandbox.stub().returns({
                select: sandbox.stub().returns({
                  where: sandbox.stub().returns({
                    transacting: sandbox.stub().returns({
                      forUpdate: sandbox.stub().returns(
                        Promise.resolve(stubData['putById'][0].windowsList)
                      )
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
                      forUpdate: sandbox.stub().returns(
                        Promise.resolve(stubData['putById'][0].settlementAccountList)
                      )
                    })
                  })
                })
              })
            }),
            select: sandbox.stub().returns({
              distinct: sandbox.stub().returns({
                where: sandbox.stub().returns({
                  transacting: sandbox.stub().returns({
                    forUpdate: sandbox.stub().returns(
                      Promise.resolve(stubData['putById'][0].windowsAccountsList)
                    )
                  })
                })
              })
            }),
            insert: sandbox.stub().returns({
              returning: sandbox.stub().returns({
                transacting: sandbox.stub().returns(
                  Promise.resolve([21, 22, 23])
                )
              })
            }),
            where: sandbox.stub().returns({
              update: sandbox.stub().returns({
                transacting: sandbox.stub().returns(
                  Promise.resolve()
                )
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

      await putByIdTest.test('SETTLE settlement when all accounts are SETTLED', async test => {
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
                      forUpdate: sandbox.stub().returns(
                        Promise.resolve(stubData['putById'][1].settlementData)
                      )
                    })
                  })
                })
              }),
              join: sandbox.stub().returns({
                select: sandbox.stub().returns({
                  where: sandbox.stub().returns({
                    transacting: sandbox.stub().returns({
                      forUpdate: sandbox.stub().returns(
                        Promise.resolve(stubData['putById'][1].windowsList)
                      )
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
                      forUpdate: sandbox.stub().returns(
                        Promise.resolve(stubData['putById'][1].settlementAccountList)
                      )
                    })
                  })
                })
              })
            }),
            select: sandbox.stub().returns({
              distinct: sandbox.stub().returns({
                where: sandbox.stub().returns({
                  transacting: sandbox.stub().returns({
                    forUpdate: sandbox.stub().returns(
                      Promise.resolve(stubData['putById'][1].windowsAccountsList)
                    )
                  })
                })
              })
            }),
            insert: sandbox.stub().returns({
              returning: sandbox.stub().returns({
                transacting: sandbox.stub().returns(
                  Promise.resolve([1])
                )
              })
            }),
            where: sandbox.stub().returns({
              update: sandbox.stub().returns({
                transacting: sandbox.stub().returns(
                  Promise.resolve([1])
                )
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

      await putByIdTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      putByIdTest.fail()
      putByIdTest.end()
    }
  })

  await settlementFacadeTest.test('getById should', async getByIdTest => {
    try {
      await getByIdTest.test('retrieve settlement data by id', async test => {
        try {
          const settlementId = 1
          const settlementResultStub = {id: 1}

          Db.settlement = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlement.query.callsArgWith(0, builderStub)
          builderStub.join = sandbox.stub()
          let selectStub = sandbox.stub()
          let whereStub = sandbox.stub()
          let firstStub = sandbox.stub()
          builderStub.join.returns({
            select: selectStub.returns({
              where: whereStub.returns({
                first: firstStub
              })
            })
          })
          Db.settlement.query.returns(Promise.resolve(settlementResultStub))

          await SettlementFacade.getById({settlementId})
          test.ok(builderStub.join.withArgs('settlementStateChange AS ssc', 'ssc.settlementStateChangeId', 'settlement.currentStateChangeId').calledOnce)
          test.ok(selectStub.withArgs('settlement.settlementId',
            'ssc.settlementStateId AS state',
            'settlement.reason',
            'settlement.createdDate').calledOnce)
          test.ok(whereStub.withArgs('settlement.settlementId', settlementId).calledOnce)
          test.ok(firstStub.calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getById failed with error - ${err}`)
          test.fail('Error thrown')
          test.end()
        }
      })

      await getByIdTest.test('throw error if query is wrong', async test => {
        try {
          const settlementId = 1
          Db.settlement = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlement.query.callsArgWith(0, builderStub)
          await SettlementFacade.getById({settlementId})
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getById failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getByIdTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getByIdTest.fail()
      getByIdTest.end()
    }
  })

  await settlementFacadeTest.test('getByParams should', async getByParamsTest => {
    try {
      await getByParamsTest.test('retrieve settlement data by params', async test => {
        try {
          let state = 'PENDING_SETTLEMENT'
          let fromDateTime = new Date() - 3600
          let toDateTime = new Date()
          let currency = 'USD'
          let settlementWindowId = 1
          let fromSettlementWindowDateTime = new Date() - 3600
          let toSettlementWindowDateTime = new Date()
          let participantId = 1
          let accountId = 1
          let query = { state, fromDateTime, toDateTime, currency, settlementWindowId, fromSettlementWindowDateTime, toSettlementWindowDateTime, participantId, accountId }

          Db.settlement = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlement.query.callsArgWith(0, builderStub)
          builderStub.innerJoin = sandbox.stub()
          let context = sandbox.stub()
          context.on = sandbox.stub()
          context.on.returns({
            andOn: sandbox.stub()
          })
          let innerJoin5 = sandbox.stub()
          innerJoin5.callsArgOn(1, context)
          let innerJoin6 = sandbox.stub()
          innerJoin6.callsArgOn(1, context)

          builderStub.innerJoin.returns({
            innerJoin: sandbox.stub().returns({
              innerJoin: sandbox.stub().returns({
                innerJoin: sandbox.stub().returns({
                  innerJoin: innerJoin5.returns({
                    innerJoin: innerJoin6.returns({
                      innerJoin: sandbox.stub().returns({
                        innerJoin: sandbox.stub().returns({
                          distinct: sandbox.stub().returns({
                            select: sandbox.stub().returns({
                              where: sandbox.stub()
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
          Db.settlement.query.returns(Promise.resolve({id: 1}))
          const res1 = await SettlementFacade.getByParams(query)
          Db.settlement.query.returns(Promise.resolve({id: 2}))
          const res2 = await SettlementFacade.getByParams({})
          test.equal(res1.id, 1, 'First query returns settlement id 1')
          test.equal(res2.id, 2, 'Second query returns settlement id 2')
          test.equal(Db.settlement.query.callCount, 2, 'settlement query by params executed twice')
          test.end()
        } catch (err) {
          Logger.error(`getByParams failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByParamsTest.test('throw error if query is wrong', async test => {
        try {
          const settlementId = 1
          Db.settlement = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlement.query.callsArgWith(0, builderStub)
          await SettlementFacade.getByParams({settlementId})
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getByParams failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getByParamsTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getByParamsTest.fail()
      getByParamsTest.end()
    }
  })

  await settlementFacadeTest.test('knexTriggerEvent should', async knexTriggerEventTest => {
    try {
      await knexTriggerEventTest.test('create new settlement', async test => {
        try {
          sandbox.stub(Db, 'getKnex')
          const knexStub = sandbox.stub()
          const trxStub = sandbox.stub()
          trxStub.commit = sandbox.stub()
          knexStub.transaction = sandbox.stub().callsArgWith(0, trxStub)
          Db.getKnex.returns(knexStub)
          knexStub.returns({
            insert: sandbox.stub().returns({
              transacting: sandbox.stub().returns(
                Promise.resolve(stubData['knexTriggerEvent'].settlementId)
              )
            }),
            select: sandbox.stub().returns({
              where: sandbox.stub().returns({
                transacting: sandbox.stub().returns(
                  Promise.resolve(stubData['knexTriggerEvent'].settlementParticipantCurrencyList)
                )
              }),
              whereIn: sandbox.stub().returns({
                transacting: sandbox.stub().returns(
                  Promise.resolve(stubData['knexTriggerEvent'].settlementParticipantCurrencyStateChangeIdList)
                )
              })
            }),
            transacting: sandbox.stub().returns({
              where: sandbox.stub().returns({
                update: sandbox.stub()
              }),
              select: sandbox.stub().returns({
                whereIn: sandbox.stub().returns({
                  andWhere: sandbox.stub().returns(
                    Promise.resolve(stubData['knexTriggerEvent'].settlementWindowStateChangeIdList)
                  )
                })
              }),
              insert: sandbox.stub()
            })
          })
          knexStub.batchInsert = sandbox.stub().returns({
            transacting: sandbox.stub()
          })
          knexStub.raw = sandbox.stub()
          let context1 = sandbox.stub()
          let context2 = sandbox.stub()
          let context3 = sandbox.stub()
          context2.on = sandbox.stub().returns({
            on: sandbox.stub()
          })
          let join1Stub = sandbox.stub().callsArgOn(1, context2)
          context3.on = sandbox.stub()
          let join2Stub = sandbox.stub().callsArgOn(1, context3)
          context1.from = sandbox.stub().returns({
            join: sandbox.stub().returns({
              join: join1Stub.returns({
                join: join2Stub.returns({
                  where: sandbox.stub().returns({
                    groupBy: sandbox.stub().returns({
                      select: sandbox.stub().returns({
                        sum: sandbox.stub()
                      })
                    })
                  })
                })
              })
            }),
            whereRaw: sandbox.stub().returns({
              groupBy: sandbox.stub().returns({
                select: sandbox.stub().returns({
                  sum: sandbox.stub()
                })
              })
            })
          })
          let insertStub = sandbox.stub().callsArgOn(0, context1)
          knexStub.from = sandbox.stub().returns({
            insert: insertStub.returns({
              transacting: sandbox.stub()
            })
          })

          let settlementId = await SettlementFacade.knexTriggerEvent(payload['knexTriggerEvent'], enums['knexTriggerEvent'])
          test.equal(settlementId, 1, 'settlementId returned')
          test.equal(knexStub.callCount, 9, 'Knex called 9 times')
          test.end()
        } catch (err) {
          Logger.error(`knexTriggerEvent failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await knexTriggerEventTest.test('throw error if settlement insert fails', async test => {
        try {
          sandbox.stub(Db, 'getKnex')
          const knexStub = sandbox.stub()
          const trxStub = sandbox.stub()
          trxStub.commit = sandbox.stub()
          knexStub.transaction = sandbox.stub().callsArgWith(0, trxStub)
          Db.getKnex.returns(knexStub)
          knexStub.returns({
            insert: sandbox.stub().returns({
              transacting: sandbox.stub().throws(
                new Error('settlement insert failure')
              )
            })
          })

          await SettlementFacade.knexTriggerEvent(payload['knexTriggerEvent'])
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`knexTriggerEvent failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await knexTriggerEventTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      knexTriggerEventTest.fail()
      knexTriggerEventTest.end()
    }
  })

  await settlementFacadeTest.test('settlementParticipantCurrency.getByListOfIds should', async getByListOfIdsTest => {
    try {
      await getByListOfIdsTest.test('retrieve settlementParticipantCurrency data by listOfIds', async test => {
        try {
          const listOfIds = [1]
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          builderStub.leftJoin = sandbox.stub()
          let leftJoin2Stub = sandbox.stub()
          let selectStub = sandbox.stub()
          let whereInStub = sandbox.stub()
          builderStub.leftJoin.returns({
            leftJoin: leftJoin2Stub.returns({
              select: selectStub.returns({
                whereIn: whereInStub
              })
            })
          })
          await SettlementFacade.settlementParticipantCurrency.getByListOfIds(listOfIds)
          test.ok(builderStub.leftJoin.withArgs('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId').calledOnce)
          test.ok(leftJoin2Stub.withArgs('participant as p', 'p.participantCurrencyId', 'pc.participantCurrencyId').calledOnce)
          test.ok(selectStub.withArgs(
            'settlementParticipantCurrency.netAmount as amount',
            'pc.currencyId as currency',
            'p.participanId as participant').calledOnce)
          test.ok(whereInStub.withArgs('settlementWindow.settlementWindowId', listOfIds).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getByListOfIds failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByListOfIdsTest.test('throw error if query is wrong', async test => {
        try {
          const listOfIds = [1]
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          await SettlementFacade.settlementParticipantCurrency.getByListOfIds(listOfIds)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getByListOfIds failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getByListOfIdsTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getByListOfIdsTest.fail()
      getByListOfIdsTest.end()
    }
  })

  await settlementFacadeTest.test('settlementParticipantCurrency.getAccountsInSettlementByIds should', async getAccountsInSettlementByIdsTest => {
    try {
      await getAccountsInSettlementByIdsTest.test('retrieve accounts in settlement data by ids', async test => {
        try {
          const params = {settlementId: 1, participantId: 1}
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          builderStub.join = sandbox.stub()
          let selectStub = sandbox.stub()
          let whereStub = sandbox.stub()
          let andWhereStub = sandbox.stub()
          builderStub.join.returns({
            select: selectStub.returns({
              where: whereStub.returns({
                andWhere: andWhereStub
              })
            })
          })
          await SettlementFacade.settlementParticipantCurrency.getAccountsInSettlementByIds(params)
          test.ok(builderStub.join.withArgs('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId').calledOnce)
          test.ok(selectStub.withArgs('settlementParticipantCurrencyId').calledOnce)
          test.ok(whereStub.withArgs({settlementId: params.settlementId}).calledOnce)
          test.ok(andWhereStub.withArgs('pc.participantId', params.participantId).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getAccountsInSettlementByIds failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getAccountsInSettlementByIdsTest.test('throw error if query is wrong', async test => {
        try {
          const params = {settlementId: 1, participantId: 1}
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          await SettlementFacade.settlementParticipantCurrency.getAccountsInSettlementByIds(params)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getAccountsInSettlementByIds failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getAccountsInSettlementByIdsTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getAccountsInSettlementByIdsTest.fail()
      getAccountsInSettlementByIdsTest.end()
    }
  })

  await settlementFacadeTest.test('settlementParticipantCurrency.getParticipantCurrencyBySettlementId should', async getParticipantCurrencyBySettlementIdTest => {
    try {
      await getParticipantCurrencyBySettlementIdTest.test('retrieve participant currency data by settlement id', async test => {
        try {
          const params = {settlementId: 1}
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          builderStub.leftJoin = sandbox.stub()
          let joinStub = sandbox.stub()
          let selectStub = sandbox.stub()
          let whereStub = sandbox.stub()
          builderStub.leftJoin.returns({
            join: joinStub.returns({
              select: selectStub.returns({
                where: whereStub
              })
            })
          })
          await SettlementFacade.settlementParticipantCurrency.getParticipantCurrencyBySettlementId(params)
          test.ok(builderStub.leftJoin.withArgs('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'settlementParticipantCurrency.currentStateChangeId').calledOnce)
          test.ok(joinStub.withArgs('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId').calledOnce)
          test.ok(selectStub.withArgs('pc.participantId AS id',
            'settlementParticipantCurrency.participantCurrencyId AS participantCurrencyId',
            'spcsc.settlementStateId AS state',
            'spcsc.reason AS reason',
            'settlementParticipantCurrency.netAmount AS netAmount',
            'pc.currencyId AS currency',
            'settlementParticipantCurrency.settlementParticipantCurrencyId AS key').calledOnce)
          test.ok(whereStub.withArgs(params).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getParticipantCurrencyBySettlementId failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getParticipantCurrencyBySettlementIdTest.test('throw error if query is wrong', async test => {
        try {
          const params = {settlementId: 1}
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          await SettlementFacade.settlementParticipantCurrency.getParticipantCurrencyBySettlementId(params)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getParticipantCurrencyBySettlementId failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getParticipantCurrencyBySettlementIdTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getParticipantCurrencyBySettlementIdTest.fail()
      getParticipantCurrencyBySettlementIdTest.end()
    }
  })

  await settlementFacadeTest.test('settlementParticipantCurrency.getAccountById should', async getAccountByIdTest => {
    try {
      await getAccountByIdTest.test('retrieve account by id', async test => {
        try {
          const params = {settlementParticipantCurrencyId: 1}
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          builderStub.join = sandbox.stub()
          let joinStub = sandbox.stub()
          let selectStub = sandbox.stub()
          let whereStub = sandbox.stub()
          builderStub.join.returns({
            join: joinStub.returns({
              select: selectStub.returns({
                where: whereStub
              })
            })
          })
          await SettlementFacade.settlementParticipantCurrency.getAccountById(params)
          test.ok(builderStub.join.withArgs('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'settlementParticipantCurrency.currentStateChangeId').calledOnce)
          test.ok(joinStub.withArgs('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId').calledOnce)
          test.ok(selectStub.withArgs('pc.participantId AS participantId',
            'settlementParticipantCurrency.participantCurrencyId',
            'spcsc.settlementStateId AS state',
            'spcsc.reason AS reason',
            'settlementParticipantCurrency.netAmount as netAmount',
            'pc.currencyId AS currency').calledOnce)
          test.ok(whereStub.withArgs(params).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getAccountById failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getAccountByIdTest.test('throw error if query is wrong', async test => {
        try {
          const params = {settlementId: 1}
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          await SettlementFacade.settlementParticipantCurrency.getAccountById(params)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getAccountById failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getAccountByIdTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getAccountByIdTest.fail()
      getAccountByIdTest.end()
    }
  })

  await settlementFacadeTest.test('settlementParticipantCurrency.getAccountsByListOfIds should', async getAccountsByListOfIdsTest => {
    try {
      await getAccountsByListOfIdsTest.test('retrieve accounts by list of ids', async test => {
        try {
          const settlementParticipantCurrencyIdList = [1]
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          builderStub.join = sandbox.stub()
          let joinStub = sandbox.stub()
          let selectStub = sandbox.stub()
          let whereInStub = sandbox.stub()
          builderStub.join.returns({
            join: joinStub.returns({
              select: selectStub.returns({
                whereIn: whereInStub
              })
            })
          })
          await SettlementFacade.settlementParticipantCurrency.getAccountsByListOfIds(settlementParticipantCurrencyIdList)
          test.ok(builderStub.join.withArgs('settlementParticipantCurrencyStateChange AS spcsc', 'spcsc.settlementParticipantCurrencyStateChangeId', 'settlementParticipantCurrency.currentStateChangeId').calledOnce)
          test.ok(joinStub.withArgs('participantCurrency AS pc', 'pc.participantCurrencyId', 'settlementParticipantCurrency.participantCurrencyId').calledOnce)
          test.ok(selectStub.withArgs('pc.participantId AS participantId',
            'settlementParticipantCurrency.participantCurrencyId',
            'spcsc.settlementStateId AS state',
            'spcsc.reason AS reason',
            'settlementParticipantCurrency.netAmount as netAmount',
            'pc.currencyId AS currency').calledOnce)
          test.ok(whereInStub.withArgs('settlementParticipantCurrencyId', settlementParticipantCurrencyIdList).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getAccountsByListOfIds failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getAccountsByListOfIdsTest.test('throw error if query is wrong', async test => {
        try {
          const settlementParticipantCurrencyIdList = {settlementId: 1}
          Db.settlementParticipantCurrency = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementParticipantCurrency.query.callsArgWith(0, builderStub)
          await SettlementFacade.settlementParticipantCurrency.getAccountsByListOfIds(settlementParticipantCurrencyIdList)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getAccountsByListOfIds failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getAccountsByListOfIdsTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getAccountsByListOfIdsTest.fail()
      getAccountsByListOfIdsTest.end()
    }
  })

  await settlementFacadeTest.test('settlementSettlementWindow.getWindowsBySettlementIdAndAccountId should', async getWindowsBySettlementIdAndAccountIdTest => {
    try {
      await getWindowsBySettlementIdAndAccountIdTest.test('retrieve settlement window by settlement id and account id', async test => {
        try {
          const params = {settlementId: 1, accountId: 1}
          Db.settlementSettlementWindow = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementSettlementWindow.query.callsArgWith(0, builderStub)
          builderStub.join = sandbox.stub()
          let join2Stub = sandbox.stub()
          let context = sandbox.stub()
          context.on = sandbox.stub()
          let on2Stub = sandbox.stub()
          context.on.returns({
            on: on2Stub
          })
          let join3Stub = sandbox.stub()
          join3Stub.callsArgOn(1, context)
          let distinctStub = sandbox.stub()
          let selectStub = sandbox.stub()
          let whereStub = sandbox.stub()
          builderStub.join.returns({
            join: join2Stub.returns({
              join: join3Stub.returns({
                distinct: distinctStub.returns({
                  select: selectStub.returns({
                    where: whereStub
                  })
                })
              })
            })
          })
          await SettlementFacade.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId(params)
          test.ok(builderStub.join.withArgs('settlementWindow AS sw', 'sw.settlementWindowId', 'settlementSettlementWindow.settlementWindowId').calledOnce)
          test.ok(join2Stub.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId').calledOnce)
          test.equal(join3Stub.getCall(0).args[0], 'settlementTransferParticipant AS stp')
          test.ok(context.on.withArgs('stp.settlementWindowId', 'sw.settlementWindowId').calledOnce)
          test.ok(on2Stub.withArgs('stp.participantCurrencyId', params.accountId).calledOnce)
          test.ok(distinctStub.withArgs('settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(selectStub.calledOnce)
          test.ok(whereStub.withArgs({settlementId: params.settlementId}).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getWindowsBySettlementIdAndAccountId failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getWindowsBySettlementIdAndAccountIdTest.test('throw error if query is wrong', async test => {
        try {
          const params = {settlementId: 1}
          Db.settlementSettlementWindow = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementSettlementWindow.query.callsArgWith(0, builderStub)
          await SettlementFacade.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId(params)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getWindowsBySettlementIdAndAccountId failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getWindowsBySettlementIdAndAccountIdTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getWindowsBySettlementIdAndAccountIdTest.fail()
      getWindowsBySettlementIdAndAccountIdTest.end()
    }
  })

  await settlementFacadeTest.test('settlementSettlementWindow.getWindowsBySettlementIdAndParticipantId should', async getWindowsBySettlementIdAndParticipantIdTest => {
    try {
      await getWindowsBySettlementIdAndParticipantIdTest.test('retrieve settlement window by settlement id and account id', async test => {
        try {
          const params = {settlementId: 1, accountId: 1}
          Db.settlementSettlementWindow = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementSettlementWindow.query.callsArgWith(0, builderStub)
          builderStub.join = sandbox.stub()
          let join2Stub = sandbox.stub()
          let context = sandbox.stub()
          context.on = sandbox.stub()
          let onInStub = sandbox.stub()
          context.on.returns({
            onIn: onInStub
          })
          Db.participantCurrency = {find: sandbox.stub()}
          let join3Stub = sandbox.stub()
          join3Stub.callsArgOn(1, context)
          let distinctStub = sandbox.stub()
          let selectStub = sandbox.stub()
          let whereStub = sandbox.stub()
          builderStub.join.returns({
            join: join2Stub.returns({
              join: join3Stub.returns({
                distinct: distinctStub.returns({
                  select: selectStub.returns({
                    where: whereStub
                  })
                })
              })
            })
          })
          await SettlementFacade.settlementSettlementWindow.getWindowsBySettlementIdAndParticipantId(params)
          test.ok(builderStub.join.withArgs('settlementWindow AS sw', 'sw.settlementWindowId', 'settlementSettlementWindow.settlementWindowId').calledOnce)
          test.ok(join2Stub.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId').calledOnce)
          test.equal(join3Stub.getCall(0).args[0], 'settlementTransferParticipant AS stp')
          test.ok(context.on.withArgs('stp.settlementWindowId', 'sw.settlementWindowId').calledOnce)
          test.equal(onInStub.getCall(0).args[0], 'stp.participantCurrencyId')
          test.ok(distinctStub.withArgs('settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(selectStub.calledOnce)
          test.ok(whereStub.withArgs({settlementId: params.settlementId}).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getWindowsBySettlementIdAndParticipantId failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getWindowsBySettlementIdAndParticipantIdTest.test('throw error if query is wrong', async test => {
        try {
          const params = {settlementId: 1}
          Db.settlementSettlementWindow = {query: sandbox.stub()}
          let builderStub = sandbox.stub()
          Db.settlementSettlementWindow.query.callsArgWith(0, builderStub)
          await SettlementFacade.settlementSettlementWindow.getWindowsBySettlementIdAndParticipantId(params)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getWindowsBySettlementIdAndParticipantId failed with error - ${err}`)
          test.pass('Error thrown')
          test.end()
        }
      })

      await getWindowsBySettlementIdAndParticipantIdTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getWindowsBySettlementIdAndParticipantIdTest.fail()
      getWindowsBySettlementIdAndParticipantIdTest.end()
    }
  })

  await settlementFacadeTest.end()
})
