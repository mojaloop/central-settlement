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

 --------------
 ******/

'use strict'

const Path = require('path')

const METHODS = ['get', 'post', 'put', 'delete', 'patch']

/**
 * Handlers live in files named after the path they serve and export one
 * function per method. The API document is what says which operationId that
 * pair answers to, so the map is built from the document and a missing or
 * misnamed handler is a startup failure.
 */
const buildHandlerMap = (documentPath, handlersDir) => {
  const document = require(documentPath)
  const handlers = {}

  for (const [path, item] of Object.entries(document.paths)) {
    // '/settlements/{sid}/participants/{pid}' -> 'settlements/{sid}/participants/{pid}'
    const modulePath = Path.join(handlersDir, path.replace(/^\//, ''))
    for (const method of METHODS) {
      const operation = item[method]
      if (!operation) continue

      const module = require(modulePath)
      const handler = module[method]
      if (typeof handler !== 'function') {
        throw new Error(`${modulePath} exports no ${method} for ${operation.operationId}`)
      }
      handlers[operation.operationId] = handler
    }
  }
  return handlers
}

module.exports = { buildHandlerMap }
