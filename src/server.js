/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 --------------
 ******/

'use strict'

const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Db = require('./models')
const Enums = require('./models/lib/enums')
const Config = require('./lib/config')

// -- add them to common project config
const openAPIOptions = {
  api: Path.resolve(__dirname, './interface/swagger.json'),
  handlers: Path.resolve(__dirname, './handlers')
}

const defaultConfig = {
  port: Config.PORT,
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
    let db = await Db.connect(Config.DATABASE_URI) // TODO add from ENV or common config}
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
