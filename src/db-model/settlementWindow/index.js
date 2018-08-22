const Facade = require('./facade')
const settlementWindowStateChange = require('./settlementWindowStateChange')
module.exports = {
  getById: Facade.getById,
  getByParams: Facade.getByParams,
  close: Facade.close,
  getByListOfIds: Facade.getByListOfIds,
  getBySettlementId: Facade.getBySettlementId,
  createSettlementWindow: settlementWindowStateChange.create
}
