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

 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 --------------
 ******/

'use strict'

const Db = require('../index')

module.exports = {
  settlementWindowStates: async function () {
    try {
      let settlementWindowStateEnum = {}
      let settlementWindowStateEnumsList = await Db.settlementWindowState.find({})
      if (settlementWindowStateEnumsList) {
        for (let state of settlementWindowStateEnumsList) {
          settlementWindowStateEnum[`${state.enumeration}`] = state.settlementWindowStateId
        }
        return settlementWindowStateEnum
      }
    } catch (err) {
      throw err
    }
  },
  settlementStates: async function () {
    try {
      let settlementStateEnum = {}

      let settlementStateEnumsList = await Db.settlementState.find({})
      if (settlementStateEnumsList) {
        for (let state of settlementStateEnumsList) {
          settlementStateEnum[`${state.enumeration}`] = state.settlementStateId
        }
        return settlementStateEnum
      }
    } catch (err) {
      throw err
    }
  },
  transferStates: async function () {
    try {
      let transferStateEnum = {}
      let transferStateEnumsList = await Db.transferState.find({})
      if (transferStateEnumsList) {
        for (let state of transferStateEnumsList) {
          transferStateEnum[`${state.enumeration}`] = state.transferStateId
        }
        return transferStateEnum
      }
    } catch (err) {
      throw err
    }
  },
  ledgerEntryTypes: async function () {
    try {
      let ledgerEntryTypeEnum = {}
      let ledgerEntryTypeEnumsList = await Db.ledgerEntryType.find({})
      if (ledgerEntryTypeEnumsList) {
        for (let state of ledgerEntryTypeEnumsList) {
          ledgerEntryTypeEnum[`${state.name}`] = state.ledgerEntryTypeId
        }
        return ledgerEntryTypeEnum
      }
    } catch (err) {
      throw err
    }
  },
  transferParticipantRoleTypes: async function () {
    try {
      let transferParticipantRoleTypeEnum = {}
      let transferParticipantRoleTypeEnumsList = await Db.transferParticipantRoleType.find({})
      if (transferParticipantRoleTypeEnumsList) {
        for (let state of transferParticipantRoleTypeEnumsList) {
          transferParticipantRoleTypeEnum[`${state.name}`] = state.transferParticipantRoleTypeId
        }
        return transferParticipantRoleTypeEnum
      }
    } catch (err) {
      throw err
    }
  }
}
