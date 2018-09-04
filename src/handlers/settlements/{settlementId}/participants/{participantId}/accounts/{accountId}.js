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

const Boom = require('boom')
const dataAccess = require('../../../../../../../test/data/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}')
const Settlements = require('../../../../../../domain/settlement')

/**
 * Operations on /settlements/{settlementId}/participants/{participantId}/accounts/{accountId}
 */
module.exports = {
  /**
   * summary: Returns Settlement(s) as per filter criteria.
   * description:
   * parameters: settlementId, participantId, accountId
   * produces: application/json
   * responses: 200, 400, 401, 404, 415, default
   */

  get: async function getSettlementBySettlementParticipantAccount (request, h) {
    const Enums = await request.server.methods.enums('settlementWindowStates')
    const { settlementId, participantId, accountId } = request.params
    try {
      let result = await Settlements.getByIdParticipantAccount({ settlementId, participantId, accountId }, Enums, { logger: request.server.log })
      return h.response(result)
    } catch (e) {
      return Boom.boomify(e)
    }
  },
  /**
   * summary: Acknowledegement of settlement by updating the reason and state by Settlements Id, Participant Id and accounts Id.
   * description:
   * parameters: settlementId, participantId, accountId, settlementParticipantAccountUpdate
   * produces: application/json
   * responses: 200, 400, 401, 404, 415, default
   */
  put: async function updateSettlementBySettlementParticipantAccount (request, h) {
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
            else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), { statusCode: mock.responses.code }))
            else resolve(mock.responses)
          })
          break
        default:
          dataAccess.put[`default`](request, h, (error, mock) => {
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
  }
}
