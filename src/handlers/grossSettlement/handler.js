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
 --------------
 ******/
'use strict'

// TODO Ref

/**
 * @module src/handlers/transfers
 */
const Config = require('../../lib/config')
const Consumer = require('@mojaloop/central-services-stream').Util.Consumer
const Enum = require('@mojaloop/central-services-shared').Enum
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Kafka = require('@mojaloop/central-services-shared').Util.Kafka
const Logger = require('@mojaloop/central-services-logger')
const Producer = require('@mojaloop/central-services-stream').Util.Producer
const retry = require('async-retry')
const transferSettlementService = require('../../domain/transferSettlement')
const Utility = require('@mojaloop/central-services-shared').Util
const Db = require('../../lib/db')
const LOG_LOCATION = { module: 'TransferFulfilHandler', method: '', path: '' } // var object used as pointer
const CONSUMER_COMMIT = true
const FROM_SWITCH = true

const RETRY_OPTIONS = {
  retries: Config.WINDOW_AGGREGATION_RETRY_COUNT,
  minTimeout: Config.WINDOW_AGGREGATION_RETRY_INTERVAL,
  maxTimeout: Config.WINDOW_AGGREGATION_RETRY_INTERVAL
}

async function processTransferSettlement (error, messages) {
  if (error) {
    Logger.error(error)
    throw ErrorHandling.Factory.reformatFSPIOPError(error)
  }
  Logger.info(Utility.breadcrumb(LOG_LOCATION, messages))
  let message = {}
  try {
    Logger.info(Utility.breadcrumb(LOG_LOCATION, { method: 'processTransferSettlement' }))
    if (Array.isArray(messages)) {
      message = messages[0]
    } else {
      message = messages
    }
    const payload = message.value.content.payload
    const kafkaTopic = message.topic
    const params = { message, kafkaTopic, decodedPayload: payload, consumer: Consumer, producer: Producer }

    const transferEventId = message.value.id
    const transferEventAction = message.value.metadata.event.action
    const transferEventStateStatus = message.value.metadata.event.state.status
    const actionLetter = transferEventAction === Enum.Events.Event.Action.COMMIT
      ? Enum.Events.ActionLetter.commit
      : Enum.Events.ActionLetter.unknown

    if (!payload) {
      Logger.info(Utility.breadcrumb(LOG_LOCATION, `missingPayload--${actionLetter}1`))
      const fspiopError = ErrorHandling.Factory.createInternalServerFSPIOPError('TransferSettlement handler missing payload')
      const eventDetail = { functionality: Enum.Events.Event.Type.NOTIFICATION, action: Enum.Events.Event.Action.SETTLEMENT_WINDOW }
      await Kafka.proceed(Config.KAFKA_CONFIG, params, { CONSUMER_COMMIT, fspiopError: fspiopError.toApiErrorObject(Config.ERROR_HANDLING), eventDetail, FROM_SWITCH })
      throw fspiopError
    }
    Logger.info(Utility.breadcrumb(LOG_LOCATION, 'validationPassed'))

    if (transferEventAction === Enum.Events.Event.Action.COMMIT) {
      await retry(async () => { // use bail(new Error('to break before max retries'))
        const knex = Db.getKnex()
        await knex.transaction(async trx => {
          try {
            await transferSettlementService.processMsgFulfil(transferEventId, transferEventStateStatus, trx)
            await trx.commit
          } catch (err) {
            await trx.rollback
            throw ErrorHandler.Factory.reformatFSPIOPError(err)
          }
        })
        Logger.info(Utility.breadcrumb(LOG_LOCATION, `done--${actionLetter}2`))
        return true
      }, RETRY_OPTIONS)
      return true
    }
  } catch (err) {
    Logger.error(`${Utility.breadcrumb(LOG_LOCATION)}::${err.message}--0`, err)
    return true
  }
}

/**
 * @function registerTransferFulfillHandler
 *
 * @async
 * @description Registers TransferFulfillHandler for processing fulfilled transfers. Gets Kafka config from default.json
 * Calls createHandler to register the handler against the Stream Processing API
 * @returns {boolean} - Returns a boolean: true if successful, or throws and error if failed
 */
async function registerTransferSettlement () {
  try {
    const transferFulfillHandler = {
      command: processTransferSettlement,
      topicName: Kafka.transformGeneralTopicName(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, Enum.Events.Event.Type.NOTIFICATION, Enum.Events.Event.Action.EVENT),
      config: Kafka.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.CONSUMER, Enum.Events.Event.Type.NOTIFICATION.toUpperCase(), Enum.Events.Event.Action.EVENT.toUpperCase())
    }
    await Consumer.createHandler(transferFulfillHandler.topicName, transferFulfillHandler.config, transferFulfillHandler.command)
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
async function registerAllHandlers () {
  try {
    await registerTransferSettlement()
    return true
  } catch (err) {
    Logger.error(err)
    throw ErrorHandling.Factory.reformatFSPIOPError(err)
  }
}

module.exports = {
  processTransferSettlement,
  registerAllHandlers,
  registerTransferSettlement
}
