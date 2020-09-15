/* eslint-env jest */
// This setupFiles allow to run test in parallel by making use of JEST_WORKER_ID
// the right test knows which database to target and each kafka message is sent to the right server instance
//  listening on the shared kafka broker on multiple topics for the same functionality.
const Db = require('../../../src/lib/db')
const KafkaProducer = require('@mojaloop/central-services-stream').Util.Producer
const Config = require('../../../src/lib/config')
const utils = require('../utils')
const testStartDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
Config.DATABASE.connection.database = `central_ledger_integration_${process.env.JEST_WORKER_ID}`
Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE = `topic-{{functionality}}-{{action}}${process.env.JEST_WORKER_ID}`
Config.PORT = `999${process.env.JEST_WORKER_ID}`
// to avoid pooled connections remaining open..
Config.DATABASE.pool = { }
jest.setTimeout(30000)

let server
beforeAll(async () => {
  try {
    server = await require('../../../src/api/index.js')
  } catch (err) {
    console.log(`err ${err}`)
  }
})

// to allow as much data to be cleaned in case the developer forgets, this after script loops through all the tables and remove all data
// that was created after the test started.
// the developer should take care anyway of its own data to make sure all tests are not polluted and can run safely in isolation
afterAll(async () => {
  const knex = await Db.getKnex()
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;')
  const allTables = await knex.raw(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = '${Config.DATABASE.connection.database}';`)
  await Promise.allSettled(allTables[0].map(table => {
    if (table.TABLE_NAME !== 'migration' && table.TABLE_NAME !== 'migration_lock') {
      return knex.raw(`DELETE FROM ${table.TABLE_NAME} WHERE createdDate > '${testStartDate}'`)
    }
  }))
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1')
  await Db.disconnect()
  await server.stop()
  await KafkaProducer.getProducer(`topic-notification-event${process.env.JEST_WORKER_ID}`).disconnect()
}, 5000)
