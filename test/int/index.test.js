/* eslint-env jest */

let request = require('supertest')
const config = require('../../config/default.json')

const Kafka = require('@mojaloop/central-services-shared').Util.Kafka
const Config = require('../../src/lib/config')
const KafkaProducer = require('@mojaloop/central-services-stream').Util.Producer
const Enum = require('@mojaloop/central-services-shared').Enum
const Db = require('../../src/lib/db')
const ilpPacket = require('ilp-packet')
const base64url = require('base64url')
const idGenerator = require('@mojaloop/central-services-shared').Util.id
const chai = require('chai')
const chaiExclude = require('chai-exclude')
const chaiSubset = require('chai-subset')

const generateULID = idGenerator({ type: 'ulid' })
chai.use(chaiExclude)
chai.use(chaiSubset)
const expect = chai.expect

function timeout (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('when a transfer notification with COMMITTED status is received  ', () => {
  // TODO refactor send kafka message in  before()
  // refactor separate checks
  it(`it should
    update the ledger entries,
    update the participantPosition records for payeer and payee
    update participantPositionChange records for payeer and payee
    with a 0.006 % fee amount`, async () => {
    await require('../../src/api/index.js')
    request = request(`http://localhost:${config.PORT}`)

    const transactionId = generateULID()
    const message = {
      value: {
        from: 'fsp781121341',
        to: 'fsp200195706',
        id: transactionId,
        content: {
          uriParams: {
            id: '5ea32b43-29c0-4067-8131-4a97a58801b7'
          },
          headers: {
            'content-type':
              'application/vnd.interoperability.transfers+json;version=1.0',
            accept:
              'application/vnd.interoperability.transfers+json;version=1.0',
            date: '2020-08-11T14:26:42.000Z',
            'fspiop-source': 'fsp781121341',
            'fspiop-destination': 'fsp200195706',
            'user-agent': 'axios/0.19.2',
            'content-length': 1349,
            host: 'localhost:3000',
            connection: 'close'
          },
          payload:
            'data:application/vnd.interoperability.transfers+json;version=1.0;base64,eyJ0cmFuc2ZlcklkIjoiNWVhMzJiNDMtMjljMC00MDY3LTgxMzEtNGE5N2E1ODgwMWI3IiwicGF5ZXJGc3AiOiJmc3A3ODExMjEzNDEiLCJwYXllZUZzcCI6ImZzcDIwMDE5NTcwNiIsImFtb3VudCI6eyJhbW91bnQiOiI0NS44NSIsImN1cnJlbmN5IjoiVFpTIn0sImlscFBhY2tldCI6IkFZSUM5QUFBQUFBQUFCZHdIV2N1Y0dGNVpXVm1jM0F1YlhOcGMyUnVMakl5TlRVMk9UazVNVEkxZ2dMS1pYbEtNR050Um5Wak1rWnFaRWRzZG1KcmJHdEphbTlwVFhwRmVrMTZTbXROYW1OMFRucFJNMWxwTURCUFZHczFURlJuZDA5VVNYUk9hazAxVDFkSk0xcEVhM2haYWtVMFNXbDNhV05ZVm5aa1IxWktXa05KTmtsdFVUVlpWRVpxVDFSV2EweFVVbXhhYWxsMFRrZEZlVTVETVdoT2JVNXBURmRKZWs1SFNURlBSRkV6VDFSTmVVMXBTWE5KYmtKb1pWZFdiRWxxY0RkSmJrSm9ZMjVTTlZOWFVrcGliVnAyU1dwd04wbHVRbWhqYmxJMVUxZFNWV1ZZUW14SmFtOXBWRlpPU2xVd1VrOUphWGRwWTBkR2VXUkliRXBhUjFaMVpFZHNiV0ZYVm5sSmFtOXBUV3BKTVU1VVdUVlBWR3Q0VFdwVmFVeERTbTFqTTBKS1drTkpOa2x1UW1obFYxWnNXbTVPZDBsdU1UbE1RMHAzV1Zoc2JHTnBTVFpsZVVwM1dWaEtNR1ZWYkd0VFZ6VnRZbmxKTm1WNVNuZFpXRW93WlZWc2ExWkliSGRhVTBrMlNXc3hWRk5XVGtWVWFVbHpTVzVDYUdOdVVqVlRWMUpzWW01U2NGcHRiR3hqYVVrMlNXcEplVTVVUVROTlJFRTBUVlJuZUVscGQybGFiazUzVTFkUmFVOXBTbmRaV0d4c1kyMWFlbU5EU2psTVEwcDNXbGhLZW1JeU5XaGlSV3gxV20wNGFVOXVjMmxaTWpsMFkwZDRiR1ZGTldoaVYxVnBUMjV6YVZwdGJIbGpNMUpQV1ZjeGJFbHFiMmxVVjBZd1kzbEpjMGx0ZUdoak0xSlBXVmN4YkVscWIybFRSMFp1WWxkR2RVbHVNSE5KYlZKb1pFZFdVRnByU25CamJsSnZTV3B2YVUxVWF6Uk5lVEI0VFVNd2VVNVRTamxtVTNkcFdWY3hkbVJYTlRCSmFuQTNTVzFHZEdJelZuVmtRMGsyU1dwWmQwbHBkMmxaTTFaNVkyMVdkVmt6YTJsUGFVcFdWVEJSYVdaVGQybGtTRXBvWW01T2FGa3pVbkJpTWpWVlpWaENiRWxxY0RkSmJrNXFXbGMxYUdOdGJIWkphbTlwVmtaS1FsUnNUa2RTVmtscFRFTktjR0p0YkRCaFYwWXdZak5KYVU5cFNsRlJWbXhHVldsSmMwbHRiSFZoV0ZKd1dWaFNkbU5zVWpWalIxVnBUMmxLUkZRd05WUldWVEZHVldsS09XWlJBQSIsImNvbmRpdGlvbiI6InUxY1NUQkxFWjAzYXd2ckxIV2FRakNuZDNHQUI5XzE3WTJXaEdkdmVwamsiLCJleHBpcmF0aW9uIjoiMjAyMC0wOC0xMlQxNjoyNjo0Mi43NDBaIiwiZXh0ZW5zaW9uTGlzdCI6eyJleHRlbnNpb24iOlt7ImtleSI6InByZXBhcmUiLCJ2YWx1ZSI6ImRlc2NyaXB0aW9uIn1dfX0'
        },
        type: 'application/json',
        metadata: {
          correlationId: '5ea32b43-29c0-4067-8131-4a97a58801b7',
          event: {
            type: 'notification',
            action: 'prepare',
            createdAt: '2020-08-11T16:26:42.746Z',
            state: {
              status: 'success',
              code: 0,
              description: 'action successful'
            },
            id: 'dbdfd85f-efec-4354-a522-53f0cdc992bf',
            responseTo: '0f5c199e-d3b8-4e2e-81ed-fb0707d68d40'
          }
        }
      },
      size: 3409,
      key: null,
      topic: 'topic-notification-event',
      offset: 94,
      partition: 0,
      timestamp: 1597163203169
    }

    const TRANSACTION = {
      transactionId,
      quoteId: '61b095e0-530e-46f5-9795-1bf1a19d4fd2',
      payee: {
        partyIdInfo: {
          partyIdType: 'MSISDN',
          partyIdentifier: '27713803915',
          fspId: 'testfsp2',
          extensionList: {
            extension: [
              {
                key: 'accountType',
                value: 'Wallet'
              }
            ]
          }
        },
        personalInfo: {
          complexName: {
            firstName: 'testfsp2WalletFname',
            lastName: 'testfsp2WalletLname'
          },
          dateOfBirth: '1985-05-13'
        }
      },
      payer: {
        partyIdInfo: {
          partyIdType: 'MSISDN',
          partyIdentifier: '27713803914',
          fspId: 'testfsp1',
          extensionList: {
            extension: [
              {
                key: 'accountType',
                value: 'Wallet'
              }
            ]
          }
        },
        name: 'testfsp1Fname testfsp1Lname'
      },
      amount: {
        amount: '211.15',
        currency: 'TZS'
      },
      transactionType: {
        scenario: 'TRANSFER',
        initiator: 'PAYER',
        initiatorType: 'CONSUMER'
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
    }

    const ilpData = Buffer.from(base64url(JSON.stringify(transactionObject)))
    const decimalPlaces = 2
    const packetInput = {
      amount: `${Number(TRANSACTION.amount) * Math.pow(10, decimalPlaces)}`, // unsigned 64bit integer as a string
      account: `g.${TRANSACTION.payer.fspId}.${TRANSACTION.payer.partyIdInfo.partyIdType.toLowerCase()}.${TRANSACTION.payer.partyIdInfo.partyIdentifier.toLowerCase()}`, // ilp address
      data: ilpData // base64url encoded attached data
    }
    const packet = ilpPacket.serializeIlpPayment(packetInput)

    const base64encodedIlpPacket = base64url.fromBase64(packet.toString('base64')).replace('"', '')

    // const jsonPacket2 = await ilpPacket.deserializeIlpPayment(Buffer.from(base64encodedIlpPacket, 'base64'))

    await Db.transferDuplicateCheck.insert({
      transferId: transactionId,
      hash: 'someHash'
    })
    await Db.transfer.insert({
      transferId: transactionId,
      amount: TRANSACTION.amount.amount,
      currencyId: TRANSACTION.amount.currency,
      ilpCondition: 'testCondition',
      expirationDate: '2020-06-30 17:10:51'
    })
    await Db.ilpPacket.insert({
      transferId: transactionId,
      value: base64encodedIlpPacket
    })
    await Db.transferStateChange.insert({
      transferId: transactionId,
      transferStateId: 'COMMITTED'
    })
    const knex = await Db.getKnex()
    const transferStateChangeId = await knex('transferStateChange')
      .select('transferStateChangeId')
      .where('transferId', transactionId)
      .andWhere('transferStateId', 'COMMITTED')
    const previousParticipantPositionRecords = await knex('participantPosition')
      .select('participantPositionId', 'value', 'reservedValue')
      .where('participantCurrencyId', 14)
      .orWhere('participantCurrencyId', 13)

    await Kafka.produceGeneralMessage(
      Config.KAFKA_CONFIG,
      KafkaProducer,
      Enum.Events.Event.Type.NOTIFICATION,
      Enum.Events.Event.Action.COMMIT,
      message.value,
      Enum.Events.EventStatus.SUCCESS,
      'fsp511290656'
    )

    // wait timeout for processing the records
    await timeout(7000)

    const transferParticipantRecords = await knex('transferParticipant')
      .where('transferId', transactionId)

    expect(transferParticipantRecords)
      .excluding(['transferParticipantId', 'createdDate'])
      .to.deep.members([
        {
          transferId: transactionId,
          participantCurrencyId: 13,
          transferParticipantRoleTypeId: 1,
          ledgerEntryTypeId: 2,
          amount: 1.27
        },
        {
          transferId: transactionId,
          participantCurrencyId: 14,
          transferParticipantRoleTypeId: 2,
          ledgerEntryTypeId: 2,
          amount: -1.27
        }])
    const newParticipantPositionRecords = await knex('participantPosition')
      .select('participantPositionId', 'value', 'reservedValue')
      .where('participantCurrencyId', 14)
      .orWhere('participantCurrencyId', 13)
    expect(newParticipantPositionRecords[0].value).to.equal(previousParticipantPositionRecords[0].value + 1.27)
    expect(newParticipantPositionRecords[1].value).to.equal(previousParticipantPositionRecords[1].value - 1.27)

    const participantPositionChangeRecords = await knex('participantPositionChange')
      .where('transferStateChangeId', transferStateChangeId[0].transferStateChangeId)
    expect(participantPositionChangeRecords[0].value.toFixed(decimalPlaces)).to.equal(newParticipantPositionRecords[0].value.toFixed(decimalPlaces))
    expect(participantPositionChangeRecords[1].value.toFixed(decimalPlaces)).to.equal(newParticipantPositionRecords[1].value.toFixed(decimalPlaces))
  }, 30000)
})
