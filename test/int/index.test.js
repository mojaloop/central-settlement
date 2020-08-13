// const Test = require('tapes')(require('tape'))
// // let app = require('./app')
// const Db = require('../../src/lib/db')
//
let request = require("supertest");
let config = require("../../config/default.json");

const Kafka = require("@mojaloop/central-services-shared").Util.Kafka;
const Config = require("../../src/lib/config");
const KafkaProducer = require("@mojaloop/central-services-stream").Util
  .Producer;
const Enum = require("@mojaloop/central-services-shared").Enum;
const Producer = require("@mojaloop/central-services-stream").Util.Producer;
const Consumer = require("@mojaloop/central-services-stream").Util.Consumer;
const Uuid = require('uuid4')
const Db = require('../../src/lib/db')

// sdk-standard-components



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

describe("it should test a message on the kafkatopic", () => {
  it("should use default port & host", async () => {
    const server = await require('../../src/api/index.js')
    console.log('app');
    request = request(`http://localhost:${config.PORT}`);
    // await Kafka.proceed(Config.KAFKA_CONFIG, params, { CONSUMER_COMMIT, fspiopError: fspiopError.toApiErrorObject(Config.ERROR_HANDLING), eventDetail, FROM_SWITCH })
    // const fromSwitch = true;
    const transactionId = Uuid()
    const message = {
      value: {
        from: "fsp781121341",
        to: "fsp200195706",
        id: transactionId,
        content: {
          uriParams: {
            id: "5ea32b43-29c0-4067-8131-4a97a58801b7"
          },
          headers: {
            "content-type":
              "application/vnd.interoperability.transfers+json;version=1.0",
            accept:
              "application/vnd.interoperability.transfers+json;version=1.0",
            date: "2020-08-11T14:26:42.000Z",
            "fspiop-source": "fsp781121341",
            "fspiop-destination": "fsp200195706",
            "user-agent": "axios/0.19.2",
            "content-length": 1349,
            host: "localhost:3000",
            connection: "close"
          },
          payload:
            "data:application/vnd.interoperability.transfers+json;version=1.0;base64,eyJ0cmFuc2ZlcklkIjoiNWVhMzJiNDMtMjljMC00MDY3LTgxMzEtNGE5N2E1ODgwMWI3IiwicGF5ZXJGc3AiOiJmc3A3ODExMjEzNDEiLCJwYXllZUZzcCI6ImZzcDIwMDE5NTcwNiIsImFtb3VudCI6eyJhbW91bnQiOiI0NS44NSIsImN1cnJlbmN5IjoiVFpTIn0sImlscFBhY2tldCI6IkFZSUM5QUFBQUFBQUFCZHdIV2N1Y0dGNVpXVm1jM0F1YlhOcGMyUnVMakl5TlRVMk9UazVNVEkxZ2dMS1pYbEtNR050Um5Wak1rWnFaRWRzZG1KcmJHdEphbTlwVFhwRmVrMTZTbXROYW1OMFRucFJNMWxwTURCUFZHczFURlJuZDA5VVNYUk9hazAxVDFkSk0xcEVhM2haYWtVMFNXbDNhV05ZVm5aa1IxWktXa05KTmtsdFVUVlpWRVpxVDFSV2EweFVVbXhhYWxsMFRrZEZlVTVETVdoT2JVNXBURmRKZWs1SFNURlBSRkV6VDFSTmVVMXBTWE5KYmtKb1pWZFdiRWxxY0RkSmJrSm9ZMjVTTlZOWFVrcGliVnAyU1dwd04wbHVRbWhqYmxJMVUxZFNWV1ZZUW14SmFtOXBWRlpPU2xVd1VrOUphWGRwWTBkR2VXUkliRXBhUjFaMVpFZHNiV0ZYVm5sSmFtOXBUV3BKTVU1VVdUVlBWR3Q0VFdwVmFVeERTbTFqTTBKS1drTkpOa2x1UW1obFYxWnNXbTVPZDBsdU1UbE1RMHAzV1Zoc2JHTnBTVFpsZVVwM1dWaEtNR1ZWYkd0VFZ6VnRZbmxKTm1WNVNuZFpXRW93WlZWc2ExWkliSGRhVTBrMlNXc3hWRk5XVGtWVWFVbHpTVzVDYUdOdVVqVlRWMUpzWW01U2NGcHRiR3hqYVVrMlNXcEplVTVVUVROTlJFRTBUVlJuZUVscGQybGFiazUzVTFkUmFVOXBTbmRaV0d4c1kyMWFlbU5EU2psTVEwcDNXbGhLZW1JeU5XaGlSV3gxV20wNGFVOXVjMmxaTWpsMFkwZDRiR1ZGTldoaVYxVnBUMjV6YVZwdGJIbGpNMUpQV1ZjeGJFbHFiMmxVVjBZd1kzbEpjMGx0ZUdoak0xSlBXVmN4YkVscWIybFRSMFp1WWxkR2RVbHVNSE5KYlZKb1pFZFdVRnByU25CamJsSnZTV3B2YVUxVWF6Uk5lVEI0VFVNd2VVNVRTamxtVTNkcFdWY3hkbVJYTlRCSmFuQTNTVzFHZEdJelZuVmtRMGsyU1dwWmQwbHBkMmxaTTFaNVkyMVdkVmt6YTJsUGFVcFdWVEJSYVdaVGQybGtTRXBvWW01T2FGa3pVbkJpTWpWVlpWaENiRWxxY0RkSmJrNXFXbGMxYUdOdGJIWkphbTlwVmtaS1FsUnNUa2RTVmtscFRFTktjR0p0YkRCaFYwWXdZak5KYVU5cFNsRlJWbXhHVldsSmMwbHRiSFZoV0ZKd1dWaFNkbU5zVWpWalIxVnBUMmxLUkZRd05WUldWVEZHVldsS09XWlJBQSIsImNvbmRpdGlvbiI6InUxY1NUQkxFWjAzYXd2ckxIV2FRakNuZDNHQUI5XzE3WTJXaEdkdmVwamsiLCJleHBpcmF0aW9uIjoiMjAyMC0wOC0xMlQxNjoyNjo0Mi43NDBaIiwiZXh0ZW5zaW9uTGlzdCI6eyJleHRlbnNpb24iOlt7ImtleSI6InByZXBhcmUiLCJ2YWx1ZSI6ImRlc2NyaXB0aW9uIn1dfX0"
        },
        type: "application/json",
        metadata: {
          correlationId: "5ea32b43-29c0-4067-8131-4a97a58801b7",
          event: {
            type: "notification",
            action: "prepare",
            createdAt: "2020-08-11T16:26:42.746Z",
            state: {
              status: "success",
              code: 0,
              description: "action successful"
            },
            id: "dbdfd85f-efec-4354-a522-53f0cdc992bf",
            responseTo: "0f5c199e-d3b8-4e2e-81ed-fb0707d68d40"
          }
        }
      },
      size: 3409,
      key: null,
      topic: "topic-notification-event",
      offset: 94,
      partition: 0,
      timestamp: 1597163203169
    };

    const value = `AYIC9AAAAAAAABdwHWcucGF5ZWVmc3AubXNpc2RuLjIyNTU2OTk5MTI1ggLKZXlKMGNtRnVjMkZqZEdsdmJrbGtJam9pTXpFek16SmtNamN0TnpRM1lpMDBPVGs1TFRnd09USXROak01T1dJM1pEa3hZakU0SWl3aWNYVnZkR1ZKWkNJNkltUTVZVEZqT1RWa0xUUmxaall0TkdFeU5DMWhObU5pTFdJek5HSTFPRFEzT1RNeU1pSXNJbkJoZVdWbElqcDdJbkJoY25SNVNXUkpibVp2SWpwN0luQmhjblI1U1dSVWVYQmxJam9pVFZOSlUwUk9JaXdpY0dGeWRIbEpaR1Z1ZEdsbWFXVnlJam9pTWpJMU5UWTVPVGt4TWpVaUxDSm1jM0JKWkNJNkluQmhlV1ZsWm5Od0luMTlMQ0p3WVhsbGNpSTZleUp3WVhKMGVVbGtTVzVtYnlJNmV5SndZWEowZVVsa1ZIbHdaU0k2SWsxVFNWTkVUaUlzSW5CaGNuUjVTV1JsYm5ScFptbGxjaUk2SWpJeU5UQTNNREE0TVRneElpd2labk53U1dRaU9pSndZWGxsY21aemNDSjlMQ0p3WlhKemIyNWhiRWx1Wm04aU9uc2lZMjl0Y0d4bGVFNWhiV1VpT25zaVptbHljM1JPWVcxbElqb2lUV0YwY3lJc0lteGhjM1JPWVcxbElqb2lTR0ZuYldGdUluMHNJbVJoZEdWUFprSnBjblJvSWpvaU1UazRNeTB4TUMweU5TSjlmU3dpWVcxdmRXNTBJanA3SW1GdGIzVnVkQ0k2SWpZd0lpd2lZM1Z5Y21WdVkza2lPaUpWVTBRaWZTd2lkSEpoYm5OaFkzUnBiMjVVZVhCbElqcDdJbk5qWlc1aGNtbHZJam9pVkZKQlRsTkdSVklpTENKcGJtbDBhV0YwYjNJaU9pSlFRVmxGVWlJc0ltbHVhWFJwWVhSdmNsUjVjR1VpT2lKRFQwNVRWVTFGVWlKOWZRAA`;
    const ilpPacket = require("ilp-packet");
    const base64url = require("base64url");

    const binaryPacket = Buffer.from(value, "base64");
    const jsonPacket = ilpPacket.deserializeIlpPayment(binaryPacket);
    const decodedData = base64url.decode(jsonPacket.data.toString());
    console.log("DECODED DATA", decodedData);

    const TRANSACTION = {
      "transactionId": transactionId,
      "quoteId": "61b095e0-530e-46f5-9795-1bf1a19d4fd2",
      "payee": {
        "partyIdInfo": {
          "partyIdType": "MSISDN",
          "partyIdentifier": "27713803915",
          "fspId": "testfsp2",
          "extensionList": {
            "extension": [
              {
                "key": "accountType",
                "value": "Wallet"
              }
            ]
          }
        },
        "personalInfo": {
          "complexName": {
            "firstName": "testfsp2WalletFname",
            "lastName": "testfsp2WalletLname"
          },
          "dateOfBirth": "1985-05-13"
        }
      },
      "payer": {
        "partyIdInfo": {
          "partyIdType": "MSISDN",
          "partyIdentifier": "27713803914",
          "fspId": "testfsp1",
          "extensionList": {
            "extension": [
              {
                "key": "accountType",
                "value": "Wallet"
              }
            ]
          }
        },
        "name": "testfsp1Fname testfsp1Lname"
      },
      "amount": {
        "amount": "211.15",
        "currency": "TZS"
      },
      "transactionType": {
        "scenario": "TRANSFER",
        "initiator": "PAYER",
        "initiatorType": "CONSUMER"
      }
    }

    const transactionObject = {
        transactionId: TRANSACTION.transactionId,
        quoteId: TRANSACTION.quoteId,
        payee: TRANSACTION.payee,
        payer: TRANSACTION.payer,
        amount: TRANSACTION.amount,
        transactionType: TRANSACTION.transactionType,
        note: 'test payment'
    };

    const ilpData = Buffer.from(base64url(JSON.stringify(transactionObject)));
    const decimalPlaces = 2;
    const packetInput = {
        amount: `${Number(TRANSACTION.amount) * Math.pow(10, decimalPlaces)}`,  // unsigned 64bit integer as a string
        account: `g.${TRANSACTION.payer.fspId}.${TRANSACTION.payer.partyIdInfo.partyIdType.toLowerCase()}.${TRANSACTION.payer.partyIdInfo.partyIdentifier.toLowerCase()}`, // ilp address
        data: ilpData // base64url encoded attached data
    };
    const packet = ilpPacket.serializeIlpPayment(packetInput);

    let base64encodedIlpPacket = base64url.fromBase64(packet.toString('base64')).replace('"', '');

    console.log('ENCODED ILP Packet', base64encodedIlpPacket);

    const jsonPacket2 = await ilpPacket.deserializeIlpPayment(Buffer.from(base64encodedIlpPacket, 'base64'))
    const decodedData2 = base64url.decode(jsonPacket2.data.toString())
    console.log('DECODED DATA from ILP PACKET 2', decodedData2 )

    await Db.transferDuplicateCheck.insert({
      transferId: transactionId,
      hash: 'someHash',
    })
    await Db.transfer.insert({
      transferId: transactionId,
      amount: TRANSACTION.amount.amount,
      currencyId: TRANSACTION.amount.currency,
      ilpCondition: 'testCondition',
      expirationDate: '2020-06-30 17:10:51',
    })
    await Db.ilpPacket.insert({
      transferId: transactionId,
      value: base64encodedIlpPacket
    })



    // let generatedFulfilment = this.caluclateFulfil(base64encodedIlpPacket).replace('"', '');
    // let generatedCondition = this.calculateConditionFromFulfil(generatedFulfilment).replace('"', '');

    // const ret = {
    //     fulfilment: generatedFulfilment,
    //     ilpPacket: base64encodedIlpPacket,
    //     condition: generatedCondition
    // };
    //
    // this.logger.log(`Generated ILP: transaction object: ${util.inspect(transactionObject)}\nPacket input: ${util.inspect(packetInput)}\nOutput: ${util.inspect(ret)}`);
    //
    // return ret;


//
//     try {
//     const binaryPacket2 = ilpPacket.serializeIlpPayment(TRANSACTION)
//     console.log('SERIALIZED ILP', binaryPacket2.toString('hex'))
// }
// catch (err) {
//   console.log(err);
// }

    /// SELECT * FROM central_ledger_integration.ilpPacket where transferId = '5ea32b43-29c0-4067-8131-4a97a58801b7'

    // const binaryPacket = packet.serializeIlpPayment({
    //   amount: '123000000',       // Unsigned 64-bit integer as a string
    //   account: 'g.us.nexus.bob', // ILP Address
    //   data: 'BBBB'               // Base64url-encoded attached data
    // }) // returns a Buffer

    //
    // console.log(binaryPacket.toString('hex'))
    // const kafkaTopic = 'topic-transfer-fulfil'
    // const payload =  {
    //   completedTimestamp: '2020-08-11T16:26:43.197Z',
    //   transferState: 'COMMITTED',
    //   fulfilment: 'TY3PJFddioTVc-IwrtcO_jsyf6jwWEbprLo30BpyGp0'
    // }
    // const span = ''
    // const params = { message, kafkaTopic, decodedPayload: payload, span, consumer: Consumer, producer: Producer }
    // const consumerCommit = true
    // const eventDetail =  { functionality: 'position', action: 'commit' }
    // const toDestination = true

    // await Kafka.produceGeneralMessage(Config.KAFKA_CONFIG, KafkaProducer, Enum.Events.Event.Type.NOTIFICATION,
    //   Enum.Transfers.AdminNotificationActions.LIMIT_ADJUSTMENT, params, Enum.Events.EventStatus.SUCCESS)
    // const topicName: Kafka.transformGeneralTopicName(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, TransferEventType.TRANSFER, TransferEventType.FULFIL),
    // (defaultKafkaConfig, kafkaProducer, functionality, action, message, state, key = null, span = null)
    console.log(message);
    await Kafka.produceGeneralMessage(
      Config.KAFKA_CONFIG,
      KafkaProducer,
      Enum.Events.Event.Type.NOTIFICATION,
      Enum.Events.Event.Action.COMMIT,
      message.value,
      Enum.Events.EventStatus.SUCCESS,
      "fsp511290656"
    );

    // await Consumer.createHandler(fulfillHandler.topicName, fulfillHandler.config, fulfillHandler.command)

    // await Kafka.proceed(Config.KAFKA_CONFIG, params, { consumerCommit, eventDetail, toDestination })
    await timeout(5000);
    // const res = await request.get('/participants')
    // throw new Error('err')
  }, 30000);
});
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
//
//
//
//  {
//   "value": {
//     "from": "fsp781121341",
//     "to": "fsp200195706",
//     "id": "5ea32b43-29c0-4067-8131-4a97a58801b7",
//     "content": {
//       "uriParams": {
//         "id": "5ea32b43-29c0-4067-8131-4a97a58801b7"
//       },
//       "headers": {
//         "content-type": "application/vnd.interoperability.transfers+json;version=1.0",
//         "accept": "application/vnd.interoperability.transfers+json;version=1.0",
//         "date": "2020-08-11T14:26:42.000Z",
//         "fspiop-source": "fsp781121341",
//         "fspiop-destination": "fsp200195706",
//         "user-agent": "axios/0.19.2",
//         "content-length": 1349,
//         "host": "localhost:3000",
//         "connection": "close"
//       },
//       "payload": "data:application/vnd.interoperability.transfers+json;version=1.0;base64,eyJ0cmFuc2ZlcklkIjoiNWVhMzJiNDMtMjljMC00MDY3LTgxMzEtNGE5N2E1ODgwMWI3IiwicGF5ZXJGc3AiOiJmc3A3ODExMjEzNDEiLCJwYXllZUZzcCI6ImZzcDIwMDE5NTcwNiIsImFtb3VudCI6eyJhbW91bnQiOiI0NS44NSIsImN1cnJlbmN5IjoiVFpTIn0sImlscFBhY2tldCI6IkFZSUM5QUFBQUFBQUFCZHdIV2N1Y0dGNVpXVm1jM0F1YlhOcGMyUnVMakl5TlRVMk9UazVNVEkxZ2dMS1pYbEtNR050Um5Wak1rWnFaRWRzZG1KcmJHdEphbTlwVFhwRmVrMTZTbXROYW1OMFRucFJNMWxwTURCUFZHczFURlJuZDA5VVNYUk9hazAxVDFkSk0xcEVhM2haYWtVMFNXbDNhV05ZVm5aa1IxWktXa05KTmtsdFVUVlpWRVpxVDFSV2EweFVVbXhhYWxsMFRrZEZlVTVETVdoT2JVNXBURmRKZWs1SFNURlBSRkV6VDFSTmVVMXBTWE5KYmtKb1pWZFdiRWxxY0RkSmJrSm9ZMjVTTlZOWFVrcGliVnAyU1dwd04wbHVRbWhqYmxJMVUxZFNWV1ZZUW14SmFtOXBWRlpPU2xVd1VrOUphWGRwWTBkR2VXUkliRXBhUjFaMVpFZHNiV0ZYVm5sSmFtOXBUV3BKTVU1VVdUVlBWR3Q0VFdwVmFVeERTbTFqTTBKS1drTkpOa2x1UW1obFYxWnNXbTVPZDBsdU1UbE1RMHAzV1Zoc2JHTnBTVFpsZVVwM1dWaEtNR1ZWYkd0VFZ6VnRZbmxKTm1WNVNuZFpXRW93WlZWc2ExWkliSGRhVTBrMlNXc3hWRk5XVGtWVWFVbHpTVzVDYUdOdVVqVlRWMUpzWW01U2NGcHRiR3hqYVVrMlNXcEplVTVVUVROTlJFRTBUVlJuZUVscGQybGFiazUzVTFkUmFVOXBTbmRaV0d4c1kyMWFlbU5EU2psTVEwcDNXbGhLZW1JeU5XaGlSV3gxV20wNGFVOXVjMmxaTWpsMFkwZDRiR1ZGTldoaVYxVnBUMjV6YVZwdGJIbGpNMUpQV1ZjeGJFbHFiMmxVVjBZd1kzbEpjMGx0ZUdoak0xSlBXVmN4YkVscWIybFRSMFp1WWxkR2RVbHVNSE5KYlZKb1pFZFdVRnByU25CamJsSnZTV3B2YVUxVWF6Uk5lVEI0VFVNd2VVNVRTamxtVTNkcFdWY3hkbVJYTlRCSmFuQTNTVzFHZEdJelZuVmtRMGsyU1dwWmQwbHBkMmxaTTFaNVkyMVdkVmt6YTJsUGFVcFdWVEJSYVdaVGQybGtTRXBvWW01T2FGa3pVbkJpTWpWVlpWaENiRWxxY0RkSmJrNXFXbGMxYUdOdGJIWkphbTlwVmtaS1FsUnNUa2RTVmtscFRFTktjR0p0YkRCaFYwWXdZak5KYVU5cFNsRlJWbXhHVldsSmMwbHRiSFZoV0ZKd1dWaFNkbU5zVWpWalIxVnBUMmxLUkZRd05WUldWVEZHVldsS09XWlJBQSIsImNvbmRpdGlvbiI6InUxY1NUQkxFWjAzYXd2ckxIV2FRakNuZDNHQUI5XzE3WTJXaEdkdmVwamsiLCJleHBpcmF0aW9uIjoiMjAyMC0wOC0xMlQxNjoyNjo0Mi43NDBaIiwiZXh0ZW5zaW9uTGlzdCI6eyJleHRlbnNpb24iOlt7ImtleSI6InByZXBhcmUiLCJ2YWx1ZSI6ImRlc2NyaXB0aW9uIn1dfX0"
//     },
//     "type": "application/json",
//     "metadata": {
//       "correlationId": "5ea32b43-29c0-4067-8131-4a97a58801b7",
//       "event": {
//         "type": "notification",
//         "action": "prepare",
//         "createdAt": "2020-08-11T16:26:42.746Z",
//         "state": {
//           "status": "success",
//           "code": 0,
//           "description": "action successful"
//         },
//         "id": "dbdfd85f-efec-4354-a522-53f0cdc992bf",
//         "responseTo": "0f5c199e-d3b8-4e2e-81ed-fb0707d68d40"
//       },
//       "trace": {
//         "startTimestamp": "2020-08-11T16:26:43.125Z",
//         "service": "cl_transfer_position",
//         "traceId": "0853bdf54cc997cb30a033eb1977431d",
//         "spanId": "f760f56f53b725f6",
//         "parentSpanId": "33141e3a183a85a6",
//         "tags": {
//           "tracestate": "acmevendor=eyJzcGFuSWQiOiJmNzYwZjU2ZjUzYjcyNWY2IiwidGltZUFwaVByZXBhcmUiOiIxNTk3MTYzMjAyNzQ0In0=",
//           "transactionType": "transfer",
//           "transactionAction": "prepare",
//           "transactionId": "5ea32b43-29c0-4067-8131-4a97a58801b7",
//           "source": "fsp781121341",
//           "destination": "fsp200195706",
//           "payerFsp": "fsp781121341",
//           "payeeFsp": "fsp200195706"
//         },
//         "tracestates": {
//           "acmevendor": {
//             "spanId": "f760f56f53b725f6",
//             "timeApiPrepare": "1597163202744"
//           }
//         }
//       },
//       "protocol.createdAt": 1597163203169
//     }
//   },
//   "size": 3409,
//   "key": null,
//   "topic": "topic-notification-event",
//   "offset": 94,
//   "partition": 0,
//   "timestamp": 1597163203169
// }
