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
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/
'use strict'

const Path = require('path')
const Inert = require('@hapi/inert')
const Vision = require('@hapi/vision')
const Blipp = require('blipp')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const RawPayloadToDataUri = require('@mojaloop/central-services-shared').Util.Hapi.HapiRawPayload
const APIDocumentation = require('@mojaloop/central-services-shared').Util.Hapi.APIDocumentation
const HapiEventPlugin = require('@mojaloop/central-services-shared').Util.Hapi.HapiEventPlugin
const Config = require('../lib/config')

/**
 * @module src/shared/plugin
 */

const registerPlugins = async (server) => {
  if (Config.API_DOC_ENDPOINTS_ENABLED) {
    await server.register({
      plugin: APIDocumentation,
      options: {
        documentPath: Path.resolve(__dirname, '../interface/swagger.json')
      }
    })
  }

  await server.register({
    plugin: require('@hapi/good'),
    options: {
      ops: {
        interval: 10000
      }
    }
  })

  await server.register({
    plugin: require('@hapi/basic')
  })

  await server.register({
    plugin: require('@now-ims/hapi-now-auth')
  })

  await server.register({
    plugin: require('hapi-auth-bearer-token')
  })

  await server.register([
    Inert,
    Vision,
    Blipp,
    ErrorHandling,
    RawPayloadToDataUri,
    HapiEventPlugin
  ])
}

module.exports = {
  registerPlugins
}
