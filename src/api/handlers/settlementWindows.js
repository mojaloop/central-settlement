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
 - Deon Botha <deon.botha@modusbox.com>
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 - Miguel de Barros <miguel.debarros@modusbox.com>
 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 - Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/
'use strict'

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const settlementWindows = require('../../domain/settlementWindow/index')

/**
 * Operations on /settlementWindows
 */
module.exports = {
  /**
     * summary: Returns a Settlement Window(s) as per parameter(s).
     * description:
     * parameters: participantId, state, fromDateTime, toDateTime
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
  get: async function getSettlementWindowsByParams (request, h) {
    try {
      const Enums = await request.server.methods.enums('settlementWindowStates')
      const settlementWindowResult = await settlementWindows.getByParams({ query: request.query }, Enums)
      return h.response(settlementWindowResult)
    } catch (err) {
      request.server.log('error', err)
      return ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }
}
