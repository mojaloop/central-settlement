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

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-logger')
const MLNumber = require('@mojaloop/ml-number')
const SettlementTransferData = require('./settlementTransferData')
const Models = require('../helpers/models')
const Config = require('../../../src/lib/config')
const Db = require('../../../src/lib/db')
const CLDb = require('@mojaloop/central-ledger/src/lib/db')
const SettlementWindowService = require('../../../src/domain/settlementWindow')
const SettlementService = require('../../../src/domain/settlement')
const Enums = require('../../../src/models/lib/enums')
const SettlementWindowStateChangeModel = require('../../../src/models/settlementWindow/settlementWindowStateChange')
const SettlementModel = require('../../../src/models/settlement/settlement')
const SettlementStateChangeModel = require('../../../src/models/settlement/settlementStateChange')
const SettlementParticipantCurrencyModel = require('../../../src/models/settlement/settlementParticipantCurrency')
const TransferStateChangeModel = require('@mojaloop/central-ledger/src/models/transfer/transferStateChange')
const ParticipantPositionModel = require('@mojaloop/central-ledger/src/models/position/participantPosition')
const Producer = require('../../../src/lib/kafka/producer')
const StreamProducer = require('@mojaloop/central-services-stream').Util.Producer
const TransferModel = require('@mojaloop/central-ledger/src/models/transfer/transfer')

// require('leaked-handles').set({ fullStack: true, timeout: 5000, debugSockets: true })

const currency = 'EUR' // FOR THE SAKE OF PARTICIPANT FILTER ONLY TO BE ABLE TO RUN OUR TESTS
let netSettlementSenderId
let netSenderAccountId
let netSettlementRecipientId
let netRecipientAccountId
let netSettlementAmount
let netSenderSettlementTransferId
let netRecipientSettlementTransferId

const settlementModels = [
  {
    name: 'DEFERREDNETTZS',
    settlementGranularityId: 2, // NET
    settlementInterchangeId: 2, // MULTILATERAL
    settlementDelayId: 2, // DEFERRED
    ledgerAccountTypeId: 1, // POSITION
    autoPositionReset: true,
    currencyId: 'TZS'
  },
  {
    name: 'DEFERREDNETUSD',
    settlementGranularityId: 2, // NET
    settlementInterchangeId: 2, // MULTILATERAL
    settlementDelayId: 2, // DEFERRED
    ledgerAccountTypeId: 1, // POSITION
    autoPositionReset: true,
    currencyId: 'USD'
  },
  {
    name: 'DEFAULTDEFERREDNET',
    settlementGranularityId: 2, // NET
    settlementInterchangeId: 2, // MULTILATERAL
    settlementDelayId: 2, // DEFERRED
    ledgerAccountTypeId: 1, // POSITION
    autoPositionReset: true
  }
]

const getEnums = async () => {
  return {
    ledgerAccountTypes: await Enums.ledgerAccountTypes(),
    ledgerEntryTypes: await Enums.ledgerEntryTypes(),
    participantLimitTypes: await Enums.participantLimitTypes(),
    settlementDelay: await Enums.settlementDelay(),
    settlementGranularity: await Enums.settlementGranularity(),
    settlementInterchange: await Enums.settlementInterchange(),
    settlementStates: await Enums.settlementStates(),
    settlementWindowStates: await Enums.settlementWindowStates(),
    transferParticipantRoleTypes: await Enums.transferParticipantRoleTypes(),
    transferStates: await Enums.transferStates()
  }
}

Test('SettlementTransfer should', async settlementTransferTest => {
  await Db.connect(Config.DATABASE)
  await CLDb.connect(Config.DATABASE)
  await SettlementTransferData.init()
  const enums = await getEnums()
  let settlementWindowId
  let settlementData

  let sandbox
  settlementTransferTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })
  settlementTransferTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })


  settlementTransferTest.end()
})
