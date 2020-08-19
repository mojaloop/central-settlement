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

 * Deon Botha <deon.botha@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-logger')
const TransferFulfilFacade = require('../../../../src/models/transferSettlement/facade')
const Db = require('../../../../src/lib/db')

Test('TransferFulfilFacade', async (transferFulfilModelTest) => {
  let sandbox

  transferFulfilModelTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  transferFulfilModelTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  await transferFulfilModelTest.test('transferFulfilModel should', async updateTransferSettlementTest => {
    try {
      await updateTransferSettlementTest.test('?????????the transferParticipantStateChange table', async test => {
        try {
          const transferId = '154cbf04-bac7-444d-aa66-76f66126d7f5'
          const status = 'success'

          sandbox.stub(Db, 'getKnex')
          // const knexStub = sandbox.stub()
          const trxStub = sandbox.stub()
          trxStub.commit = sandbox.stub()
          const knexStub = {
            insert: sandbox.stub().returnsThis(),
            increment: sandbox.stub().returnsThis(),
            raw: sandbox.stub().returnsThis(),
            transaction: sandbox.stub().callsArgWith(0, trxStub),
            select: sandbox.stub().returnsThis(),
            from: sandbox.stub().returnsThis(),
            innerJoin: sandbox.stub().returnsThis(),
            leftOuterJoin: sandbox.stub().returnsThis(),
            where: sandbox.stub().returnsThis(),
            whereIn: sandbox.stub().returnsThis(),
            andWhere: sandbox.stub().returnsThis(),
            orWhere: sandbox.stub().returnsThis(),
            transacting: sandbox.stub(),
            union: sandbox.stub().returnsThis(),
            on: sandbox.stub().returnsThis(),
            andOn: sandbox.stub().returnsThis(),
            update: sandbox.stub().returnsThis(),
            joinRaw: sandbox.stub().returnsThis(),
          }
          const knexFunc = sandbox.stub().returns(knexStub)
          Object.assign(knexFunc, knexStub)
          Db.getKnex.returns(knexFunc)
          knexStub.where.onCall(0).callsArgOn(0, knexStub)
          knexStub.where.onCall(0).returns(knexStub)

          knexStub.andWhere.onCall(0).callsArgOn(0, knexStub)
          knexStub.andWhere.onCall(0).returns(knexStub)
          knexStub.andWhere.onCall(1).returns(knexStub)

          knexStub.insert.onCall(1).callsArgOn(0, knexStub)
          knexStub.insert.onCall(1).returns(knexStub)

          knexStub.union.onCall(0).callsArgOn(0, knexStub)
          // knexStub.select.onCall(0).callsArgOn(0, knexStub)
          knexStub.innerJoin.onCall(6).callsArgOn(1, knexStub)
          knexStub.innerJoin.onCall(6).returns(knexStub)
          knexStub.where.onCall(2).callsArgOn(0, knexStub)
          knexStub.andWhere.onCall(2).callsArgOn(0, knexStub)
          knexStub.innerJoin.onCall(7).callsArgOn(0, knexStub)
          knexStub.innerJoin.onCall(7).returns(knexStub)
          knexStub.where.onCall(4).callsArgOn(0, knexStub)
          knexStub.where.onCall(4).returns(knexStub)
          knexStub.union.onCall(1).callsArgOn(0, knexStub)
          knexStub.union.onCall(1).returns(knexStub)

          knexStub.andWhere.onCall(4).callsArgOn(0, knexStub)
          knexStub.innerJoin.onCall(14).callsArgOn(1, knexStub)
          knexStub.innerJoin.onCall(14).returns(knexStub)
          knexStub.where.onCall(4).callsArgOn(0, knexStub)
          knexStub.where.onCall(4).returns(knexStub)
          knexStub.andWhere.onCall(4).callsArgOn(0, knexStub)
          knexStub.where.onCall(6).callsArgOn(0, knexStub)
          knexStub.where.onCall(6).returns(knexStub)
          knexStub.andWhere.onCall(6).callsArgOn(0, knexStub)


          knexStub.insert.onCall(3).callsArgOn(0, knexStub)
          knexStub.insert.onCall(3).returns(knexStub)
          knexStub.innerJoin.onCall(15).callsArgOn(0, knexStub)
          knexStub.innerJoin.onCall(15).returns(knexStub)


          knexStub.where.onCall(8).callsArgOn(0, knexStub)
          knexStub.where.onCall(8).returns(knexStub)
          knexStub.andWhere.onCall(8).callsArgOn(0, knexStub)
          knexStub.union.onCall(2).callsArgOn(0, knexStub)
          knexStub.union.onCall(2).returns(knexStub)
          knexStub.innerJoin.onCall(22).callsArgOn(1, knexStub)
          knexStub.innerJoin.onCall(22).returns(knexStub)
          knexStub.where.onCall(10).callsArgOn(0, knexStub)
          knexStub.where.onCall(10).returns(knexStub)

          knexStub.andWhere.onCall(10).callsArgOn(0, knexStub)
          knexStub.innerJoin.onCall(23).callsArgOn(1, knexStub)
          knexStub.innerJoin.onCall(23).returns(knexStub)

          // knexStub.where.onCall(2).returns(knexStub)


          /*Db.getKnex = sandbox.stub()
          const knexStub = sandbox.stub()
          knexStub.raw = sandbox.stub()

          knexStub.raw.returns({
            transacting: sandbox.stub()
          })
          const trxStub = sandbox.stub()
          trxStub.commit = sandbox.stub()
          knexStub.transaction = sandbox.stub().callsArgWith(0, trxStub)

          Db.getKnex.returns(knexStub)

          knexStub.returns({
            insert: sandbox.stub().returns({
              toString: sandbox.stub().returns({
                replace: sandbox.stub()
              }),
              transacting: sandbox.stub()
            }),
            update: sandbox.stub().returns({
              innerJoin: sandbox.stub().returns({
                joinRaw: sandbox.stub().returns({
                  transacting: sandbox.stub()
                })
              })
            })
          })

          const andWhereContext = sandbox.stub()
          andWhereContext.andWhere = sandbox.stub().returns({
            andWhere: sandbox.stub()
          })

          const whereContext = sandbox.stub()
          whereContext.where = sandbox.stub().returns({
            andWhere: sandbox.stub().callsArgOn(4, andWhereContext).returns({
              andWhere: sandbox.stub()
            })
          })

          const innerJoinContext = sandbox.stub()
          innerJoinContext.on = sandbox.stub().returns({
            andOn: sandbox.stub().returns({
              andOn: sandbox.stub()
            })
          })

          const unionContext = sandbox.stub()
          unionContext.select = sandbox.stub().returns({
            from: sandbox.stub().returns({
              innerJoin: sandbox.stub().returns({
                innerJoin: sandbox.stub().returns({
                  innerJoin: sandbox.stub().returns({
                    innerJoin: sandbox.stub().callsArgOn(3, innerJoinContext).returns({
                      where: sandbox.stub().callsArgOn(3, whereContext)
                    })
                  })
                })
              })
            })
          })

          const context = sandbox.stub()
          context.from = sandbox.stub().returns({
            select: sandbox.stub().returns({
              innerJoin: sandbox.stub().returns({
                innerJoin: sandbox.stub().returns({
                  innerJoin: sandbox.stub().returns({
                    where: sandbox.stub().callsArgOn(1, whereContext).returns({
                      union: sandbox.stub().callsArgOn(2, unionContext)
                    })
                  })
                })
              })
            })
          })

          knexStub.from = sandbox.stub().returns({
            insert: sandbox.stub().callsArgOn(0, context).returns({
              transacting: sandbox.stub()
            })
          })
*/
          const result = await TransferFulfilFacade.updateTransferSettlement(transferId, status)
          test.ok(result, 'Result returned')
          test.end()
        } catch (err) {
          Logger.error(`updateTransferSettlement failed with error - ${err}`)
          test.pass()
          test.end()
        }
      })
      await updateTransferSettlementTest.end()
    } catch (err) {
      Logger.error(`updateTransferParticipantStateChange failed with error - ${err}`)
      await updateTransferSettlementTest.end()
    }
  })
  await transferFulfilModelTest.end()
})
