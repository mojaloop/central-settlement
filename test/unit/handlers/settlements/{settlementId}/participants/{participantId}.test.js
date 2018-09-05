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
const dataAccess = require('../../../../../test/data/settlements/{settlementId}/participants/{participantId}')
const Logger = require('@mojaloop/central-services-shared').Logger
const Path = require('path')

Logger.info('path ', Path.basename(__filename))

/**
 * Operations on /settlements/{settlementId}/participants/{participantId}
 */
module.exports = {
  /**
     * summary: Acknowledegement of settlement by updating with Settlements Id and Participant Id.
     * description:
     * parameters: settlementId, participantId, settlementParticipantUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
  put: async function updateSettlementBySettlementParticipant (request, h) {
    const getData = new Promise((resolve, reject) => {
      switch (request.server.app.responseCode) {
        case 200:
        case 400:
        case 401:
        case 404:
        case 415:
          dataAccess.put[`${request.server.app.responseCode}`](request, h, (error, mock) => {
            if (error) reject(error)
            else if (!mock.responses) resolve()
            else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), {statusCode: mock.responses.code}))
            else resolve(mock.responses)
          })
          break
        default:
          dataAccess.put[`default`](request, h, (error, mock) => {
            if (error) reject(error)
            else if (!mock.responses) resolve()
            else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), {statusCode: mock.responses.code}))
            else resolve(mock.responses)
          })
      }
    })
    try {
      return await getData
    } catch (e) {
      throw (Boom.boomify(e))
    }
  }
}
