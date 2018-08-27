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

const settlementsModel = require('../../db-model/settlement/index')
const centralLogger = require('@mojaloop/central-services-shared').Logger

module.exports = {
    getById: async function (params, enums, options = {}) {
        let Logger = options.logger || centralLogger
        try {
            let settlement = await settlementsModel.getById(params, enums)
            if (settlement) return settlement
            else {
                let err = new Error('settlement window not found')
                Logger('error', err)
                throw err
            }
        } catch (err) {
            Logger('error', err)
            throw err
        }
    },

    getSettlementsByParams: async function (params, enums, options = {}) {
        // 7 filters - at least one should be used
        let Logger = options.logger || centralLogger
        if (Object.keys(params.query).length && Object.keys(params.query).length < 8) {
            try {
                let result = []
                let settlements = await settlementsModel.getByParams(params, enums)
                if (settlements && settlements.length > 0) {
                    for (let settlement of settlements) {
                        result.push({
                            accountId: settlement.accountId,
                            currency: settlement.currency,
                            participantId: settlement.participantId,
                            //state: settlement.state, //Not sure
                            fromDateTime: settlement.fromDateTime,
                            toDateTime: settlement.toDateTime
                        })
                    }
                    return result
                }
                else {
                    let err = new Error('settlement not found')
                    Logger('error', err)
                    throw err
                }
            } catch (err) {
                Logger('error', err)
                throw err
            }
        } else {
            let err = new Error('use at least one parameter: accountId, settlementWindowId, currency, participantId, state, fromDateTime, toDateTime')
            Logger('error', err)
            throw err
        }
    },

    settlementEventTriger: async function (params, enums, options = {}) {
        let settlementId = params.id
        let settlementWindowsIdList = params.settlementWindows
        let reason = params.reason
        let Logger = options.logger || centralLogger
        try {
            let settlementWindowId = await settlementsModel.triggerEvent({ settlementId, settlementWindowsIdList, reason }, enums)
            return settlementWindowId // TODO RETURN CORRECT RESPONSE
        } catch (err) {
            Logger('error', err)
            throw err
        }
    },
}