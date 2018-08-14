const settlementWindowModel = require('../../db-model/settlementWindow/index');
const centralLogger = require('@mojaloop/central-services-shared').Logger

module.exports = {
  getById: async function (params, options = {}) {
    let Logger = options.logger || centralLogger
    try { 
      return await settlementWindowModel.getById(params)
    } catch (err) {
      throw err
    }
  },
  getByParams: async function (params, options = {}) {
    // 4 filters - at least one should be used
    let { fromDateTime, toDateTime } = params.filters
    fromDateTime = fromDateTime ? fromDateTime : new Date('01-01-1970').toISOString()
    toDateTime = toDateTime ? toDateTime : new Date().toISOString()
//    params.filters.participantId = '*'
    params.filters = Object.assign(params.filters, {fromDateTime, toDateTime})

    return await settlementWindowModel.getByParams(params)
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