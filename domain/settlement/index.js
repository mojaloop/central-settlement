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

const settlementsModel = require('../../db-model/settlement/index');
const centralLogger = require('@mojaloop/central-services-shared').Logger

module.exports = {
    getSettlementsByParams: async function (params, options = {}) {
        // 7 filters - at least one should be used
        if (Object.keys(params.filters).length && Object.keys(params.filters).length < 8) {
            let {accountId, settlementWindowId, currency, participantId, state, fromDateTime, toDateTime} = params.filters
            accountId = accountId ? accountId : 'IS NOT NULL'
            settlementWindowId = settlementWindowId ? settlementWindowId : 'IS NOT NULL'
            currency = currency ? currency : 'IS NOT NULL'
            fromDateTime = fromDateTime ? fromDateTime : new Date('01-01-1970').toISOString()
            toDateTime = toDateTime ? toDateTime : new Date().toISOString()
            state = state ? ` = ${state.toUpperCase()}` : 'IS NOT NULL'
            params.filters = Object.assign(params.filters, {
                accountId,
                settlementWindowId,
                currency,
                participantId,
                state,
                fromDateTime,
                toDateTime
            })
            return await settlementsModel.getByParams(params)
        } else {
            throw new Error('at least one parameter must be provided : accountId, settlementWindowId, currency, participantId, state, fromDateTime, toDateTime')
        }
    }
}
