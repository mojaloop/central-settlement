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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/
'use strict'

/**
 * @module src/handlers/lib/kafka
 */

const Producer = require('@mojaloop/central-services-stream').Kafka.Producer
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

const listOfProducers = {}

/**
 * @function ProduceMessage
 *
 * @param {string} messageProtocol - message being created against topic
 * @param {object} topicConf - configuration for the topic to produce to
 * @param {object} config - Producer configuration, eg: to produce batch or poll
 *
 * @description Creates a producer on Kafka for the specified topic and configuration
 *
 * @returns {boolean} - returns true if producer successfully created and producers to
 * @throws {error} - if not successfully create/produced to
 */
const produceMessage = async (messageProtocol, topicConf, config) => {
  try {
    let producer
    if (listOfProducers[topicConf.topicName]) {
      producer = listOfProducers[topicConf.topicName]
    } else {
      Logger.isInfoEnabled && Logger.info('Producer::start::topic=' + topicConf.topicName)
      producer = new Producer(config)
      Logger.isInfoEnabled && Logger.info('Producer::connect::start')
      await producer.connect()
      Logger.isInfoEnabled && Logger.info('Producer::connect::end')
      listOfProducers[topicConf.topicName] = producer
    }
    Logger.isInfoEnabled && Logger.info(`Producer.sendMessage:: messageProtocol:'${JSON.stringify(messageProtocol)}'`)
    await producer.sendMessage(messageProtocol, topicConf)
    Logger.isInfoEnabled && Logger.info('Producer::end')
    return true
  } catch (err) {
    Logger.isInfoEnabled && Logger.info('Producer error has occurred')
    const error = ErrorHandler.Factory.createInternalServerFSPIOPError('Producer error has occurred', err)
    Logger.isErrorEnabled && Logger.error(err)
    throw error
  }
}

/**
 * @function Disconnect
 *
 * @param {string} topicName - Producer of the specified topic to be disconnected. If this is null, then ALL producers will be disconnected. Defaults: null.
 *
 * @description Disconnects a specific producer, or ALL producers from Kafka
 *
 * @returns {object} Promise
 */
const disconnect = async (topicName = null) => {
  if (topicName && typeof topicName === 'string') {
    await getProducer(topicName).disconnect()
  } else if (topicName === null) {
    let isError = false
    const errorTopicList = []

    let tpName
    for (tpName in listOfProducers) {
      try {
        await getProducer(tpName).disconnect()
      } catch (err) {
        Logger.isErrorEnabled && Logger.error(err)
        isError = true
        errorTopicList.push({ topic: tpName, error: err.toString() })
      }
    }
    if (isError) {
      const error = ErrorHandler.Factory.createInternalServerFSPIOPError(`The following Producers could not be disconnected: ${JSON.stringify(errorTopicList)}`)
      Logger.isErrorEnabled && Logger.error(error)
      throw error
    }
  } else {
    const error = ErrorHandler.Factory.createInternalServerFSPIOPError(`Unable to disconnect Producer: ${topicName}`)
    Logger.isErrorEnabled && Logger.error(error)
    throw error
  }
}

/**
 * @function GetProducer
 *
 * @param {string} topicName - the topic name to locate a specific producer
 *
 * @description This is used to get a producer with the topic name to send messages to a kafka topic
 *
 * @returns {Producer} - Returns consumer
 * @throws {Error} - if consumer not found for topic name
 */
const getProducer = (topicName) => {
  if (listOfProducers[topicName]) {
    return listOfProducers[topicName]
  } else {
    const error = ErrorHandler.Factory.createInternalServerFSPIOPError(`No producer found for topic ${topicName}`)
    Logger.isErrorEnabled && Logger.error(error)
    throw error
  }
}

module.exports = {
  getProducer,
  produceMessage,
  disconnect
}
