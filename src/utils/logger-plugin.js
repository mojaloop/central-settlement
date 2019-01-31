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
 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

const Logger = require('@mojaloop/central-services-shared').Logger
const checkEmpty = require('./truthyProperty')
module.exports.plugin = {
  name: 'logger-plugin',
  register: async function (server) {
    server.events.on('log', function (event) {
      if (event.error) {
        event.data = event.error
      }
      if (Array.isArray(event.tags) && event.tags.length === 1 && event.tags[0]) {
        if (event.tags[0] !== 'info') {
          if (!(event.data instanceof Error)) {
            Logger.info(`::::::: ${event.tags[0].toUpperCase()} :::::::`)
            if (event.tags[0] === 'request') {
              let request = event.data
              Logger.info(`:: ${request.method.toUpperCase()} ${request.path}`)
              checkEmpty(request.payload) && Logger.info(`:: Payload: ${JSON.stringify(request.payload)}`)
              checkEmpty(request.params) && Logger.info(`:: Params: ${JSON.stringify(request.params)}`)
              checkEmpty(request.query) && Logger.info(`:: Query: ${JSON.stringify(request.query)}`)
            } else if (event.tags[0] === 'response') {
              Logger.info(`:: Payload: \n${JSON.stringify(event.data.source, null, 2)}`)
            } else {
              Logger.info(`::::::: ${event.tags[0].toUpperCase()} :::::::`)
              Logger.info(event.data)
            }
          } else {
            let error = event.data
            Logger.info(`::::::: ${event.tags[0].toUpperCase()} :::::::\n ${error.stack}`)
          }
          Logger.info(`::: END OF ${event.tags[0].toUpperCase()} ::::`)
        } else {
          Logger.info(event.data)
        }
      }
    })
  }
}
