'use strict'

const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Db = require('./models')
const Enums = require('./models/lib/enums')

// -- add them to common project config
const openAPIOptions = {
  api: Path.resolve(__dirname, './interface/swagger.json'),
  handlers: Path.resolve(__dirname, './handlers')
}

const defaultConfig = {
  port: 3007,
  cache: [
    {
      name: 'memCache',
      engine: require('catbox-memory'),
      partition: 'cache'
    }
  ]
}

const getEnums = (id) => {
  return Enums[id]()
}

async function connectDatabase () {
  try {
    let db = await Db.connect(`mysql://central_ledger:password@localhost:3306/central_ledger`) // TODO add from ENV or common config}
    return db
  } catch (e) {
    throw e
  }
}

const init = async function (config = defaultConfig, openAPIPluginOptions = openAPIOptions) {
  try {
    const server = new Hapi.Server(config)
    await connectDatabase()
    await server.register([{
      plugin: HapiOpenAPI,
      options: openAPIPluginOptions
    },
    {
      plugin: require('./utils/logger-plugin')
    }])

    server.method({
      name: 'enums',
      method: getEnums,
      options: {
        cache: {
          cache: 'memCache',
          expiresIn: 180 * 1000,
          generateTimeout: 30 * 1000
        }
      }
    })
    await server.start()
    return server
  } catch (e) {
    console.log(e)
  }
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
