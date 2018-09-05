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
 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

'use strict'

const settlementsModel = require('../../models/settlement/index')
const centralLogger = require('@mojaloop/central-services-shared').Logger
const settlementWindowModel = require('../../models/settlementWindow')

const prepareParticipantsResult = function (participantCurrenciesList) {
  try {
    let participantAccounts = {}
    for (let account of participantCurrenciesList) {
      let {id} = account
      let formattedAccount = {
        id: account.id,
        state: account.state,
        reason: account.reason,
        netSettlementAmount: {
          amount: account.netAmount,
          currency: account.currency
        }
      }
      if (id in participantAccounts) {
        let accountList = participantAccounts.accounts
        accountList.push(formattedAccount)
        participantAccounts[id] = {
          id: id,
          accounts: accountList
        }
      } else {
        participantAccounts[id] = {
          id: id,
          accounts: [formattedAccount]
        }
      }
    }
    return Array.from(Object.keys(participantAccounts).map(participantId => participantAccounts[participantId]))
  } catch (e) {
    console.log(e)
    throw e
  }
}
// "id": accountData.participantCurrencyId,
// "state": "PENDING_SETTLEMENT",
// "reason": payload.reason,
// "netSettlementAmount": {
//     "amount": accountData.netAmount,
//     "currency": accountData.currencyId
// }
module.exports = {
  getById: async function ({settlementId}, enums, options = {}) {
    let Logger = options.logger || centralLogger
    try {
      let settlement = await settlementsModel.getById({settlementId}, enums)
      if (settlement) {
        let settlementWindowsList = await settlementWindowModel.getBySettlementId({settlementId}, enums)
        let participantCurrenciesList = await settlementsModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId({settlementId}, enums)
        let participants = prepareParticipantsResult(participantCurrenciesList)
        return {
          id: settlement.settlementId,
          state: settlement.state,
          settlementWindows: settlementWindowsList,
          participants
        }
      } else {
        let err = new Error('2001 TODO Settlement not found')
        Logger('error', err)
        throw err
      }
    } catch (err) {
      Logger('error', err)
      throw err
    }
  },

  putById: settlementsModel.putById,

  getSettlementsByParams: async function (params, enums, options = {}) {
    // 7 filters - at least one should be used
    let Logger = options.logger || centralLogger
    Object.keys(params.query).forEach(key => params.query[key] === undefined && delete params.query[key])
    if (Object.keys(params.query).length && Object.keys(params.query).length < 10) {
      try {
        let settlements = {}
        let settlement
        let participant
        let settlementsData = await settlementsModel.getByParams(params.query, enums)
        if (settlementsData && settlementsData.length > 0) {
          for (let s of settlementsData) {
            if (!settlements[s.settlementId]) {
              settlements[s.settlementId] = {
                id: s.settlementId,
                state: s.settlementStateId
              }
            }
            settlement = settlements[s.settlementId]
            if (!settlement.settlementWindows) {
              settlement.settlementWindows = {}
            }
            if (!settlement.settlementWindows[s.settlementWindowId]) {
              settlement.settlementWindows[s.settlementWindowId] = {
                id: s.settlementWindowId,
                state: s.settlementWindowStateId,
                reason: s.settlementWindowReason,
                createdDate: s.createdDate,
                changedDate: s.changedDate
              }
            }
            if (!settlement.participants) {
              settlement.participants = {}
            }
            if (!settlement.participants[s.participantId]) {
              settlement.participants[s.participantId] = {
                id: s.participantId
              }
            }
            participant = settlement.participants[s.participantId]
            if (!participant.accounts) {
              participant.accounts = {}
            }
            participant.accounts[s.participantCurrencyId] = {
              id: s.participantCurrencyId,
              state: s.accountState,
              reason: s.accountReason,
              netSettlementAmount: {
                amount: s.accountAmount,
                currency: s.accountCurrency
              }
            }
          }
          // transform settlements map to result array
          let result = Object.keys(settlements).map((i) => {
            let settlementWindows = settlements[i].settlementWindows
            settlementWindows = Object.keys(settlementWindows).map((j) => {
              return settlementWindows[j]
            })
            settlements[i].settlementWindows = settlementWindows
            let participants = settlements[i].participants
            participants = Object.keys(participants).map((j) => {
              let accounts = participants[j].accounts
              accounts = Object.keys(accounts).map((k) => {
                return accounts[k]
              })
              participants[j].accounts = accounts
              return participants[j]
            })
            settlements[i].participants = participants
            return settlements[i]
          })
          return result
        } else {
          let err = new Error('Settlements not found')
          Logger('error', err)
          throw err
        }
      } catch (err) {
        Logger('error', err)
        throw err
      }
    } else {
      let err = new Error('Use at least one parameter: state, fromDateTime, toDateTime, currency, settlementWindowId, fromSettlementWindowDateTime, toSettlementWindowDateTime, participantId, accountId')
      Logger('error', err)
      throw err
    }
  },

  settlementEventTrigger: async function (params, enums, options = {}) {
    let settlementWindowsIdList = params.settlementWindows
    let reason = params.reason
    let Logger = options.logger || centralLogger
    try {
      let idList = settlementWindowsIdList.map(v => v.id)
      // validate windows state
      const settlementWindows = await settlementWindowModel.getByListOfIds(idList, enums.settlementWindowStates)
      if ((!settlementWindows.length) && (settlementWindows.length !== idList.length)) {
        let err = new Error('2001')
        throw err
      }

      for (let settlementWindow of settlementWindows) {
        let {state} = settlementWindow
        if (state !== enums.settlementWindowStates.CLOSED) {
          let err = new Error('2001')
          throw err
        }
      }
      let settlementId = await settlementsModel.triggerEvent({idList, reason}, enums)
      let settlement = await settlementsModel.getById({settlementId})
      let settlementWindowsList = await settlementWindowModel.getBySettlementId({settlementId})
      let participantCurrenciesList = await settlementsModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId({settlementId})
      let participants = prepareParticipantsResult(participantCurrenciesList)
      return {
        id: settlement.settlementId,
        state: settlement.state,
        settlementWindows: settlementWindowsList,
        participants
      }
    } catch (err) {
      Logger('error', err)
      throw err
    }
  },

  getByIdParticipantAccount: async function ({settlementId, participantId, accountId = null}, enums, options = {}) {
    let Logger = options.logger || centralLogger
    try {
      let settlement = await settlementsModel.getById({settlementId}, enums) // 3
      let settlementParticipantCurrencyIdList = await settlementsModel.settlementParticipantCurrency.getAccountsInSettlementByIds({
        settlementId,
        participantId
      }, enums) // 6
      let settlementWindows
      let accounts
      let participants
      if (accountId) {
        let participantAndAccountMatched = await settlementsModel.checkParticipantAccountExists({
          participantId,
          accountId
        }, enums) // 9
        let settlementParticipantCurrencyId
        if (participantAndAccountMatched) {
          settlementParticipantCurrencyId = await settlementsModel.getAccountInSettlement({
            settlementId,
            accountId
          }, enums) // 12
          if (settlementParticipantCurrencyId) {
            settlementWindows = await settlementsModel.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId({
              settlementId,
              accountId
            }, enums)
            accounts = await settlementsModel.settlementParticipantCurrency.getAccountById({settlementParticipantCurrencyId}, enums)
            participants = prepareParticipantsResult(accounts)
          } else {
            throw new Error('TODO')
          }
        } else {
          throw new Error('TODO')
        }
      } else {
        settlementWindows = await settlementsModel.settlementSettlementWindow.getWindowsBySettlementIdAndParticipantId({
          settlementId,
          participantId
        }, enums)
        accounts = await settlementsModel.settlementParticipantCurrency.getAccountsByListOfIds(settlementParticipantCurrencyIdList, enums)
        participants = prepareParticipantsResult(accounts)
      }
      return {
        id: settlement.settlementId,
        state: settlement.state,
        settlementWindows,
        participants
      }
    } catch (err) {
      Logger('error', err)
      throw err
    }
  }
}
