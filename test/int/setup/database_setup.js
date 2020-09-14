'use strict'
const Path = require('path')
const Migrations = require('@mojaloop/central-services-database').Migrations
const Knex = require('knex')
const data = require('../data')
const migrationsDirectory = '../../migrations'
const seedsDirectory = '../../seeds'

const conf = {
  client: 'mysql',
  version: '5.5',
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'central_ledger',
    password: 'password',
    database: 'central_ledger_integration'
  },
  pool: {
    min: 10,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  },
  debug: false,
  migrations: {
    directory: migrationsDirectory,
    tableName: 'migration',
    stub: `${migrationsDirectory}/migration.template`
  },
  seeds: {
    directory: seedsDirectory,
    loadExtensions: ['.js']
  }
}

exports.migrate = async function () {
  const rootConfig = {
    client: 'mysql',
    version: '5.5',
    connection: {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'mysql'
    }
  }
  const knexRoot = Knex(rootConfig)
  const baseMigrations = []
  const onBoarding = []
  // TODO  use a env variable
  const workers = process.env.WORKERS
  console.log(`initializing ${workers} schemas`)
  for (let i = 1; i <= workers; i++) {
    // TODO ADD VAR TO NOT DROP and NOT REMIGRATE to make it quicker while coding...
    // make workers as env variable
    const schema = `central_ledger_integration_${i}`
    await knexRoot.raw(`DROP SCHEMA IF EXISTS ${schema}`)
    await knexRoot.raw(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
    // TODO replace user with env var
    await knexRoot.raw(`GRANT ALL PRIVILEGES ON ${schema}.* TO 'central_ledger'@'%'`)
    await knexRoot.raw('FLUSH PRIVILEGES')
    conf.connection.database = `${schema}`
    baseMigrations.push(Migrations.migrate(updateMigrationsLocation(conf)))
    onBoarding[i] = onBoardingData(knexRoot, schema)
  }
  await Promise.all(baseMigrations)
  await Promise.all(onBoarding.map(x => runInSeries(x)))
}

// running in series to guarantee foreign key checks are respected
async function runInSeries (array) {
  for (let i = 0; i < array.length; i++) {
    await array[i]
  }
}
function onBoardingData (knex, schema) {
  // TODO  populate more initial data
  return [
    knex('participant').withSchema(schema).insert(data.participants),
    knex('ledgerAccountType').withSchema(schema).insert(data.ledgerAccountTypes),
    knex('participantCurrency').withSchema(schema).insert(data.participantCurrencies),
    knex('participantPosition').withSchema(schema).insert(data.participantsPositions)
  ]
}

const updateMigrationsLocation = (kf) => {
  const parsedMigrationDir = Path.parse(kf.migrations.directory)
  kf.migrations.directory = Path.join(process.cwd(), parsedMigrationDir.base)
  const parsedSeedsDir = Path.parse(kf.seeds.directory)
  kf.seeds.directory = Path.join(process.cwd(), parsedSeedsDir.base)
  return kf
}
