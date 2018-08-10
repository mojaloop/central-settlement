'use strict';

const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Db = require('./dataAccessObject/index.js')
const Enums = require('./dataAccessObject/lib/enums')

// -- add them to common project config
const openAPIOptions = {
  api: Path.resolve('./config/swagger.json'),
  handlers: Path.resolve('./handlers')
}

const defaultConfig = {
  port: 8080
}
// --

async function connectDatabase () {
  try {
    let db = await Db.connect(`mysql://central_ledger:password@localhost:3306/central_ledger`) // TODO add from ENV or common config}
    return db
  } catch (e) {
    throw e
  }
}

const init = async function(config = defaultConfig, openAPIPluginOptions = openAPIOptions) {
  const server = new Hapi.Server(config);
  await connectDatabase()
  await server.register([{
    plugin: HapiOpenAPI,
    options: openAPIPluginOptions
  },
  {
    plugin: require('./utils/logger-plugin')
  }])

  server.events.on('start', async () => {
    server.app.enums = {
      settlementWindowStates: await Enums.settlementWindowStates(),
      settlementStates: await Enums.settlementStates(),
    }
  })

  await server.start()
  return server
}

init().then(async (server) => {
  try {
    server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
    server.log('info', `Server running on ${server.info.host}:${server.info.port}`)
  } catch (e) {
    server.log('error', e.message)
  }
})

module.exports = {
    init
}
