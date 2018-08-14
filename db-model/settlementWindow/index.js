const settlementWindowFacade = require('./facade')
const settlementWindowStateChange = require('./settlementWindowStateChange')

module.exports = {
  getById: settlementWindowFacade.getById,
  getByParams: settlementWindowFacade.getByParams 
}
