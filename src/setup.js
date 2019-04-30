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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>
 --------------
 ******/

'use strict'

const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Db = require('./lib/db')
const Enums = require('./models/lib/enums')
const Config = require('./lib/config')

// TODO: add to common config
const openAPIOptions = {
  api: Path.resolve(__dirname, './interface/swagger.json'),
  handlers: Path.resolve(__dirname, './handlers')
}

const defaultConfig = {
  port: Config.PORT,
  cache: [
    {
      provider: {
        constructor: require('catbox-memory'),
        options: {
          partition: 'cache'
        }
      },
      name: 'memCache'
    }
  ]
}

const getEnums = (id) => {
  return Enums[id]()
}

async function connectDatabase () {
  try {
    let db = await Db.connect(Config.DATABASE_URI)
    return db
  } catch (e) {
    throw e
  }
}

const createServer = async function (config, openAPIPluginOptions) {
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
          expiresIn: 20 * 1000,
          generateTimeout: 30 * 1000
        }
      }
    })

    server.ext([
      {
        type: 'onPreHandler',
        method: (request, h) => {
          server.log('request', request)
          return h.continue
        }
      },
      {
        type: 'onPreResponse',
        method: (request, h) => {
          if (!request.response.isBoom) {
            server.log('response', request.response)
          } else {
            const error = request.response
            let errorMessage = {
              errorInformation: {
                errorCode: error.statusCode,
                errorDescription: error.message
              }
            }
            error.message = errorMessage
            error.reformat()
          }
          return h.continue
        }
      }
    ])

    await server.start()
    return server
  } catch (e) {
    console.error(e)
  }
}

const initialize = async (config = defaultConfig, openAPIPluginOptions = openAPIOptions) => {
  const server = await createServer(config, openAPIPluginOptions)
  if (server) {
    try {
      server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
      server.log('info', `Server running on ${server.info.host}:${server.info.port}`)
      return server
    } catch (e) {
      server.log('error', e.message)
    }
  }
}

module.exports = {
  initialize,
  __testonly__: {
    getEnums
  }
}
