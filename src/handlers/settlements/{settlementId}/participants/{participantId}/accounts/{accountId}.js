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
 * Deon Botha <deon.botha@modusbox.com>
 --------------
 ******/

'use strict'

const Boom = require('boom')
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
    try {
      const Enums = {
        settlementWindowStates: await request.server.methods.enums('settlementWindowStates'),
        ledgerAccountTypes: await request.server.methods.enums('ledgerAccountTypes')
      }
      const { settlementId, participantId, accountId } = request.params
      let result = await Settlements.getByIdParticipantAccount({ settlementId, participantId, accountId }, Enums)
      return h.response(result)
    } catch (e) {
      request.server.log('error', e)
      return Boom.badRequest(e)
    }
  },

  /**
   * summary: Acknowledgement of settlement by updating with Settlements Id.
   * description:
   * parameters: id, participantId, settlementUpdatePayload
   * produces: application/json
   * responses: 200, 400, 401, 404, 415, default
   */
  put: async function updateSettlementById (request) {
    const settlementId = request.params.settlementId
    const participantId = request.params.participantId
    const accountId = request.params.accountId
    try {
      const accounts = [Object.assign({}, request.payload, { id: accountId })]
      const universalPayload = {
        participants: [
          {
            id: participantId,
            accounts
          }
        ]
      }
      const Enums = {
        ledgerAccountTypes: await request.server.methods.enums('ledgerAccountTypes'),
        ledgerEntryTypes: await request.server.methods.enums('ledgerEntryTypes'),
        participantLimitTypes: await request.server.methods.enums('participantLimitTypes'),
        settlementStates: await request.server.methods.enums('settlementStates'),
        settlementWindowStates: await request.server.methods.enums('settlementWindowStates'),
        transferParticipantRoleTypes: await request.server.methods.enums('transferParticipantRoleTypes'),
        transferStates: await request.server.methods.enums('transferStates')
      }
      return await Settlements.putById(settlementId, universalPayload, Enums)
    } catch (e) {
      request.server.log('error', e)
      return Boom.badRequest(e)
    }
  }
}
