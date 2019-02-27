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
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>
--------------
 ******/

const settlementWindowModel = require('../../models/settlementWindow')
const hasFilters = require('./../../utils/truthyProperty')

module.exports = {
  getById: async function (params, enums) {
    try {
      let settlementWindow = await settlementWindowModel.getById(params, enums)
      if (settlementWindow) return settlementWindow
      else {
        let err = new Error(`settlementWindowId: ${params.settlementWindowId} not found`)
        throw err
      }
    } catch (err) {
      throw err
    }
  },

  getByParams: async function (params, enums) {
    // 4 filters - at least one should be used
    if (hasFilters(params.query) && Object.keys(params.query).length < 5) {
      try {
        let settlementWindows = await settlementWindowModel.getByParams(params, enums)
        if (settlementWindows && settlementWindows.length > 0) {
          return settlementWindows
        } else {
          let err = new Error(`settlementWindow by filters: ${JSON.stringify(params.query).replace(/"/g, '')} not found`)
          throw err
        }
      } catch (err) {
        throw err
      }
    } else {
      let err = new Error('Use at least one parameter: participantId, state, fromDateTime, toDateTime')
      throw err
    }
  },

  close: async function (params, enums) {
    try {
      let settlementWindowId = await settlementWindowModel.close(params, enums)
      return await settlementWindowModel.getById({ settlementWindowId }, enums)
    } catch (err) {
      throw err
    }
  }
}
