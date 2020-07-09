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
 - Lazola Lucas <lazola.lucas@modusbox.com>
 --------------
 ******/
const fs = require('fs')
const scriptEngine = require('../../lib/scriptEngine')
const vm = require('vm')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const TransferSettlementModel = require('../../models/transferSettlement')

module.exports = {
  processMsgFulfil: async function (transferEventId, transferEventStateStatus, ledgerEntries) {
    try {
      await TransferSettlementModel.updateStateChange(transferEventId, transferEventStateStatus, ledgerEntries)
      return true
    } catch (err) {
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  },
  /* istanbul ignore next */
  processScriptEngine: async function (payload) {
    /* istanbul ignore next */
    try {
      let data
      try {
        data = fs.readFileSync('scripts/interchangeFeeCalculation.js', 'utf8')
      } catch (err) {
        throw ErrorHandler.Factory.reformatFSPIOPError(err)
      }
      const script = new vm.Script(data)
      const result = await scriptEngine.execute(script, payload)
      return result
    } catch (err) {
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }
}
