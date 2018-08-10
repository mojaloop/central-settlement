'use strict';

const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Db = require('./dataAccessObject/index.js')
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
    return await Db.connect(`mysql://central_ledger:password@localhost:3306/central_ledger`)
  } catch (e) {
    throw e
  } // TODO add from ENV or common config}
}

const init = async function(config = defaultConfig, openAPIPluginOptions = openAPIOptions) {
    const server = new Hapi.Server(config);

    await server.register([{
        plugin: HapiOpenAPI,
        options: openAPIPluginOptions
    },
    {
        plugin: require('./utils/logger-plugin')
    }])

    await server.start()
    return server
}

init().then(async (server) => {
  try {
    await connectDatabase()
    server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
    server.log('info', `Server running on ${server.info.host}:${server.info.port}`)
  } catch (e) {
    server.log('error', e.message)
  }
})

module.exports = {
    init
}
