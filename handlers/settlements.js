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

'use strict';
const dataAccess = require('../data/settlements');
const Boom = require('boom');
const Logger = require('@mojaloop/central-services-shared').Logger
const Path = require('path');
const Settlements = require('./../domain/settlement')

Logger.info('path ', Path.basename(__filename));

/**
 * Operations on /settlements
 */
module.exports = {
  /**
   * summary: Returns Settlement(s) as per parameter(s).
   * description: 
   * parameters: currency, participantId, settlementWindowId, accountId, state, fromDateTime, toDateTime
   * produces: application/json
   * responses: 200, 400, 401, 404, 415, default
   */
  get: async function getSettlementsByParams(request, h) {
    const getData = new Promise((resolve, reject) => {
      switch (request.server.app.responseCode) {
        case 200:
        case 400:
        case 401:
        case 404:
        case 415:
          dataAccess.get[`${request.server.app.responseCode}`](request, h, (error, mock) => {
            if (error) reject(error)
            else if (!mock.responses) resolve()
            else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), { statusCode: mock.responses.code }))
            else resolve(mock.responses)
          })
          break
        default:
          dataAccess.get[`default`](request, h, (error, mock) => {
            if (error) reject(error)
            else if (!mock.responses) resolve()
            else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), { statusCode: mock.responses.code }))
            else resolve(mock.responses)
          })
      }

    })
    try {
      return await getData
    } catch (e) {
      throw (Boom.boomify(e))
    }
  },
  /**
   * summary: Trigger the creation of a settlement event, that does the calculation of the net settlement position per participant and marks all transfers in the affected windows as Pending settlement. Returned dataset is the net settlement report for the settlementwindow
   * description: 
   * parameters: settlementEventPayload
   * produces: application/json
   * responses: 200, 400, 401, 404, 415, default
   */
  post: async function postSettlementEvent(request, h) {
    try {
      const Enums = {
        settlementStates: await request.server.methods.enums('settlementStates'),
        settlementWindowStates: await request.server.methods.enums('settlementWindowStates'),
        transferStates: await request.server.methods.enums('transferStates'),
        transferParticipantRoleTypes: await request.server.methods.enums('transferParticipantRoleTypes'),
        ledgerEntryTypes: await  request.server.methods.enums('ledgerEntryTypes')
      }
      let settlementResult = await Settlements.settlementEventTriger(request.payload, Enums, { logger: request.server.log })
      return h.response(settlementResult)
    } catch (e) {
      request.server.log('error', e)
      return Boom.notFound(e.message)
    }
  }
}
