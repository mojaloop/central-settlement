/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * ModusBox
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/
'use strict'

const Path = require('path')
const { Util } = require('@mojaloop/central-services-shared')
const { buildHandlerMap } = require('./handlerMap')

const OpenapiBackend = Util.OpenapiBackend

const DOCUMENT = Path.resolve(__dirname, '../interface/openapi.json')
const HANDLERS = Path.resolve(__dirname, './handlers')

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

// The document's paths are relative to the server URL, so the served prefix
// comes off the request before an operation is matched.
const basePath = (require(DOCUMENT).servers?.[0]?.url ?? '/').replace(/\/$/, '')
const relative = (path) => path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path

/**
 * Routes every request through the API document: it matches the operation,
 * validates the request against the operation's schema, and dispatches to the
 * handler exported for that path and method.
 */
module.exports = {
  plugin: {
    name: 'openapi',
    version: '1.0.0',
    register: async function (server) {
      const openapi = await OpenapiBackend.initialise(DOCUMENT, {
        ...buildHandlerMap(DOCUMENT, HANDLERS),
        validationFail: OpenapiBackend.validationFail,
        notFound: OpenapiBackend.notFound,
        methodNotAllowed: OpenapiBackend.methodNotAllowed
      })

      server.route({
        method: METHODS,
        path: `${basePath}/{path*}`,
        handler: (request, h) => openapi.handleRequest(
          {
            method: request.method,
            path: relative(request.path),
            body: request.payload,
            query: request.query,
            headers: request.headers
          },
          request,
          h
        )
      })
    }
  }
}
