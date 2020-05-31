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
const TransferFulfilService = require('../../../../src/domain/transferFulfil')
const TransferFulfilModel = require('../../../../src/models/transferFulfil')

Test('TransferFulfilService', async (transferFulfilServiceTest) => {
  let sandbox

  transferFulfilServiceTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  transferFulfilServiceTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  await transferFulfilServiceTest.test('updateStateChange should', async updateStateChange => {
    try {
      const transferEventId = '154cbf04-bac7-444d-aa66-76f66126d7f5'
      const transferEventStateStatus = 'error'
      const participantSateChangeUpdateMock = true

      await updateStateChange.test('create participant state change records', async test => {
        try {
          TransferFulfilModel.updateStateChange = sandbox.stub().returns(participantSateChangeUpdateMock)
          const result = await TransferFulfilService.processMsgFulfil(transferEventId, transferEventStateStatus)
          test.ok(result, 'Result returned')
          test.ok(TransferFulfilModel.updateStateChange.withArgs(transferEventId, transferEventStateStatus).calledOnce, 'TransferFulfilModel.updateStateChange with args ... called once')
          TransferFulfilModel.updateStateChange = sandbox.stub().returns()

          try {
            await TransferFulfilService.processMsgFulfil(transferEventId, transferEventStateStatus)
            test.pass('transferParticipantTable updated')
          } catch (err) {
            test.notOk(err instanceof Error, `Error ${err.message} thrown`)
          }
          test.end()
        } catch (err) {
          Logger.error(`updateStateChangeTest failed with error - ${err}`)
          test.fail()
          test.end()
        }
      })

      await updateStateChange.test('throw an exception', async test => {
        try {
          TransferFulfilModel.updateStateChange = sandbox.stub().throws(new Error('Error occurred'))
          const result = await TransferFulfilService.processMsgFulfil(transferEventId, transferEventStateStatus)
          test.ok(result, 'Result returned')
          test.ok(TransferFulfilModel.updateStateChange.withArgs(transferEventId, transferEventStateStatus).calledOnce, 'TransferFulfilModel.updateStateChange with args ... called once')
          TransferFulfilModel.updateStateChange = sandbox.stub().returns()

          try {
            await TransferFulfilService.processMsgFulfil(transferEventId, transferEventStateStatus)
            test.fail('transferParticipantTable updated')
          } catch (err) {
            test.notOk(err instanceof Error, `Error ${err.message} thrown`)
          }
          test.end()
        } catch (err) {
          Logger.error(`updateStateChangeTest failed with error - ${err}`)
          test.pass()
          test.end()
        }
      })

      await updateStateChange.end()
    } catch (err) {
      Logger.error(`settlementWindowServiceTest failed with error - ${err}`)
      updateStateChange.fail()
      updateStateChange.end()
    }
  })
  await transferFulfilServiceTest.end()
})
