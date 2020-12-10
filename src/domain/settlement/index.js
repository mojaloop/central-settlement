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
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 - Miguel de Barros <miguel.debarros@modusbox.com>
 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 - Valentin Genev <valentin.genev@modusbox.com>

 --------------
 ******/
'use strict'

const arrayDiff = require('lodash').difference
const SettlementModel = require('../../models/settlement')
const SettlementModelModel = require('../../models/settlement/settlementModel')
const SettlementWindowContentModel = require('../../models/settlementWindowContent')
const SettlementWindowModel = require('../../models/settlementWindow')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

const prepareParticipantsResult = (participantCurrenciesList) => {
  const participantAccounts = {}
  for (const account of participantCurrenciesList) {
    const { id } = account
    const formattedAccount = {
      id: account.participantCurrencyId,
      state: account.state,
      reason: account.reason,
      netSettlementAmount: {
        amount: account.netAmount,
        currency: account.currency
      }
    }
    if (id in participantAccounts) {
      const accountList = participantAccounts[id].accounts
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
}

const groupSettlementWindowContentBySettlementWindow = (records) => {
  const settlementWindows = {}
  for (const record of records) {
    const id = record.settlementWindowId
    delete record.settlementWindowId
    if (id in settlementWindows) {
      settlementWindows[id].push(record)
    } else {
      settlementWindows[id] = [record]
    }
  }
  return settlementWindows
}

module.exports = {
  getById: async function ({ settlementId }, enums) {
    const settlement = await SettlementModel.getById({ settlementId }, enums)
    if (settlement) {
      const settlementWindowsList = await SettlementWindowModel.getBySettlementId({ settlementId }, enums)
      const participantCurrenciesList = await SettlementModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId({ settlementId }, enums)
      const participants = prepareParticipantsResult(participantCurrenciesList)

      // Build settlement window content array and insert into settlement window list object
      const windowContentRecords = []
      let windowContentResponseData = {}

      for (const key of Object.keys(settlementWindowsList)) {
        const windowContentRecord = await SettlementWindowContentModel.getBySettlementAndWindowId(settlementId, settlementWindowsList[key].id)
        windowContentResponseData = {
          id: windowContentRecord[key].id,
          state: windowContentRecord[key].state,
          ledgerAccountType: windowContentRecord[key].ledgerAccountType,
          currencyId: windowContentRecord[key].currencyId,
          createdDate: windowContentRecord[key].createdDate,
          changedDate: windowContentRecord[key].changedDate
        }
        windowContentRecords.push(windowContentResponseData)
        settlementWindowsList[key].content = windowContentRecords
      }

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
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Settlement not found')
    }
  },

  putById: SettlementModel.putById,
  abortById: SettlementModel.abortById,

  getSettlementsByParams: async function (params, enums) {
    // 7 filters - at least one should be used
    Object.keys(params.query).forEach(key => params.query[key] === undefined && delete params.query[key])
    if (Object.keys(params.query).length && Object.keys(params.query).length < 10) {
      const settlements = {}
      let settlement
      let participant
      const settlementsData = await SettlementModel.getByParams(params.query, enums)
      if (settlementsData && settlementsData.length > 0) {
        for (const s of settlementsData) {
          if (!settlements[s.settlementId]) {
            const settlementId = s.settlementId
            const settlementWindowsList = await SettlementWindowModel.getBySettlementId({ settlementId })
            for (const key of Object.keys(settlementWindowsList)) {
              settlementWindowsList[key].content = await SettlementWindowContentModel.getBySettlementAndWindowId(s.settlementId, settlementWindowsList[key].id)
            }
            settlements[s.settlementId] = {
              id: s.settlementId,
              state: s.settlementStateId,
              reason: s.settlementWindowReason,
              createdDate: s.createdDate,
              changedDate: s.changedDate,
              settlementWindows: settlementWindowsList
            }
          }
          settlement = settlements[s.settlementId]
          if (!settlement.settlementWindows) {
            settlement.settlementWindows = {}
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
        const result = Object.keys(settlements).map((i) => {
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
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Settlements not found')
      }
    } else {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Use at least one parameter: state, fromDateTime, toDateTime, currency, settlementWindowId, fromSettlementWindowDateTime, toSettlementWindowDateTime, participantId, accountId')
    }
  },

  settlementEventTrigger: async function (params, enums) {
    // validate settlement model
    const { settlementModel, reason, settlementWindows } = params
    const settlementModelData = await SettlementModelModel.getByName(settlementModel)
    if (!settlementModelData) {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Settlement model not found')
    } else if (settlementModelData.settlementGranularityId === enums.settlementGranularity.GROSS ||
      settlementModelData.settlementDelayId === enums.settlementDelay.IMMEDIATE) {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Settlement can not be created for GROSS or IMMEDIATE models')
    }

    // validate windows content
    const idList = settlementWindows.map(v => v.id)
    const applicableWindows = await SettlementWindowModel.getByListOfIds(idList, settlementModelData, enums.settlementWindowStates)
    const applicableIdList = applicableWindows.map(v => v.settlementWindowId)
    const nonApplicableIdList = arrayDiff(idList, applicableIdList)
    if (nonApplicableIdList.length) {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, `Inapplicable windows ${nonApplicableIdList.join(', ')}`)
    }

    // settlement event trigger
    const settlementId = await SettlementModel.triggerSettlementEvent({ idList, reason }, settlementModelData, enums)

    // retrieve resulting data for response
    const settlement = await SettlementModel.getById({ settlementId })
    const settlementWindowsList = await SettlementWindowModel.getBySettlementId({ settlementId })
    const settlementWindowContentAll = await SettlementWindowContentModel.getBySettlementId(settlementId)
    const settlementWindowsContent = groupSettlementWindowContentBySettlementWindow(settlementWindowContentAll)
    const settlementWindowsWithContent = settlementWindowsList.map(record => {
      record.content = settlementWindowsContent[record.id]
      return record
    })
    const participantCurrenciesList = await SettlementModel.settlementParticipantCurrency.getParticipantCurrencyBySettlementId({ settlementId })
    const participants = prepareParticipantsResult(participantCurrenciesList)
    return {
      id: settlement.settlementId,
      settlementModel,
      state: settlement.state,
      reason: settlement.reason,
      createdDate: settlement.createdDate,
      changedDate: settlement.changedDate,
      settlementWindows: settlementWindowsWithContent,
      participants
    }
  },

  getByIdParticipantAccount: async function ({ settlementId, participantId, accountId = null }, enums) {
    let participantFoundInSettlement = false
    const accountProvided = accountId > 0
    let participantAndAccountMatched = !accountProvided
    let accountFoundInSettlement = !accountProvided

    const settlement = await SettlementModel.getById({ settlementId }, enums) // 3
    const settlementFound = !!settlement

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
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Settlement not found')
      } else if (!participantFoundInSettlement) {
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Participant not in settlement')
      } else if (!participantAndAccountMatched) {
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Provided account does not match any participant position account')
      } else { // else if (!accountFoundInSettlement) { // else if changed to else for achieving 100% branch coverage (else path not taken)
        throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Account not in settlement')
      }
    }

    return {
      id: settlement.settlementId,
      state: settlement.state,
      settlementWindows,
      participants
    }
  }
}
