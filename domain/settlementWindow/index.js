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
  }
}