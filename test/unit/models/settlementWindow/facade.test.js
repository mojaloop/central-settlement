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
const Db = require('../../../../src/lib/db')
const Logger = require('@mojaloop/central-services-shared').Logger
const SettlementWindowFacade = require('../../../../src/models/settlementWindow/facade')

Logger.error('this is error')

Test('Settlement Window facade', async (settlementWindowFacadeTest) => {
  let sandbox
  let clock
  let now = new Date()
  let builderStub
  let selectStub
  let firstStub
  let whereStub
  let whereRawStub
  let orderByStub
  let distinctStub
  let selectStubResult
  let leftJoin2Stub
  let leftJoin3Stub
  let leftJoin4Stub
  let join2Stub

  settlementWindowFacadeTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    clock = Sinon.useFakeTimers(now.getTime())
    Db.settlementWindow = {
      query: sandbox.stub()
    }
    Db.settlementSettlementWindow = {
      query: sandbox.stub()
    }
    builderStub = sandbox.stub()
    Db.settlementWindow.query.callsArgWith(0, builderStub)
    Db.settlementSettlementWindow.query.callsArgWith(0, builderStub)
    builderStub.leftJoin = sandbox.stub()
    builderStub.join = sandbox.stub()
    selectStub = sandbox.stub()
    firstStub = sandbox.stub()
    whereStub = sandbox.stub()
    whereRawStub = sandbox.stub()
    orderByStub = sandbox.stub()
    distinctStub = sandbox.stub()
    selectStubResult = {
      first: firstStub.returns({
        where: whereStub
      }),
      whereRaw: whereRawStub.returns({
        orderBy: orderByStub
      }),
      orderBy: orderByStub.returns({
        distinct: distinctStub.returns({
          where: whereStub.returns({
            where: whereStub.returns({
              where: whereStub
            })
          })
        })
      })
    }
    leftJoin2Stub = sandbox.stub()
    leftJoin3Stub = sandbox.stub()
    leftJoin4Stub = sandbox.stub()
    builderStub.leftJoin.returns({
      select: selectStub.returns(selectStubResult),
      leftJoin: leftJoin2Stub.returns({
        leftJoin: leftJoin3Stub.returns({
          leftJoin: leftJoin4Stub.returns({
            select: selectStub.returns(selectStubResult)
          })
        })
      })
    })
    test.end()
  })

  settlementWindowFacadeTest.afterEach(test => {
    sandbox.restore()
    clock.restore()
    test.end()
  })

  await settlementWindowFacadeTest.test('getById should', async getByIdTest => {
    try {
      const settlementWindowId = 1
      const enums = {}
      const settlementWindowResultStub = { settlementWindowId: 1, state: 'SETTLED' }
      let e

      await getByIdTest.test('retrieve settlement window data by id', async test => {
        try {
          Db.settlementWindow.query.returns(Promise.resolve(settlementWindowResultStub))

          let result = await SettlementWindowFacade.getById({ settlementWindowId }, enums)
          test.ok(result, 'Result returned')
          test.ok(builderStub.leftJoin.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId').calledOnce)
          test.ok(selectStub.withArgs('settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(firstStub.calledOnce)
          test.ok(whereStub.withArgs('settlementWindow.settlementWindowId', settlementWindowId).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getById failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByIdTest.test('throw error if database is unavailable', async test => {
        try {
          e = new Error('Database unavailable')
          Db.settlementWindow.query.throws(e)

          await SettlementWindowFacade.getById({ settlementWindowId })
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getById failed with error - ${err}`)
          test.equal(err.message, e.message, `Error "${err.message}" thrown as expected`)
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

  await settlementWindowFacadeTest.test('getByListOfIds should', async getByListOfIdsTest => {
    try {
      const listOfIds = [1, 2]
      const enums = {}
      const settlementWindowResultStub = [{
        settlementWindowId: 1,
        state: 'SETTLED'
      }, {
        settlementWindowId: 2,
        state: 'ABORTED'
      }]
      let e

      await getByListOfIdsTest.test('retrieve settlement windows data by list of ids', async test => {
        try {
          Db.settlementWindow.query.returns(Promise.resolve(settlementWindowResultStub))

          let result = await SettlementWindowFacade.getByListOfIds(listOfIds, enums)
          test.ok(result, 'Result returned')
          test.ok(builderStub.leftJoin.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId').calledOnce)
          test.ok(selectStub.withArgs('settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(whereRawStub.withArgs(`settlementWindow.settlementWindowId IN (${listOfIds})`).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getByListOfIds failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByListOfIdsTest.test('throw error if database is unavailable', async test => {
        try {
          e = new Error('Database unavailable')
          Db.settlementWindow.query.throws(e)
          await SettlementWindowFacade.getByListOfIds(listOfIds)
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getByListOfIds failed with error - ${err}`)
          test.equal(err.message, e.message, `Error "${err.message}" thrown as expected`)
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

  await settlementWindowFacadeTest.test('getByParams should', async getByParamsTest => {
    try {
      let participantId = 1
      const state = 'PENDING_SETTLEMENT'
      const fromDateTime = new Date('01-01-1970').toISOString()
      const toDateTime = new Date().toISOString()
      let query = { participantId, state, fromDateTime, toDateTime }
      const settlementWindowResultStub = [{
        settlementWindowId: 1,
        state: 'PENDING_SETTLEMENT'
      }, {
        settlementWindowId: 2,
        state: 'PENDING_SETTLEMENT'
      }]
      const enums = {}
      let e

      await getByParamsTest.test('retrieve settlement windows by params', async test => {
        try {
          Db.settlementWindow.query.returns(Promise.resolve(settlementWindowResultStub))

          let result = await SettlementWindowFacade.getByParams({ query }, enums)
          test.ok(result, 'Result returned')
          test.ok(builderStub.leftJoin.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId').calledOnce)
          test.ok(leftJoin2Stub.withArgs('transferFulfilment AS tf', 'tf.settlementWindowId', 'settlementWindow.settlementWindowId').calledOnce)
          test.ok(leftJoin3Stub.withArgs('transferParticipant AS tp', 'tp.transferId', 'tf.transferId').calledOnce)
          test.ok(leftJoin4Stub.withArgs('participantCurrency AS pc', 'pc.participantCurrencyId', 'tp.participantCurrencyId').calledOnce)
          test.ok(selectStub.withArgs('settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(orderByStub.withArgs('changedDate', 'desc').calledOnce)
          test.ok(distinctStub.calledOnce)
          test.ok(whereStub.withArgs('pc.participantId', participantId).calledOnce)
          test.ok(whereStub.withArgs('swsc.settlementWindowStateId', state).calledOnce)
          test.ok(whereStub.withArgs('settlementWindow.createdDate', '>=', fromDateTime).calledOnce)
          test.ok(whereStub.withArgs('settlementWindow.createdDate', '<=', toDateTime).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getByParams failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByParamsTest.test('retrieve settlement windows by params', async test => {
        try {
          Db.settlementWindow.query.returns(Promise.resolve(settlementWindowResultStub))

          query = { participantId }
          let result = await SettlementWindowFacade.getByParams({ query }, enums)
          test.ok(result, 'Result returned')
          test.ok(builderStub.leftJoin.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId').calledOnce)
          test.ok(leftJoin2Stub.withArgs('transferFulfilment AS tf', 'tf.settlementWindowId', 'settlementWindow.settlementWindowId').calledOnce)
          test.ok(leftJoin3Stub.withArgs('transferParticipant AS tp', 'tp.transferId', 'tf.transferId').calledOnce)
          test.ok(leftJoin4Stub.withArgs('participantCurrency AS pc', 'pc.participantCurrencyId', 'tp.participantCurrencyId').calledOnce)
          test.ok(selectStub.withArgs('settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(orderByStub.withArgs('changedDate', 'desc').calledOnce)
          test.ok(distinctStub.calledOnce)
          test.ok(whereStub.withArgs('pc.participantId', participantId).calledOnce)
          test.ok(whereStub.withArgs('swsc.settlementWindowStateId', state).notCalled)
          test.ok(whereStub.withArgs('settlementWindow.createdDate', '>=', fromDateTime).notCalled)
          test.ok(whereStub.withArgs('settlementWindow.createdDate', '<=', toDateTime).notCalled)
          test.end()
        } catch (err) {
          Logger.error(`getByParams failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByParamsTest.test('retrieve settlement windows by params', async test => {
        try {
          Db.settlementWindow.query.returns(Promise.resolve(settlementWindowResultStub))

          query = { state, fromDateTime, toDateTime }
          let result = await SettlementWindowFacade.getByParams({ query }, enums)
          test.ok(result, 'Result returned')
          test.ok(builderStub.leftJoin.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId').calledOnce)
          test.ok(selectStub.withArgs('settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(orderByStub.withArgs('changedDate', 'desc').calledOnce)
          test.ok(distinctStub.calledOnce)
          test.ok(whereStub.withArgs('swsc.settlementWindowStateId', state).calledOnce)
          test.ok(whereStub.withArgs('settlementWindow.createdDate', '>=', fromDateTime).calledOnce)
          test.ok(whereStub.withArgs('settlementWindow.createdDate', '<=', toDateTime).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getByParams failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByParamsTest.test('retrieve settlement windows by params', async test => {
        try {
          query = {}
          Db.settlementWindow.query.returns(Promise.resolve(settlementWindowResultStub))

          let result = await SettlementWindowFacade.getByParams({ query })
          test.ok(result, 'Result returned')
          test.ok(builderStub.leftJoin.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'settlementWindow.currentStateChangeId').calledOnce)
          test.ok(selectStub.withArgs('settlementWindow.settlementWindowId',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'settlementWindow.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(orderByStub.withArgs('changedDate', 'desc').calledOnce)
          test.ok(distinctStub.calledOnce)
          test.ok(whereStub.withArgs('swsc.settlementWindowStateId', state).notCalled)
          test.ok(whereStub.withArgs('settlementWindow.createdDate', '>=', fromDateTime).notCalled)
          test.ok(whereStub.withArgs('settlementWindow.createdDate', '<=', toDateTime).notCalled)
          test.end()
        } catch (err) {
          Logger.error(`getByParams failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getByParamsTest.test('throw error if database is unavailable', async test => {
        try {
          e = new Error('Database unavailable')
          Db.settlementWindow.query.throws(e)
          await SettlementWindowFacade.getByParams({ query })
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getByParams failed with error - ${err}`)
          test.equal(err.message, e.message, `Error "${err.message}" thrown as expected`)
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

  await settlementWindowFacadeTest.test('close should', async closeTest => {
    try {
      let settlementWindowCurrentStateMock = { state: 'OPEN' }
      const settlementWindowId = 1
      const state = 'CLOSED'
      const reason = 'close reason text'
      const params = { settlementWindowId, state, reason }
      let enums = { OPEN: 'OPEN' }

      await closeTest.test('close the specified open window and open a new one', async test => {
        try {
          Db.getKnex = sandbox.stub()
          const knexStub = sandbox.stub()
          const trxStub = sandbox.stub()
          trxStub.commit = sandbox.stub()
          knexStub.transaction = sandbox.stub().callsArgWith(0, trxStub)
          Db.getKnex.returns(knexStub)
          const transactingStub = sandbox.stub()
          const settlementWindowStateChangeIdMock = 2
          const newSettlementWindowIdMock = [2]
          const newSettlementWindowStateChangeIdMock = 5
          let insertStub = sandbox.stub()
          insertStub.onCall(0).returns(settlementWindowStateChangeIdMock)
          insertStub.onCall(1).returns(newSettlementWindowIdMock)
          insertStub.onCall(2).returns(newSettlementWindowStateChangeIdMock)
          const whereStub = sandbox.stub()
          const updateStub = sandbox.stub()
          knexStub.returns({
            transacting: transactingStub.returns({
              insert: insertStub,
              where: whereStub.returns({
                update: updateStub
              })
            })
          })

          SettlementWindowFacade.getById = sandbox.stub().returns(settlementWindowCurrentStateMock)
          let result = await SettlementWindowFacade.close(params, enums)
          test.ok(result, 'Result returned')
          test.ok(SettlementWindowFacade.getById.withArgs({ settlementWindowId }).calledOnce)
          test.ok(knexStub.withArgs('settlementWindowStateChange').calledTwice)
          test.equal(transactingStub.withArgs(trxStub).callCount, 5)
          test.ok(insertStub.withArgs({
            settlementWindowStateId: enums[state.toUpperCase()],
            reason,
            settlementWindowId,
            createdDate: now
          }).calledOnce)
          test.ok(knexStub.withArgs('settlementWindow').calledThrice)
          test.ok(whereStub.withArgs({ settlementWindowId }).calledOnce)
          test.ok(updateStub.withArgs({ currentStateChangeId: settlementWindowStateChangeIdMock }).calledOnce)
          test.ok(insertStub.withArgs({ reason, createdDate: now }).calledOnce)
          test.ok(insertStub.withArgs({
            settlementWindowId: newSettlementWindowIdMock[0],
            settlementWindowStateId: enums.OPEN,
            reason,
            createdDate: now
          }).calledOnce)
          test.end()
          test.ok(whereStub.withArgs({ settlementWindowId: newSettlementWindowIdMock }).calledOnce)
          test.ok(updateStub.withArgs({ currentStateChangeId: newSettlementWindowStateChangeIdMock }).calledOnce)

          try {
            insertStub.onCall(3).throws(new Error('Insert into settlementWindowStateChange failed'))
            await SettlementWindowFacade.close(params, enums)
            test.fail('Error expected, but not thrown!')
          } catch (err) {
            test.pass(`Error "${err.message}" thrown as expected`)
          }
        } catch (err) {
          Logger.error(`close failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await closeTest.test('throw error if the requested window is not open', async test => {
        try {
          settlementWindowCurrentStateMock.state = 'CLOSED'
          SettlementWindowFacade.getById = sandbox.stub().returns(settlementWindowCurrentStateMock)
          await SettlementWindowFacade.close(params)
          test.fail('Error not thrown!')
        } catch (err) {
          Logger.error(`close failed with error - ${err}`)
          test.ok(err instanceof Error, `Error "${err.message}" thrown as expected`)
          test.end()
        }
      })

      await closeTest.test('throw error if the requested window does not exist', async test => {
        try {
          SettlementWindowFacade.getById = sandbox.stub().returns(undefined)
          await SettlementWindowFacade.close(params)
          test.fail('Error not thrown!')
        } catch (err) {
          Logger.error(`close failed with error - ${err}`)
          test.ok(err instanceof Error, `Error "${err.message}" thrown as expected`)
          test.end()
        }
      })

      await closeTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      closeTest.fail()
      closeTest.end()
    }
  })

  await settlementWindowFacadeTest.test('getBySettlementId should', async getBySettlementIdTest => {
    try {
      const settlementId = 1
      const enums = {}
      const settlementWindowResultStub = [{ id: 1, state: 'PENDING_SETTLEMENT' }, { id: 2, state: 'SETTLED' }]
      let e

      await getBySettlementIdTest.test('retrieve settlement windows by settlement id', async test => {
        try {
          join2Stub = sandbox.stub()
          builderStub.join.returns({
            join: join2Stub.returns({
              select: selectStub.returns({
                where: whereStub
              })
            })
          })

          Db.settlementSettlementWindow.query.returns(Promise.resolve(settlementWindowResultStub))
          let result = await SettlementWindowFacade.getBySettlementId({ settlementId }, enums)
          test.ok(result, 'Result returned')
          test.ok(builderStub.join.withArgs('settlementWindow AS sw', 'sw.settlementWindowId', 'settlementSettlementWindow.settlementWindowId').calledOnce)
          test.ok(join2Stub.withArgs('settlementWindowStateChange AS swsc', 'swsc.settlementWindowStateChangeId', 'sw.currentStateChangeId').calledOnce)
          test.ok(selectStub.withArgs('sw.settlementWindowId AS id',
            'swsc.settlementWindowStateId as state',
            'swsc.reason as reason',
            'sw.createdDate as createdDate',
            'swsc.createdDate as changedDate').calledOnce)
          test.ok(whereStub.withArgs('settlementSettlementWindow.settlementId', settlementId).calledOnce)
          test.end()
        } catch (err) {
          Logger.error(`getBySettlementId failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await getBySettlementIdTest.test('throw error if database is unavailable', async test => {
        try {
          e = new Error('Database unavailable')
          Db.settlementSettlementWindow.query = sandbox.stub().throws(e)

          await SettlementWindowFacade.getBySettlementId({ settlementId })
          test.fail('Error not thrown!')
          test.end()
        } catch (err) {
          Logger.error(`getBySettlementId failed with error - ${err}`)
          test.equal(err.message, e.message, `Error "${err.message}" thrown as expected`)
          test.end()
        }
      })

      await getBySettlementIdTest.end()
    } catch (err) {
      Logger.error(`settlementFacadeTest failed with error - ${err}`)
      getBySettlementIdTest.fail()
      getBySettlementIdTest.end()
    }
  })

  settlementWindowFacadeTest.end()
})
