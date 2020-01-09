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

const Config = require('../../lib/config')
const Enum = require('@mojaloop/central-services-shared').Enum
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const hasFilters = require('./../../utils/truthyProperty')
const Producer = require('@mojaloop/central-services-stream').Util.Producer
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const SettlementWindowModel = require('../../models/settlementWindow')
const StreamingProtocol = require('@mojaloop/central-services-shared').Util.StreamingProtocol
const Uuid = require('uuid4')

module.exports = {
  getById: async function (params, enums) {
    const settlementWindow = await SettlementWindowModel.getById(params, enums)
    if (settlementWindow) return settlementWindow
    else {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, `settlementWindowId: ${params.settlementWindowId} not found`)
    }
  },

  getByParams: async function (params, enums) {
    // 4 filters - at least one should be used
    if (hasFilters(params.query) && Object.keys(params.query).length < 5) {
      const settlementWindows = await SettlementWindowModel.getByParams(params, enums)
      if (settlementWindows && settlementWindows.length > 0) {
        return settlementWindows
      } else {
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, `settlementWindow by filters: ${JSON.stringify(params.query).replace(/"/g, '')} not found`)
      }
    } else {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Use at least one parameter: participantId, state, fromDateTime, toDateTime')
    }
  },

  close: async function (params, enums) {
    const settlementWindowId = await SettlementWindowModel.close(params, enums)

    const messageId = Uuid()
    const eventId = Uuid()
    const state = StreamingProtocol.createEventState(Enum.Events.EventStatus.SUCCESS.status, Enum.Events.EventStatus.SUCCESS.code, Enum.Events.EventStatus.SUCCESS.description)
    const event = StreamingProtocol.createEventMetadata(Enum.Events.Event.Type.SETTLEMENT_WINDOW, Enum.Events.Event.Action.CLOSE, state)
    const metadata = StreamingProtocol.createMetadata(eventId, event)
    const messageProtocol = StreamingProtocol.createMessage(messageId, Enum.Http.Headers.FSPIOP.SWITCH.value, Enum.Http.Headers.FSPIOP.SWITCH.value, metadata, undefined, { settlementWindowId: params.settlementWindowId })
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, Enum.Events.Event.Type.SETTLEMENT_WINDOW, Enum.Events.Event.Action.CLOSE)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, Enum.Events.Event.Type.SETTLEMENT_WINDOW.toUpperCase(), Enum.Events.Event.Action.CLOSE.toUpperCase())
    await Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

    return SettlementWindowModel.getById({ settlementWindowId }, enums)
  }
}
