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

/**
 * @module src/handlers/transfers
 */

const Config = require('../../lib/config')
const Consumer = require('@mojaloop/central-services-stream').Util.Consumer
const Enum = require('@mojaloop/central-services-shared').Enum
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const Kafka = require('@mojaloop/central-services-shared').Util.Kafka
const Logger = require('@mojaloop/central-services-logger')
const Producer = require('@mojaloop/central-services-stream').Util.Producer
const retry = require('async-retry')
const SettlementWindowService = require('../../domain/settlementWindow')
const Utility = require('@mojaloop/central-services-shared').Util

const location = { module: 'SettlementWindowHandler', method: '', path: '' } // var object used as pointer

const consumerCommit = true
const fromSwitch = true

const retryDelay = Config.WINDOW_AGGREGATION_RETRY_INTERVAL
const retryCount = Config.WINDOW_AGGREGATION_RETRY_COUNT
const retryOpts = {
  retries: retryCount,
  minTimeout: retryDelay,
  maxTimeout: retryDelay
}

const closeSettlementWindow = async (error, messages) => {
  if (error) {
    Logger.error(error)
    throw ErrorHandling.Factory.reformatFSPIOPError(error)
  }
  let message = {}
  try {
    Logger.info(Utility.breadcrumb(location, { method: 'closeSettlementWindow' }))
    if (Array.isArray(messages)) {
      message = messages[0]
    } else {
      message = messages
    }
    const payload = message.value.content.payload
    const metadata = message.value.metadata
    const action = metadata.event.action

    const kafkaTopic = message.topic
    const params = { message, kafkaTopic, decodedPayload: payload, consumer: Consumer, producer: Producer }

    const actionLetter = action === Enum.Events.Event.Action.CLOSE
      ? Enum.Events.ActionLetter.close
      : Enum.Events.ActionLetter.unknown

    if (!payload) {
      Logger.info(Utility.breadcrumb(location, `missingPayload--${actionLetter}1`))
      const fspiopError = ErrorHandling.Factory.createInternalServerFSPIOPError('Settlement window handler missing payload')
      const eventDetail = { functionality: Enum.Events.Event.Type.NOTIFICATION, action: Enum.Events.Event.Action.SETTLEMENT_WINDOW }
      await Kafka.proceed(Config.KAFKA_CONFIG, params, { consumerCommit, fspiopError: fspiopError.toApiErrorObject(Config.ERROR_HANDLING), eventDetail, fromSwitch })
      throw fspiopError
    }
    const settlementWindowId = payload.settlementWindowId
    const reason = payload.reason
    Logger.info(Utility.breadcrumb(location, 'validationPassed'))
    await Kafka.commitMessageSync(Consumer, kafkaTopic, message)

    await retry(async () => { // use bail(new Error('to break before max retries'))
      const settlementWindow = await SettlementWindowService.close(settlementWindowId, reason)
      if (!settlementWindow || settlementWindow.state !== Enum.Settlements.SettlementWindowState.CLOSED) {
        Logger.info(Utility.breadcrumb(location, { path: 'windowCloseRetry' }))
        const errorDescription = `Settlement window close failed after max retry count ${retryCount} has been exhausted in ${retryCount * retryDelay / 1000}s`
        throw ErrorHandling.Factory.createFSPIOPError(ErrorHandling.Enums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR, errorDescription)
      }
      Logger.info(Utility.breadcrumb(location, `done--${actionLetter}2`))
      return true
    }, retryOpts)
    return true
  } catch (err) {
    Logger.error(`${Utility.breadcrumb(location)}::${err.message}--0`)
    return true
  }
}

/**
 * @function registerSettlementWindowHandler
 *
 * @async
 * @description Registers SettlementWindowHandler for processing windows closure. Gets Kafka config from default.json
 * Calls createHandler to register the handler against the Stream Processing API
 * @returns {boolean} - Returns a boolean: true if successful, or throws and error if failed
 */
const registerSettlementWindowHandler = async () => {
  try {
    const settlementWindowHandler = {
      command: closeSettlementWindow,
      topicName: Kafka.transformGeneralTopicName(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, Enum.Events.Event.Type.SETTLEMENT_WINDOW, Enum.Events.Event.Action.CLOSE),
      config: Kafka.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.CONSUMER, Enum.Events.Event.Type.SETTLEMENT_WINDOW.toUpperCase(), Enum.Events.Event.Action.CLOSE.toUpperCase())
    }
    settlementWindowHandler.config.rdkafkaConf['client.id'] = settlementWindowHandler.topicName
    await Consumer.createHandler(settlementWindowHandler.topicName, settlementWindowHandler.config, settlementWindowHandler.command)
    return true
  } catch (err) {
    Logger.error(err)
    throw ErrorHandling.Factory.reformatFSPIOPError(err)
  }
}

/**
 * @function RegisterAllHandlers
 *
 * @async
 * @description Registers all handlers
 *
 * @returns {boolean} - Returns a boolean: true if successful, or throws and error if failed
 */
const registerAllHandlers = async () => {
  try {
    await registerSettlementWindowHandler()
    return true
  } catch (err) {
    throw ErrorHandling.Factory.reformatFSPIOPError(err)
  }
}

module.exports = {
  closeSettlementWindow,
  registerAllHandlers,
  registerSettlementWindowHandler
}
