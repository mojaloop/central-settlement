const settlementWindowModel = require('../../db-model/settlementWindow/index')
const centralLogger = require('@mojaloop/central-services-shared').Logger

module.exports = {
  getById: async function (params, enums, options = {}) {
    let Logger = options.logger || centralLogger
    try {
      let settlementWindow = await settlementWindowModel.getById(params, enums)
      if (settlementWindow) return settlementWindow
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

  getByParams: async function (params, enums, options = {}) {
    // 4 filters - at least one should be used
    let Logger = options.logger || centralLogger
    if (Object.keys(params.query).length && Object.keys(params.query).length < 5) {
      try {
        let settlementWindows = await settlementWindowModel.getByParams(params, enums)
        if (settlementWindows && settlementWindows.length > 0) {
          return settlementWindows
        } else {
          let err = new Error('settlement window not found')
          Logger('error', err)
          throw err
        }
      } catch (err) {
        Logger('error', err)
        throw err
      }
    } else {
      let err = new Error('use at least one parameter: participantId, state, fromDateTime, toDateTime')
      Logger('error', err)
      throw err
    }
  },

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
    toDateTime: 12.06.2018
  }

  {
    participantId: 2
    state: open
    fromDateTime: [..]
    toDateTime: [..]
  }
*/
