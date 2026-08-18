/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>
 --------------
 ******/
'use strict'

const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend

const health = require('./health')
const settlementWindows = require('./settlementWindows')
const settlementWindowById = require('./settlementWindows/{id}')
const settlements = require('./settlements')
const settlementById = require('./settlements/{id}')
const settlementParticipant = require('./settlements/{sid}/participants/{pid}')
const settlementParticipantAccount = require('./settlements/{sid}/participants/{pid}/accounts/{aid}')

/**
 * Map of API definition operationIds to route handlers, consumed by
 * openapi-backend. The route handlers keep the hapi `(request, h)`
 * signature, so the openapi-backend context is dropped here.
 */
module.exports = {
  getHealth: (context, request, h) => health.get(request, h),
  getSettlementWindowById: (context, request, h) => settlementWindowById.get(request, h),
  closeSettlementWindow: (context, request, h) => settlementWindowById.post(request, h),
  getSettlementWindowsByParams: (context, request, h) => settlementWindows.get(request, h),
  getSettlementsByParams: (context, request, h) => settlements.get(request, h),
  createSettlement: (context, request, h) => settlements.post(request, h),
  getSettlementById: (context, request, h) => settlementById.get(request, h),
  updateSettlementById: (context, request, h) => settlementById.put(request, h),
  getSettlementBySettlementParticipant: (context, request, h) => settlementParticipant.get(request, h),
  updateSettlementBySettlementParticipant: (context, request, h) => settlementParticipant.put(request, h),
  getSettlementBySettlementParticipantAccount: (context, request, h) => settlementParticipantAccount.get(request, h),
  updateSettlementBySettlementParticipantAccount: (context, request, h) => settlementParticipantAccount.put(request, h),
  validationFail: OpenapiBackend.validationFail,
  notFound: OpenapiBackend.notFound,
  methodNotAllowed: OpenapiBackend.methodNotAllowed
}
