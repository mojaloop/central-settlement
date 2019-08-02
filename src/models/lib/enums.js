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
 --------------
 ******/

'use strict'

const Db = require('../../lib/db')

module.exports = {
  headers: {
    FSPIOP: {
      SWITCH: 'central-switch'
    }
  },

  settlementWindowStates: async function () {
    const settlementWindowStateEnum = {}
    const settlementWindowStateEnumsList = await Db.settlementWindowState.find({})
    if (settlementWindowStateEnumsList) {
      for (const state of settlementWindowStateEnumsList) {
        settlementWindowStateEnum[`${state.enumeration}`] = state.settlementWindowStateId
      }
      return settlementWindowStateEnum
    }
  },
  settlementStates: async function () {
    const settlementStateEnum = {}

    const settlementStateEnumsList = await Db.settlementState.find({})
    if (settlementStateEnumsList) {
      for (const state of settlementStateEnumsList) {
        settlementStateEnum[`${state.enumeration}`] = state.settlementStateId
      }
      return settlementStateEnum
    }
  },
  transferStates: async function () {
    const transferStateEnum = {}
    const transferStateEnumsList = await Db.transferState.find({})
    if (transferStateEnumsList) {
      for (const state of transferStateEnumsList) {
        transferStateEnum[`${state.transferStateId}`] = state.transferStateId
      }
      return transferStateEnum
    }
  },
  transferStateEnums: async function () {
    const transferStateEnum = {}
    const transferStateEnumsList = await Db.transferState.find({})
    if (transferStateEnumsList) {
      for (const state of transferStateEnumsList) {
        // apply distinct even though final result would contain distinct values
        if (!transferStateEnum[`${state.enumeration}`]) {
          transferStateEnum[`${state.enumeration}`] = state.enumeration
        }
      }
      return transferStateEnum
    }
  },
  ledgerAccountTypes: async function () {
    const ledgerAccountTypeEnum = {}
    const ledgerAccountTypeEnumsList = await Db.ledgerAccountType.find({})
    if (ledgerAccountTypeEnumsList) {
      for (const state of ledgerAccountTypeEnumsList) {
        ledgerAccountTypeEnum[`${state.name}`] = state.ledgerAccountTypeId
      }
      return ledgerAccountTypeEnum
    }
  },
  ledgerEntryTypes: async function () {
    const ledgerEntryTypeEnum = {}
    const ledgerEntryTypeEnumsList = await Db.ledgerEntryType.find({})
    if (ledgerEntryTypeEnumsList) {
      for (const state of ledgerEntryTypeEnumsList) {
        ledgerEntryTypeEnum[`${state.name}`] = state.ledgerEntryTypeId
      }
      return ledgerEntryTypeEnum
    }
  },
  transferParticipantRoleTypes: async function () {
    const transferParticipantRoleTypeEnum = {}
    const transferParticipantRoleTypeEnumsList = await Db.transferParticipantRoleType.find({})
    if (transferParticipantRoleTypeEnumsList) {
      for (const state of transferParticipantRoleTypeEnumsList) {
        transferParticipantRoleTypeEnum[`${state.name}`] = state.transferParticipantRoleTypeId
      }
      return transferParticipantRoleTypeEnum
    }
  },
  participantLimitTypes: async function () {
    const participantLimitTypeEnum = {}
    const participantLimitTypeEnumsList = await Db.participantLimitType.find({})
    if (participantLimitTypeEnumsList) {
      for (const state of participantLimitTypeEnumsList) {
        participantLimitTypeEnum[`${state.name}`] = state.participantLimitTypeId
      }
      return participantLimitTypeEnum
    }
  }
}
