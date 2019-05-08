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

const SettlementModel = require('../../models/settlement')
const SettlementWindowModel = require('../../models/settlementWindow')

const prepareParticipantsResult = function (participantCurrenciesList) {
  try {
    let participantAccounts = {}
    for (let account of participantCurrenciesList) {
      let { id } = account
      let formattedAccount = {
        id: account.participantCurrencyId,
        state: account.state,
        reason: account.reason,
        netSettlementAmount: {
          amount: account.netAmount,
          currency: account.currency
        }
      }
      if (id in participantAccounts) {
        let accountList = participantAccounts[id].accounts
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
    throw e
  }
}

module.exports = {
  getById: async function ({ settlementId }, enums) {
    try {
      let settlement = await SettlementModel.getById({ settlementId }, enums)
      if (settlement) {
        let settlementWindowsList = await SettlementWindowModel.getBySettlementId({ settlementId }, enums)
        let participantCurrenciesList = await SettlementModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId({ settlementId }, enums)
        let participants = prepareParticipantsResult(participantCurrenciesList)
        return {
          id: settlement.settlementId,
          state: settlement.state,
          reason: settlement.reason,
          createdDate: settlement.createdDate,
          changedDate: settlement.changedDate,
          settlementWindows: settlementWindowsList,
          participants
        }
      } else {
        let err = new Error('2001 TODO Settlement not found')
        throw err
      }
    } catch (err) {
      throw err
    }
  },

  putById: SettlementModel.putById,
  abortById: SettlementModel.abortById,

  getSettlementsByParams: async function (params, enums) {
    // 7 filters - at least one should be used
    Object.keys(params.query).forEach(key => params.query[key] === undefined && delete params.query[key])
    if (Object.keys(params.query).length && Object.keys(params.query).length < 10) {
      try {
        let settlements = {}
        let settlement
        let participant
        let settlementsData = await SettlementModel.getByParams(params.query, enums)
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
          throw err
        }
      } catch (err) {
        throw err
      }
    } else {
      let err = new Error('Use at least one parameter: state, fromDateTime, toDateTime, currency, settlementWindowId, fromSettlementWindowDateTime, toSettlementWindowDateTime, participantId, accountId')
      throw err
    }
  },

  settlementEventTrigger: async function (params, enums) {
    let settlementWindowsIdList = params.settlementWindows
    let reason = params.reason
    try {
      let idList = settlementWindowsIdList.map(v => v.id)
      // validate windows state
      const settlementWindows = await SettlementWindowModel.getByListOfIds(idList, enums.settlementWindowStates)
      if (settlementWindows && settlementWindows.length !== idList.length) {
        let err = new Error('At least one settlement window does not exist')
        throw err
      }

      for (let settlementWindow of settlementWindows) {
        let { state } = settlementWindow
        if (state !== enums.settlementWindowStates.CLOSED &&
            state !== enums.settlementWindowStates.ABORTED) {
          let err = new Error('At least one settlement window is not in CLOSED or ABORTED state')
          throw err
        }
      }
      let settlementId = await SettlementModel.triggerEvent({ idList, reason }, enums)
      let settlement = await SettlementModel.getById({ settlementId })
      let settlementWindowsList = await SettlementWindowModel.getBySettlementId({ settlementId })
      let participantCurrenciesList = await SettlementModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId({ settlementId })
      let participants = prepareParticipantsResult(participantCurrenciesList)
      return {
        id: settlement.settlementId,
        state: settlement.state,
        reason: settlement.reason,
        createdDate: settlement.createdDate,
        changedDate: settlement.changedDate,
        settlementWindows: settlementWindowsList,
        participants
      }
    } catch (err) {
      throw err
    }
  },

  getByIdParticipantAccount: async function ({ settlementId, participantId, accountId = null }, enums) {
    try {
      let participantFoundInSettlement = false
      let accountProvided = accountId > 0
      let participantAndAccountMatched = !accountProvided
      let accountFoundInSettlement = !accountProvided

      let settlement = await SettlementModel.getById({ settlementId }, enums) // 3
      let settlementFound = !!settlement

      let settlementParticipantCurrencyIdList, account, settlementAccount

      if (settlementFound) {
        settlementParticipantCurrencyIdList = await SettlementModel.settlementParticipantCurrency.getAccountsInSettlementByIds({
          settlementId,
          participantId
        }, enums) // 6
        participantFoundInSettlement = settlementParticipantCurrencyIdList.length > 0

        if (participantFoundInSettlement && accountProvided) {
          account = await SettlementModel.checkParticipantAccountExists({
            participantId,
            accountId
          }, enums) // 9
          participantAndAccountMatched = !!account

          if (participantAndAccountMatched) {
            settlementAccount = await SettlementModel.getAccountInSettlement({
              settlementId,
              accountId
            }, enums) // 12
            accountFoundInSettlement = !!settlementAccount
          }
        }
      }

      let settlementWindows
      let accounts
      let participants
      if (settlementFound && participantFoundInSettlement && participantAndAccountMatched && accountFoundInSettlement) {
        if (accountProvided) { // 16
          settlementWindows = await SettlementModel.settlementSettlementWindow.getWindowsBySettlementIdAndAccountId({
            settlementId,
            accountId
          }, enums)
          accounts = await SettlementModel.settlementParticipantCurrency.getSettlementAccountById(settlementAccount.settlementParticipantCurrencyId, enums)
          participants = prepareParticipantsResult(accounts)
        } else {
          settlementWindows = await SettlementModel.settlementSettlementWindow.getWindowsBySettlementIdAndParticipantId({
            settlementId,
            participantId
          }, enums)
          const ids = settlementParticipantCurrencyIdList.map(record => record.settlementParticipantCurrencyId)
          accounts = await SettlementModel.settlementParticipantCurrency.getSettlementAccountsByListOfIds(ids, enums)
          participants = prepareParticipantsResult(accounts)
        }
      } else {
        if (!settlementFound) {
          throw new Error('Settlement not found')
        } else if (!participantFoundInSettlement) {
          throw new Error('Participant not in settlement')
        } else if (!participantAndAccountMatched) {
          throw new Error('Provided account does not match any participant position account')
        } else { // else if (!accountFoundInSettlement) { // else if changed to else for achieving 100% branch coverage (else path not taken)
          throw new Error('Account not in settlement')
        }
      }

      return {
        id: settlement.settlementId,
        state: settlement.state,
        settlementWindows,
        participants
      }
    } catch (err) {
      throw err
    }
  }
}
