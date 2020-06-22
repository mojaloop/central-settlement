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

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Util = require('@mojaloop/central-services-shared').Util
const Kafka = require('@mojaloop/central-services-shared').Util.Kafka
const Consumer = require('@mojaloop/central-services-stream').Util.Consumer
const KafkaConsumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Uuid = require('uuid4')
const TransferFulfilService = require('../../../../src/domain/transferParticipantStateChange/index')
const TransferFulfilHandler = require('../../../../src/handlers/transferParticipantStateChange/handler')

var payload = {
  settlementWindowId: '3',
  reason: 'test'
}
const transfer = {
  transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8999',
  payerFsp: 'dfsp1',
  payeeFsp: 'dfsp2',
  amount: {
    currency: 'USD',
    amount: '433.88'
  },
  ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
  condition: 'YlK5TZyhflbXaDRPtR5zhCu8FrbgvrQwwmzuH0iQ0AI',
  expiration: '2016-05-24T08:38:08.699-04:00',
  extensionList: {
    extension: [
      {
        key: 'key1',
        value: 'value1'
      },
      {
        key: 'key2',
        value: 'value2'
      }
    ]
  }
}
const messageProtocol = {
  id: Uuid(),
  from: transfer.payerFsp,
  to: transfer.payeeFsp,
  type: 'application/json',
  content: {
    headers: { 'fspiop-destination': transfer.payerFsp },
    uriParams: { id: transfer.transferId },
    payload
  },
  metadata: {
    event: {
      id: Uuid(),
      type: 'settlement',
      action: 'commit',
      createdAt: new Date(),
      state: {
        status: 'success',
        code: 0
      }
    }
  },
  pp: ''
}

const topicName = 'topic-test'

const messages = [
  {
    topic: topicName,
    value: messageProtocol
  }
]

const config = {
  options: {
    mode: 2,
    batchSize: 1,
    pollFrequency: 10,
    recursiveTimeout: 100,
    messageCharset: 'utf8',
    messageAsJSON: true,
    sync: true,
    consumeTimeout: 1000
  },
  rdkafkaConf: {
    'client.id': 'kafka-test',
    debug: 'all',
    'group.id': 'central-ledger-kafka',
    'metadata.broker.list': 'localhost:9092',
    'enable.auto.commit': false
  }
}

const command = () => {}

Test('TransferFulfilHandler', async (transferFulfilHandlerTest) => {
  let sandbox

  transferFulfilHandlerTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(KafkaConsumer.prototype, 'constructor').returns(Promise.resolve())
    sandbox.stub(KafkaConsumer.prototype, 'connect').returns(Promise.resolve())
    sandbox.stub(KafkaConsumer.prototype, 'consume').returns(Promise.resolve())
    sandbox.stub(KafkaConsumer.prototype, 'commitMessageSync').returns(Promise.resolve())
    sandbox.stub(Consumer, 'getConsumer').returns({
      commitMessageSync: async function () {
        return true
      }
    })
    sandbox.stub(Consumer, 'isConsumerAutoCommitEnabled').returns(false)
    sandbox.stub(Kafka)
    sandbox.stub(Util.StreamingProtocol)
    sandbox.stub(TransferFulfilService)
    Kafka.produceGeneralMessage.returns(Promise.resolve())
    test.end()
  })

  transferFulfilHandlerTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  transferFulfilHandlerTest.test('processTransferFulfil should', processTransferFulfilTest => {
    processTransferFulfilTest.test('create transferParticipantRecords when messages is in array', async (test) => {
      const localMessages = Util.clone(messages)
      await Consumer.createHandler(topicName, config, command)
      Kafka.transformAccountToTopicName.returns(topicName)
      Kafka.proceed.returns(true)
      const result = await TransferFulfilHandler.processTransferParticipantStateChange(null, localMessages)
      test.equal(result, true)
      test.end()
    })

    processTransferFulfilTest.test('create transferParticipantRecords when there is a single message', async (test) => {
      const localMessages = Util.clone(messages)
      await Consumer.createHandler(topicName, config, command)
      Kafka.transformAccountToTopicName.returns(topicName)
      Kafka.proceed.returns(true)
      const result = await TransferFulfilHandler.processTransferParticipantStateChange(null, localMessages[0])
      test.equal(result, true)
      test.end()
    })

    processTransferFulfilTest.test('create a FSPIOP error when an error condition is passed in', async (test) => {
      const localMessages = Util.clone(messages)
      await Consumer.createHandler(topicName, config, command)
      Kafka.transformAccountToTopicName.returns(topicName)
      Kafka.proceed.returns(true)
      try {
        await TransferFulfilHandler.processTransferParticipantStateChange(true, localMessages[0])
        test.fail('should throw error')
        test.end()
      } catch (err) {
        test.ok('FSPIOP Error is thrown.')
        test.end()
      }
    })

    processTransferFulfilTest.test('create a FSPIOP error when the payload is null', async (test) => {
      const localMessages = Util.clone(messages)
      localMessages[0].value.content.payload = null
      await Consumer.createHandler(topicName, config, command)
      Kafka.transformAccountToTopicName.returns(topicName)
      Kafka.proceed.returns(true)
      try {
        await TransferFulfilHandler.processTransferParticipantStateChange(null, localMessages[0])
        test.pass('Update terminated due to missing payload')
        test.end()
      } catch (err) {
        test.ok('FSPIOP Error is thrown.')
        test.end()
      }
    })
    // ===
    processTransferFulfilTest.test('create a FSPIOP error when the event action is unknown', async (test) => {
      const localMessages = Util.clone(messages)
      localMessages[0].value.metadata.event.action = 'unknown'
      await Consumer.createHandler(topicName, config, command)
      Kafka.transformAccountToTopicName.returns(topicName)
      Kafka.proceed.returns(true)
      try {
        await TransferFulfilHandler.processTransferParticipantStateChange(null, localMessages[0])
        test.pass('Update terminated due to unknown event action')
        test.end()
      } catch (err) {
        test.ok('FSPIOP Error is thrown.')
        test.end()
      }
    })
    // ==
    processTransferFulfilTest.end()
  })
  transferFulfilHandlerTest.test('registerAllHandlers should', registerAllHandlersTest => {
    registerAllHandlersTest.test('register all consumers on Kafka', async (test) => {
      await Consumer.createHandler(topicName, config, command)
      Kafka.transformAccountToTopicName.returns(topicName)
      Kafka.proceed.returns(true)
      Kafka.transformGeneralTopicName.returns(topicName)
      Kafka.getKafkaConfig.returns(config)
      const result = await TransferFulfilHandler.registerAllHandlers()
      test.equal(result, true)
      test.end()
    })

    transferFulfilHandlerTest.test('throw error registerAllHandlers', async (test) => {
      try {
        await Consumer.createHandler(topicName, config, command)
        Kafka.transformAccountToTopicName.returns(topicName)
        Kafka.proceed.returns(true)
        Kafka.transformGeneralTopicName.returns(topicName)
        Kafka.getKafkaConfig.throws(new Error())

        await TransferFulfilHandler.registerAllHandlers()
        test.fail('Error not thrown')
        test.end()
      } catch (e) {
        test.pass('Error thrown')
        test.end()
      }
    })
    registerAllHandlersTest.end()
  })
  transferFulfilHandlerTest.end()
})
