const settlementModel = require('../../db-model/settlement/index');
const centralLogger = require('@mojaloop/central-services-shared').Logger

module.exports = {
    settlementEventTriger: async function (params, enums, options = {}) {
      let settlementId = params.id
      let settlementWindowsIdList = params.settlementWindows
      let Logger = options.logger || centralLogger
      try {
        let settlementWindowId = await settlementModel.triggerEvent({ settlementId, settlementWindowsIdList }, enums)
        return settlementWindowId // TODO RETURN CORRECT RESPONSE
      } catch (err) {
        Logger('error', err)
        throw err
      }
    },
    
  }
