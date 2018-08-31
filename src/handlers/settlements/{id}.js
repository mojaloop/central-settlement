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

 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

'use strict'

const Boom = require('boom')

const settlement = require('../../domain/settlement/index')
// const dataAccess = require('../../../tests/data/settlements/{id}')
const Logger = require('@mojaloop/central-services-shared').Logger
const Path = require('path')

Logger.info('path ', Path.basename(__filename))

/**
 * Operations on /settlements/{id}
 */
module.exports = {
  /**
     * summary: Returns Settlement(s) as per parameters/filter criteria.
     * description:
     * parameters: id
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
  get: async function getSettlementById (request, h) {
    const Enums = await request.server.methods.enums('settlementStates')
    const settlementId = request.params.id
    try {
      request.server.log('info', `get settlement by Id requested with id ${settlementId}`)
      let settlementResult = await settlement.getById({settlementId}, Enums, {logger: request.server.log})
      return h.response(settlementResult)
    } catch (e) {
      request.server.log('error', `ERROR settlementWindowId: ${settlementId} not found`)
      return Boom.notFound(e.message)
    }
  },
  /**
     * summary: Acknowledegement of settlement by updating with Settlements Id.
     * description:
     * parameters: id, settlementUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */

  put: async function updateSettlementById (request, h) {
    // TODO
    const settlementId = request.params.id
    const Enums = await request.server.methods.enums('settlementStates')
    try {
      return await settlement.putById(settlementId, request.payload, Enums, {logger: request.server.log})
    } catch (e) {
      throw (Boom.boomify(e))
    }
  }
}
