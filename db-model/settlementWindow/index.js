const Facade = require('./facade')

module.exports = {
  getById: Facade.getById,
  getByParams: Facade.getByParams,
  close: Facade.close 
}
