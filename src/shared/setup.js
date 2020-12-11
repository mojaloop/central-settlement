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

 * ModusBox
 - Deon Botha <deon.botha@modusbox.com>
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 - Miguel de Barros <miguel.debarros@modusbox.com>
 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 - Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/
'use strict'

const Boom = require('@hapi/boom')
const Config = require('../lib/config')
const Db = require('../lib/db')
const Enums = require('../models/lib/enums')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const Hapi = require('@hapi/hapi')
const Logger = require('@mojaloop/central-services-logger')
const Plugins = require('./plugins')
const RegisterHandlers = require('../handlers/register')

const getEnums = (id) => {
  return Enums[id]()
}

async function connectDatabase () {
  return Db.connect(Config.DATABASE)
}

const createServer = async function (port, modules) {
  try {
    const server = new Hapi.Server({
      port,
      routes: {
        validate: {
          options: ErrorHandling.validateRoutes(),
          failAction: async (request, h, err) => {
            throw Boom.boomify(err)
          }
        },
        payload: {
          parse: true,
          output: 'stream'
        }
      },
      cache: [
        {
          provider: {
            constructor: require('@hapi/catbox-memory'),
            options: {
              partition: 'cache'
            }
          },
          name: 'memCache'
        }
      ]
    })
    await connectDatabase()

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
      }
    ])
    await Plugins.registerPlugins(server)
    await server.register(modules)
    await server.start()

    try {
      server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
      server.log('info', `Server running on ${server.info.host}:${server.info.port}`)
      return server
    } catch (e) {
      server.log('error', e.message)
      throw e
    }
  } catch (e) {
    console.error(e)
  }
}

/**
 * @function createHandlers
 *
 * @description Create method to register specific Handlers specified by the Module list as part of the Setup process
 *
 * @typedef handler
 * @type {Object}
 * @property {string} type The type of Handler to be registered
 * @property {boolean} enabled True|False to indicate if the Handler should be registered
 * @property {string[]} [fspList] List of FSPs to be registered
 *
 * @param {handler[]} handlers List of Handlers to be registered
 * @returns {Promise<boolean>} Returns true if Handlers were registered
 */
const createHandlers = async (handlers) => {
  let handlerIndex
  const registerdHandlers = {
    connection: {},
    register: {},
    ext: {},
    start: new Date(),
    info: {},
    handlers: handlers
  }

  for (handlerIndex in handlers) {
    const handler = handlers[handlerIndex]
    let error
    if (handler.enabled) {
      Logger.info(`Handler Setup - Registering ${JSON.stringify(handler)}!`)
      switch (handler.type) {
        case 'settlementwindow':
          await RegisterHandlers.settlementWindow.registerSettlementWindowHandler()
          break
        default:
          error = `Handler Setup - ${JSON.stringify(handler)} is not a valid handler to register!`
          Logger.error(error)
          throw ErrorHandling.Factory.reformatFSPIOPError(error)
      }
    }
  }

  return registerdHandlers
}

/**
 * @function initialize
 *
 * @description Setup method for API, Admin and Handlers. Note that the Migration scripts are called before connecting to the database to ensure all new tables are loaded properly.
 *
 * @typedef handler
 * @type {Object}
 * @property {string} type The type of Handler to be registered
 * @property {boolean} enabled True|False to indicate if the Handler should be registered
 * @property {string[]} [fspList] List of FSPs to be registered
 *
 * @param {string} service Name of service to start. Available choices are 'api', 'admin', 'handler'
 * @param {number} port Port to start the HTTP Server on
 * @param {object[]} modules List of modules to be loaded by the HTTP Server
 * @param {boolean} runMigrations True to run Migration script, false to ignore them, only applicable for service types that are NOT 'handler'
 * @param {boolean} runHandlers True to start Handlers, false to ignore them
 * @param {handler[]} handlers List of Handlers to be registered
 * @returns {object} Returns HTTP Server object
 */
const initialize = async function ({ service, port, modules = [], runHandlers = false, handlers = [] }) {
  let server
  switch (service) {
    case 'api':
      server = await createServer(port, modules)
      break
    case 'handler':
      if (!Config.HANDLERS_API_DISABLED) {
        server = await createServer(port, modules)
      }
      break
    default:
      Logger.error(`No valid service type ${service} found!`)
      throw ErrorHandling.Factory.createFSPIOPError(ErrorHandling.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, `No valid service type ${service} found!`)
  }
  if (runHandlers) {
    if (Array.isArray(handlers) && handlers.length > 0) {
      await createHandlers(handlers)
    } else {
      await RegisterHandlers.registerAllHandlers()
    }
  }

  return server
}

module.exports = {
  initialize,
  createServer,
  __testonly__: {
    getEnums
  }
}
