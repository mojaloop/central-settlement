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
 - Shashikant Hirugade <shashi.mojaloop@gmail.com>

 --------------
 ******/
const RC = require('parse-strings-in-object')(require('rc')('CSET', require('../../config/default.json')))

module.exports = {
  HOSTNAME: RC.HOSTNAME.replace(/\/$/, ''),
  PORT: RC.PORT,
  DATABASE: {
    client: RC.DATABASE.DIALECT,
    connection: {
      host: RC.DATABASE.HOST.replace(/\/$/, ''),
      port: RC.DATABASE.PORT,
      user: RC.DATABASE.USER,
      password: RC.DATABASE.PASSWORD,
      database: RC.DATABASE.SCHEMA,
      ...RC.DATABASE.ADDITIONAL_CONNECTION_OPTIONS
    },
    pool: {
      // minimum size
      min: RC.DATABASE.POOL_MIN_SIZE,
      // maximum size
      max: RC.DATABASE.POOL_MAX_SIZE,
      // acquire promises are rejected after this many milliseconds
      // if a resource cannot be acquired
      acquireTimeoutMillis: RC.DATABASE.ACQUIRE_TIMEOUT_MILLIS,
      // create operations are cancelled after this many milliseconds
      // if a resource cannot be acquired
      createTimeoutMillis: RC.DATABASE.CREATE_TIMEOUT_MILLIS,
      // destroy operations are awaited for at most this many milliseconds
      // new resources will be created after this timeout
      destroyTimeoutMillis: RC.DATABASE.DESTROY_TIMEOUT_MILLIS,
      // free resouces are destroyed after this many milliseconds
      idleTimeoutMillis: RC.DATABASE.IDLE_TIMEOUT_MILLIS,
      // how often to check for idle resources to destroy
      reapIntervalMillis: RC.DATABASE.REAP_INTERVAL_MILLIS,
      // long long to idle after failed create before trying again
      createRetryIntervalMillis: RC.DATABASE.CREATE_RETRY_INTERVAL_MILLIS
      // ping: function (conn, cb) { conn.query('SELECT 1', cb) }
    },
    debug: RC.DATABASE.DEBUG
  },
  WINDOW_AGGREGATION_RETRY_COUNT: RC.WINDOW_AGGREGATION.RETRY_COUNT,
  WINDOW_AGGREGATION_RETRY_INTERVAL: RC.WINDOW_AGGREGATION.RETRY_INTERVAL,
  WINDOW_AGGREGATION_CLOSE_DELAY_MS: RC.WINDOW_AGGREGATION.CLOSE_DELAY_MS,
  TRANSFER_VALIDITY_SECONDS: RC.TRANSFER_VALIDITY_SECONDS,
  HUB_ID: RC.HUB_PARTICIPANT.ID,
  HUB_NAME: RC.HUB_PARTICIPANT.NAME,
  HANDLERS: RC.HANDLERS,
  HANDLERS_API: RC.HANDLERS.API,
  HANDLERS_API_DISABLED: RC.HANDLERS.API.DISABLED,
  HANDLERS_DISABLED: RC.HANDLERS.DISABLED,
  KAFKA_CONFIG: RC.KAFKA,
  API_DOC_ENDPOINTS_ENABLED: RC.API_DOC_ENDPOINTS_ENABLED || false
}
