// const Test = require('tapes')(require('tape'))
// // let app = require('./app')
// const Db = require('../../src/lib/db')
//
let request = require('supertest')
let config = require('../../config/default.json')

const Kafka = require('@mojaloop/central-services-shared').Util.Kafka
const Config = require('../../src/lib/config')
const KafkaProducer = require('@mojaloop/central-services-stream').Util.Producer
const Enum = require('@mojaloop/central-services-shared').Enum
const Producer = require('@mojaloop/central-services-stream').Util.Producer
const Consumer = require('@mojaloop/central-services-stream').Util.Consumer
//
// const message = {
//   "value": {
//     "from": "fsp200195706",
//     "to": "fsp781121341",
//     "id": "5ea32b43-29c0-4067-8131-4a97a58801b7",
//     "content": {
//       "uriParams": {
//         "id": "5ea32b43-29c0-4067-8131-4a97a58801b7"
//       },
//       "headers": {
//         "content-type": "application/vnd.interoperability.transfers+json;version=1.0",
//         "fspiop-source": "fsp200195706",
//         "fspiop-destination": "fsp781121341",
//         "date": "2020-08-11T14:26:43.000Z",
//         "fspiop-signature": "{\"signature\":\"abcJjvNrkyK2KBieDUbGfhaBUn75aDUATNF4joqA8OLs4QgSD7i6EO8BIdy6Crph3LnXnTM20Ai1Z6nt0zliS_qPPLU9_vi6qLb15FOkl64DQs9hnfoGeo2tcjZJ88gm19uLY_s27AJqC1GH1B8E2emLrwQMDMikwQcYvXoyLrL7LL3CjaLMKdzR7KTcQi1tCK4sNg0noIQLpV3eA61kess\",\"protectedHeader\":\"eyJhbGciOiJSUzI1NiIsIkZTUElPUC1Tb3VyY2UiOiJmc3AyMDAxOTU3MDYiLCJGU1BJT1AtRGVzdGluYXRpb24iOiJmc3A3ODExMjEzNDEiLCJGU1BJT1AtVVJJIjoiL3RyYW5zZmVycy81ZWEzMmI0My0yOWMwLTQwNjctODEzMS00YTk3YTU4ODAxYjciLCJGU1BJT1AtSFRUUC1NZXRob2QiOiJQVVQiLCJEYXRlIjoiIn0\"}",
//         "fspiop-http-method": "PUT",
//         "fspiop-uri": "/transfers/5ea32b43-29c0-4067-8131-4a97a58801b7",
//         "traceparent": "00-0853bdf54cc997cb30a033eb1977431d-f34db460ef6d856d-30",
//         "tracestate": "mojasim=eyJzcGFuSWQiOiJmMzRkYjQ2MGVmNmQ4NTZkIn0=,acmevendor=eyJzcGFuSWQiOiI4ZmNmOWM3MWNlZDUwODc4IiwidGltZUFwaVByZXBhcmUiOiIxNTk3MTYzMjAyNzQ0In0=",
//         "user-agent": "axios/0.19.2",
//         "content-length": "136",
//         "host": "localhost:3000",
//         "connection": "close"
//       },
//       "payload": "data:application/vnd.interoperability.transfers+json;version=1.0;base64,eyJjb21wbGV0ZWRUaW1lc3RhbXAiOiIyMDIwLTA4LTExVDE2OjI2OjQzLjE5N1oiLCJ0cmFuc2ZlclN0YXRlIjoiQ09NTUlUVEVEIiwiZnVsZmlsbWVudCI6IlRZM1BKRmRkaW9UVmMtSXdydGNPX2pzeWY2andXRWJwckxvMzBCcHlHcDAifQ"
//     },
//     "type": "application/json",
//     "metadata": {
//       "correlationId": "5ea32b43-29c0-4067-8131-4a97a58801b7",
//       "event": {
//         "type": "notification",
//         "action": "commit",
//         "createdAt": "2020-08-11T16:26:43.203Z",
//         "state": {
//           "status": "success",
//           "code": 0,
//           "description": "action successful"
//         },
//         "id": "eeeb2c58-fd4a-4d42-b4cd-a11616b0a1e2",
//         "responseTo": "e09a7504-80be-406d-8da7-9162d919598a"
//       },
//       "trace": {
//         "startTimestamp": "2020-08-11T16:26:43.288Z",
//         "service": "cl_transfer_position",
//         "traceId": "0853bdf54cc997cb30a033eb1977431d",
//         "spanId": "5a1d918c9fce1907",
//         "parentSpanId": "fb420275efafa343",
//         "sampled": 0,
//         "flags": "30",
//         "tags": {
//           "tracestate": "acmevendor=eyJzcGFuSWQiOiI1YTFkOTE4YzlmY2UxOTA3IiwidGltZUFwaVByZXBhcmUiOiIxNTk3MTYzMjAyNzQ0IiwidGltZUFwaUZ1bGZpbCI6IjE1OTcxNjMyMDMyMDIifQ==,mojasim=eyJzcGFuSWQiOiJmMzRkYjQ2MGVmNmQ4NTZkIn0=",
//           "transactionType": "transfer",
//           "transactionAction": "fulfil",
//           "transactionId": "5ea32b43-29c0-4067-8131-4a97a58801b7",
//           "source": "fsp200195706",
//           "destination": "fsp781121341"
//         },
//         "tracestates": {
//           "acmevendor": {
//             "spanId": "5a1d918c9fce1907",
//             "timeApiPrepare": "1597163202744",
//             "timeApiFulfil": "1597163203202"
//           },
//           "mojasim": "eyJzcGFuSWQiOiJmMzRkYjQ2MGVmNmQ4NTZkIn0"
//         }
//       },
//       "protocol.createdAt": 1597163203334
//     }
//   },
//   "size": 2717,
//   "key": null,
//   "topic": "topic-notification-event",
//   "offset": 95,
//   "partition": 0,
//   "timestamp": 1597163203334
// }
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('it should test a message on the kafkatopic', () => {
  it('should use default port & host', async () => {
    request = request(`http://localhost:${config.PORT}`);
    // await Kafka.proceed(Config.KAFKA_CONFIG, params, { CONSUMER_COMMIT, fspiopError: fspiopError.toApiErrorObject(Config.ERROR_HANDLING), eventDetail, FROM_SWITCH })
    const fromSwitch = true;
    const message = {
      value: {
        from: 'fsp136265363',
        to: 'fsp915481406',
        id: '4351b05c-7bae-49a1-9398-6838dcd33957',
        content: {
            "uriParams": {
              "id": "84059aab-0e63-4d7a-a11a-9631a639ffb0"
            },
            "headers": {
              "content-type": "application/vnd.interoperability.transfers+json;version=1.0",
              "fspiop-source": "fsp504675996",
              "fspiop-destination": "fsp511290656",
              "date": "2020-08-11T10:50:35.000Z",
              "fspiop-signature": "{\"signature\":\"abcJjvNrkyK2KBieDUbGfhaBUn75aDUATNF4joqA8OLs4QgSD7i6EO8BIdy6Crph3LnXnTM20Ai1Z6nt0zliS_qPPLU9_vi6qLb15FOkl64DQs9hnfoGeo2tcjZJ88gm19uLY_s27AJqC1GH1B8E2emLrwQMDMikwQcYvXoyLrL7LL3CjaLMKdzR7KTcQi1tCK4sNg0noIQLpV3eA61kess\",\"protectedHeader\":\"eyJhbGciOiJSUzI1NiIsIkZTUElPUC1Tb3VyY2UiOiJmc3A1MDQ2NzU5OTYiLCJGU1BJT1AtRGVzdGluYXRpb24iOiJmc3A1MTEyOTA2NTYiLCJGU1BJT1AtVVJJIjoiL3RyYW5zZmVycy84NDA1OWFhYi0wZTYzLTRkN2EtYTExYS05NjMxYTYzOWZmYjAiLCJGU1BJT1AtSFRUUC1NZXRob2QiOiJQVVQiLCJEYXRlIjoiIn0\"}",
              "fspiop-http-method": "PUT",
              "fspiop-uri": "/transfers/84059aab-0e63-4d7a-a11a-9631a639ffb0",
              "traceparent": "00-5caa603eed88a0c925301ad3be5f4527-2857cfb70847c6e1-30",
              "tracestate": "mojasim=eyJzcGFuSWQiOiIyODU3Y2ZiNzA4NDdjNmUxIn0=,acmevendor=eyJzcGFuSWQiOiI1NWU2ODQzYjkwNTMwOGU0IiwidGltZUFwaVByZXBhcmUiOiIxNTk3MTUwMjMyMzkzIn0=",
              "user-agent": "axios/0.19.2",
              "content-length": "136",
              "host": "localhost:3000",
              "connection": "close"
            },
            "payload": "data:application/vnd.interoperability.transfers+json;version=1.0;base64,eyJjb21wbGV0ZWRUaW1lc3RhbXAiOiIyMDIwLTA4LTExVDEyOjUwOjM1LjQ3M1oiLCJ0cmFuc2ZlclN0YXRlIjoiQ09NTUlUVEVEIiwiZnVsZmlsbWVudCI6IlRZM1BKRmRkaW9UVmMtSXdydGNPX2pzeWY2andXRWJwckxvMzBCcHlHcDAifQ"
          },
        type: 'application/json',
        metadata: {
          "correlationId": "84059aab-0e63-4d7a-a11a-9631a639ffb0",
          "event": {
            "type": "notification",
            "action": "commit",
            "createdAt": "2020-08-11T12:50:35.493Z",
            "state": {
              "status": "success",
              "code": 0,
              "description": "action successful"
            },
            "id": "a5fba2f8-0f2a-4d5b-951a-7ab2387ddb6a",
            "responseTo": "5baa59fc-dd48-42b7-9062-35f8dca7695e"
          },
      },
      size: 2613,
      key: null,
      topic: 'topic-transfer-fulfil',
      offset: 9,
      partition: 0,
      timestamp: 1597162921898
    }
   }
    const kafkaTopic = 'topic-transfer-fulfil'
    const payload =  {
      completedTimestamp: '2020-08-11T16:26:43.197Z',
      transferState: 'COMMITTED',
      fulfilment: 'TY3PJFddioTVc-IwrtcO_jsyf6jwWEbprLo30BpyGp0'
    }
    const span = ''
    const params = { message, kafkaTopic, decodedPayload: payload, span, consumer: Consumer, producer: Producer }
    const consumerCommit = true
    const eventDetail =  { functionality: 'position', action: 'commit' }
    const toDestination = true

    // await Kafka.produceGeneralMessage(Config.KAFKA_CONFIG, KafkaProducer, Enum.Events.Event.Type.NOTIFICATION,
    //   Enum.Transfers.AdminNotificationActions.LIMIT_ADJUSTMENT, params, Enum.Events.EventStatus.SUCCESS)

    await Kafka.proceed(Config.KAFKA_CONFIG, params, { consumerCommit, eventDetail, toDestination })
    await timeout(5000);
    // const res = await request.get('/participants')
    // throw new Error('err')

  });
})
//
//
// {
//   "from": "fsp504675996",
//   "to": "fsp511290656",
//   "id": "84059aab-0e63-4d7a-a11a-9631a639ffb0",
  // "content": {
  //   "uriParams": {
  //     "id": "84059aab-0e63-4d7a-a11a-9631a639ffb0"
  //   },
  //   "headers": {
  //     "content-type": "application/vnd.interoperability.transfers+json;version=1.0",
  //     "fspiop-source": "fsp504675996",
  //     "fspiop-destination": "fsp511290656",
  //     "date": "2020-08-11T10:50:35.000Z",
  //     "fspiop-signature": "{\"signature\":\"abcJjvNrkyK2KBieDUbGfhaBUn75aDUATNF4joqA8OLs4QgSD7i6EO8BIdy6Crph3LnXnTM20Ai1Z6nt0zliS_qPPLU9_vi6qLb15FOkl64DQs9hnfoGeo2tcjZJ88gm19uLY_s27AJqC1GH1B8E2emLrwQMDMikwQcYvXoyLrL7LL3CjaLMKdzR7KTcQi1tCK4sNg0noIQLpV3eA61kess\",\"protectedHeader\":\"eyJhbGciOiJSUzI1NiIsIkZTUElPUC1Tb3VyY2UiOiJmc3A1MDQ2NzU5OTYiLCJGU1BJT1AtRGVzdGluYXRpb24iOiJmc3A1MTEyOTA2NTYiLCJGU1BJT1AtVVJJIjoiL3RyYW5zZmVycy84NDA1OWFhYi0wZTYzLTRkN2EtYTExYS05NjMxYTYzOWZmYjAiLCJGU1BJT1AtSFRUUC1NZXRob2QiOiJQVVQiLCJEYXRlIjoiIn0\"}",
  //     "fspiop-http-method": "PUT",
  //     "fspiop-uri": "/transfers/84059aab-0e63-4d7a-a11a-9631a639ffb0",
  //     "traceparent": "00-5caa603eed88a0c925301ad3be5f4527-2857cfb70847c6e1-30",
  //     "tracestate": "mojasim=eyJzcGFuSWQiOiIyODU3Y2ZiNzA4NDdjNmUxIn0=,acmevendor=eyJzcGFuSWQiOiI1NWU2ODQzYjkwNTMwOGU0IiwidGltZUFwaVByZXBhcmUiOiIxNTk3MTUwMjMyMzkzIn0=",
  //     "user-agent": "axios/0.19.2",
  //     "content-length": "136",
  //     "host": "localhost:3000",
  //     "connection": "close"
  //   },
  //   "payload": "data:application/vnd.interoperability.transfers+json;version=1.0;base64,eyJjb21wbGV0ZWRUaW1lc3RhbXAiOiIyMDIwLTA4LTExVDEyOjUwOjM1LjQ3M1oiLCJ0cmFuc2ZlclN0YXRlIjoiQ09NTUlUVEVEIiwiZnVsZmlsbWVudCI6IlRZM1BKRmRkaW9UVmMtSXdydGNPX2pzeWY2andXRWJwckxvMzBCcHlHcDAifQ"
  // },
//   "type": "application/json",
  // "metadata": {
  //   "correlationId": "84059aab-0e63-4d7a-a11a-9631a639ffb0",
  //   "event": {
  //     "type": "notification",
  //     "action": "commit",
  //     "createdAt": "2020-08-11T12:50:35.493Z",
  //     "state": {
  //       "status": "success",
  //       "code": 0,
  //       "description": "action successful"
  //     },
  //     "id": "a5fba2f8-0f2a-4d5b-951a-7ab2387ddb6a",
  //     "responseTo": "5baa59fc-dd48-42b7-9062-35f8dca7695e"
  //   },
//     "trace": {
//       "startTimestamp": "2020-08-11T12:50:40.050Z",
//       "service": "cl_transfer_position",
//       "traceId": "5caa603eed88a0c925301ad3be5f4527",
//       "spanId": "7ed006788fcb9bc6",
//       "parentSpanId": "691a7e2135101de5",
//       "sampled": 0,
//       "flags": "30",
//       "tags": {
//         "tracestate": "acmevendor=eyJzcGFuSWQiOiI3ZWQwMDY3ODhmY2I5YmM2IiwidGltZUFwaVByZXBhcmUiOiIxNTk3MTUwMjMyMzkzIiwidGltZUFwaUZ1bGZpbCI6IjE1OTcxNTAyMzU0ODgifQ==,mojasim=eyJzcGFuSWQiOiIyODU3Y2ZiNzA4NDdjNmUxIn0=",
//         "transactionType": "transfer",
//         "transactionAction": "fulfil",
//         "transactionId": "84059aab-0e63-4d7a-a11a-9631a639ffb0",
//         "source": "fsp504675996",
//         "destination": "fsp511290656"
//       },
//       "tracestates": {
//         "acmevendor": {
//           "spanId": "7ed006788fcb9bc6",
//           "timeApiPrepare": "1597150232393",
//           "timeApiFulfil": "1597150235488"
//         },
//         "mojasim": "eyJzcGFuSWQiOiIyODU3Y2ZiNzA4NDdjNmUxIn0"
//       }
//     },
//     "protocol.createdAt": 1597150240654
//   }
// }


// Test('setup', async setupTest => {
//   // setupTest.plan(1)
//   const app = await require('../../src/api/index')
//   request = supertest.agent(app.listener)
//
//   await setupTest.test('setup handlers', async (test) => {
//     // const knex = await Db.getKnex()
//
//     const knex = await Db.getKnex()
//     await knex('participantPosition').where('changedDate', '>', '2020-07-27').del()
//     await knex('participantCurrency').where('createdDate', '>', '2020-07-27').del()
//     await Db.ledgerAccountType.destroy({
//       name: 'testAccount2'
//     })
//     const res = await request.get('/participants')
//     console.log('Existing Participants', res)
//     const result = await request.post(
//       '/ledgerAccountTypes'
//     ).send({
//       name: 'testAccount2',
//       description: 'test ledger',
//       isActive: true,
//       isSettleable: true
//     })
//       .set('Accept', 'application/json')
//
//     console.log(result.body)
//     let resp = await request.get('/participants')
//     console.log('particpants2', JSON.stringify(resp.body))
//     resp = await request.get('/ledgerAccountTypes')
//     console.log('ledgerAccountTypes', JSON.stringify(resp.body))
//
//     console.log('OK')
//     test.pass('done')
//     test.end()
//     console.log('END')
//   })
//   console.log('ENDING')
//   await setupTest.end()
// })
