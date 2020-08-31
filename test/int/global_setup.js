const migrator = require('./db_setup')
// https://github.com/facebook/jest/issues/2441
module.exports = async function () {
  console.log('initializing databases')
  await migrator.migrate()
}
