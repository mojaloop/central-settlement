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
    if (Object.keys(params.filters).length && Object.keys(params.filters).length < 5) {
      let { state, fromDateTime, toDateTime } = params.filters
      fromDateTime = fromDateTime ? fromDateTime : new Date('01-01-1970').toISOString()
      toDateTime = toDateTime ? toDateTime : new Date().toISOString()
      state = state ? ` = ${state.toUpperCase()}` : 'IS NOT NULL'
      params.filters = Object.assign(params.filters, {state, fromDateTime, toDateTime})
      return await settlementWindowModel.getByParams(params)
    } else {
      throw new Error('use at least one parameter: participantId, state, fromDateTime, toDateTime')
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