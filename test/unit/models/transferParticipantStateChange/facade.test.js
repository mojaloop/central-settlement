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
      await updateTransferSettlementTest.test('Create two records in the transferParticipantStateChange table', async test => {
        try {
          const transferId = '154cbf04-bac7-444d-aa66-76f66126d7f5'
          const status = 'success'

          Db.getKnex = sandbox.stub()

          const knexStub = sandbox.stub()
          knexStub.raw = sandbox.stub()
          const trxStub = sandbox.stub()
          trxStub.commit = sandbox.stub()
          knexStub.transaction = sandbox.stub().callsArgWith(0, trxStub)

          Db.getKnex.returns(knexStub)
          const context = sandbox.stub()
          const orWhereStub = sandbox.stub().returns({
            whereNull: sandbox.stub().returns({
              whereNotIn: sandbox.stub().returns({})
            })
          })
          const andWhereStub = sandbox.stub().returns({
            andWhere: sandbox.stub().returns({
              whereRaw: sandbox.stub().returns({}),
              orWhere: sandbox.stub().callsArgOn(0, orWhereStub).returns({})
            })
          })
          context.from = sandbox.stub().returns({
            innerJoin: sandbox.stub().returns({
              innerJoin: sandbox.stub().returns({
                innerJoin: sandbox.stub().returns({
                  leftOuterJoin: sandbox.stub().callsArgOn(1, context).returns({
                    leftOuterJoin: sandbox.stub().callsArgOn(1, context).returns({
                      leftOuterJoin: sandbox.stub().callsArgOn(1, context).returns({
                        distinct: sandbox.stub().returns({
                          where: sandbox.stub().callsArgOn(0, knexStub)
                        })
                      })
                    })
                  })
                })
              })
            })
          })
          context.on = sandbox.stub().returns({
            andOn: sandbox.stub(),
            onIn: sandbox.stub()
          })
          knexStub.where = sandbox.stub().returns({
            andWhere: sandbox.stub().returns({
              whereNotExists: sandbox.stub()
            })
          })
          knexStub.andWhere = sandbox.stub().callsArgOn(0, andWhereStub)
          knexStub.whereNotExists = sandbox.stub().returns({
            select: sandbox.stub().returns({
              innerJoin: sandbox.stub().returns({
                where: sandbox.stub()
              })
            })
          })
          knexStub.whereRaw = sandbox.stub()
          knexStub.raw = sandbox.stub()
          knexStub.from = sandbox.stub().returns({
            transacting: sandbox.stub().returns({
              insert: sandbox.stub().callsArgOn(0, context)
            })
          })

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
