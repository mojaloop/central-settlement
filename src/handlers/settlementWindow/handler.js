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
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Kafka = require('@mojaloop/central-services-shared').Util.Kafka
const Logger = require('@mojaloop/central-services-logger')
// const Time = require('@mojaloop/central-services-shared').Util.Time

const processWindow = async (error, messages) => {
  if (error) {
    Logger.error(error)
    throw ErrorHandler.Factory.reformatFSPIOPError(error)
  }
  let message = {}
  try {
    if (Array.isArray(messages)) {
      message = messages[0]
    } else {
      message = messages
    }
    const payload = message.value.content.payload
    const metadata = message.value.metadata
    const transferId = message.value.id

    if (!payload) {
      Logger.info('AdminTransferHandler::validationFailed')
      // TODO: Cannot be saved because no payload has been provided. What action should be taken?
      return false
    }

    payload.participantCurrencyId = metadata.request.params.id
    // const enums = metadata.request.enums
    // const transactionTimestamp = Time.getUTCString(new Date())
    Logger.info(`AdminTransferHandler::${metadata.event.action}::${transferId}`)
    const kafkaTopic = message.topic

    await Kafka.commitMessageSync(Consumer, kafkaTopic, message)
    return true
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
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
      command: processWindow,
      topicName: Kafka.transformGeneralTopicName(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, Enum.Events.Event.Type.SETTLEMENT_WINDOW, Enum.Events.Event.Action.CLOSE),
      config: Kafka.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.CONSUMER, Enum.Events.Event.Type.SETTLEMENT_WINDOW.toUpperCase(), Enum.Events.Event.Action.CLOSE.toUpperCase())
    }
    settlementWindowHandler.config.rdkafkaConf['client.id'] = settlementWindowHandler.topicName
    await Consumer.createHandler(settlementWindowHandler.topicName, settlementWindowHandler.config, settlementWindowHandler.command)
    return true
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
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
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

module.exports = {
  processWindow,
  registerAllHandlers,
  registerSettlementWindowHandler
}
