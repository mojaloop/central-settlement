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
 --------------
 ******/

'use strict'

const Db = require('../index')

module.exports = {
  getById: async function ({ settlementWindowId, enums }) {
    try {
      return await Db.settlementWindow.query(async (builder) => {
        return await builder
          .where({
            'settlementWindow.settlementWindowId': settlementWindowId,
            'swsc.settlementWindowStateId': enums.settlementWindowStates.OPEN.settlementWindowStateId
          })
          .leftJoin('settlementWindowStateChange AS swsc', 'swsc.settlementWindowId', 'settlementWindow.settlementWindowId')
          .select(
            'settlementWindow.*',
            'swsc.settlementWindowStateId AS state',
          )
          .orderBy('swsc.settlementWindowStateChangeId', 'desc')
          .first()
      })
    } catch (err) {
        throw err
    }
  },

  getByParams: async function ({enums, filters}) {
    try {
      let { participantId, state, fromDateTime, toDateTime } = filters
      return await Db.settlementWindow.query(async (builder) => {
        if (!participantId)        
        return await builder
          .leftJoin('settlementWindowStateChange AS swsc', 'swsc.SettlementWindowId', 'settlementWindow.settlementWindowId')
          .select(
            'settlementWindow.*',
            'swsc.settlementWindowStateId AS state',
          )
          .whereRaw(`swsc.settlementWindowStateId ${state} AND settlementWindow.createdDate >= '${fromDateTime}' AND settlementWindow.createdDate <= '${toDateTime}'`)
        else return await builder
        .leftJoin('participantCurrency AS pc', 'pc.participantId', participantId)
        .leftJoin('settlementTransferParticipant AS stp', 'stp.participantCurrencyId', 'pc.participantCurrencyId')
        .leftJoin('settlementSettlementWindow AS ssw', 'ssw.settlementId', 'stp.settlementId')        
        .leftJoin('settlementWindowStateChange AS swsc', 'swsc.SettlementWindowId', 'settlementWindow.settlementWindowId')
        .select(
          'settlementWindow.*',
          'swsc.settlementWindowStateId AS state',
          'pc.participantId as participantId'
        )
        .whereRaw(`swsc.settlementWindowStateId ${state} AND settlementWindow.createdDate >= '${fromDateTime}' AND settlementWindow.createdDate <= '${toDateTime}'`)
      })
    } catch (err) {
      throw err
    }
  }
}

/*

select *
from participantCurrency pc
join settlementTransferparticipant stp on pc.participantCurrencyId = stp.participantCurrencyId
join settlementSettlementWindow ssw on stp.settlementId = ssw.settlementId
where pc.participantId = @participantId
*/
