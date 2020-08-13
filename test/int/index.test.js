
let request = require("supertest");
let config = require("../../config/default.json");

const Kafka = require("@mojaloop/central-services-shared").Util.Kafka;
const Config = require("../../src/lib/config");
const KafkaProducer = require("@mojaloop/central-services-stream").Util
const Enum = require("@mojaloop/central-services-shared").Enum;
const Producer = require("@mojaloop/central-services-stream").Util.Producer;
const Consumer = require("@mojaloop/central-services-stream").Util.Consumer;
const Uuid = require('uuid4')
const Db = require('../../src/lib/db')

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("it should test a message on the kafkatopic", () => {
  it("should use default port & host", async () => {
    const server = await require('../../src/api/index.js')
    console.log('app');
    request = request(`http://localhost:${config.PORT}`);

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

    await timeout(5000);
    // ADD DB EXPECTATIONS
  }, 30000);
});
