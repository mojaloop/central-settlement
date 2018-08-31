<<<<<<< HEAD
const settlementWindowModel = require('../../db-model/settlementWindow/index');
=======
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

const settlementWindowModel = require('../../models/settlementWindow/index')
>>>>>>> 67cf69aed3e0f62fbcc77eca0e478d66f6248ca3
const centralLogger = require('@mojaloop/central-services-shared').Logger

module.exports = {
  getById: async function (params, enums, options = {}) {
    let Logger = options.logger || centralLogger
<<<<<<< HEAD
    try { 
=======
    try {
>>>>>>> 67cf69aed3e0f62fbcc77eca0e478d66f6248ca3
      let settlementWindow = await settlementWindowModel.getById(params, enums)
      if (settlementWindow) return settlementWindow
      else {
        let err = new Error('settlement window not found')
        Logger('error', err)
        throw err
<<<<<<< HEAD
        }
=======
      }
>>>>>>> 67cf69aed3e0f62fbcc77eca0e478d66f6248ca3
    } catch (err) {
      Logger('error', err)
      throw err
    }
  },

  getByParams: async function (params, enums, options = {}) {
    // 4 filters - at least one should be used
    let Logger = options.logger || centralLogger
    if (Object.keys(params.query).length && Object.keys(params.query).length < 5) {
      try {
        let settlementWindows = await settlementWindowModel.getByParams(params, enums)
        if (settlementWindows && settlementWindows.length > 0) {
          return settlementWindows
<<<<<<< HEAD
        }
        else {
          let err = new Error('settlement window not found')
          Logger('error', err)
          throw err
          }
        } catch (err) {
=======
        } else {
          let err = new Error('settlement window not found')
          Logger('error', err)
          throw err
        }
      } catch (err) {
>>>>>>> 67cf69aed3e0f62fbcc77eca0e478d66f6248ca3
        Logger('error', err)
        throw err
      }
    } else {
      let err = new Error('use at least one parameter: participantId, state, fromDateTime, toDateTime')
      Logger('error', err)
      throw err
    }
  },

<<<<<<< HEAD
    close: async function (params, enums, options = {}) {
      let Logger = options.logger || centralLogger
      try {
        let settlementWindowId = await settlementWindowModel.close(params, enums)
        return await settlementWindowModel.getById({ settlementWindowId }, enums)
      } catch (err) {
        Logger('error', err)
        throw err
      }
    }
  }

/*
 
  {
    participantId: 2
    state: open
    fromDateTime: 12.02.2018 
=======
  close: async function (params, enums, options = {}) {
    let Logger = options.logger || centralLogger
    try {
      let settlementWindowId = await settlementWindowModel.close(params, enums)
      return await settlementWindowModel.getById({ settlementWindowId }, enums)
    } catch (err) {
      Logger('error', err)
      throw err
    }
  }
}

/*

  {
    participantId: 2
    state: open
    fromDateTime: 12.02.2018
>>>>>>> 67cf69aed3e0f62fbcc77eca0e478d66f6248ca3
    toDateTime: 12.06.2018
  }

  {
    participantId: 2
    state: open
    fromDateTime: [..]
    toDateTime: [..]
  }
<<<<<<< HEAD
*/
=======
*/
>>>>>>> 67cf69aed3e0f62fbcc77eca0e478d66f6248ca3
