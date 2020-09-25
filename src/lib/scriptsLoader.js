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

 * Claudio Viola <claudio.viola@modusbox.com>
 * Lazola Lucas <lazola.lucas@modusbox.com>

 --------------
 ******/

'use strict'
const _ = require('lodash')
const fs = require('fs')
const vm = require('vm')
const path = require('path')
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const scriptEngine = require('./scriptEngine')

function loadScripts (scriptDirectory) {
  const scriptsMap = {}
  const scriptDirectoryPath = path.join(process.cwd(), scriptDirectory)
  let scriptFiles
  try {
    scriptFiles = fs.readdirSync(scriptDirectoryPath)
    scriptFiles = scriptFiles.filter(fileName => {
      return fs.statSync(path.join(scriptDirectoryPath, fileName)).isFile()
    })
  } catch (err) {
    Logger.error(`Error loading scripts from : ${scriptDirectoryPath}, ${err}`)
    return scriptsMap
  }
  for (const scriptFile of scriptFiles) {
    const scriptSource = fs.readFileSync(fs.realpathSync(scriptDirectoryPath + '/' + scriptFile), 'utf8')
    const scriptLines = scriptSource.split(/\r?\n/)
    retrieveScriptConfiguration(scriptLines, scriptsMap, scriptFile, scriptSource)
  }
  return scriptsMap
}

/**
 * [executeScripts Execute a script from the scriptsmap given a scriptType, scriptAction and scriptStatus providing the payload as argument]
 * @param  {[type]}  scriptsMap   [The object containing all loaded scripts]
 * @param  {[String]}  scriptType [The topic type of the script to run]
 * @param  {[type]}  scriptAction [The topic action of the script to run]
 * @param  {[type]}  scriptStatus [The Topic status of the script to run]
 * @param  {[type]}  payload      [description]
 * @return {Promise}              [description]
 */
async function executeScripts (scriptsMap, scriptType, scriptAction, scriptStatus, payload) {
  try {
    const scriptResults = {}
    if (scriptsMap[scriptType] && scriptsMap[scriptType][scriptAction] && scriptsMap[scriptType][scriptAction][scriptStatus]) {
      const now = new Date()
      for (const script of scriptsMap[scriptType][scriptAction][scriptStatus]) {
        if (now.getTime() >= script.startTime.getTime() && now.getTime() <= script.endTime.getTime()) {
          Logger.debug(`Running script: ${JSON.stringify(script)}`)
          const scriptResult = await executeScript(script.script, payload)
          Logger.debug(`Merging script result: ${scriptResult}`)
          _.mergeWith(scriptResults, scriptResult, (objValue, srcValue) => {
            if (_.isArray(objValue)) {
              return objValue.concat(srcValue)
            }
          })
        }
      }
    }
    return scriptResults
  } catch (err) {
    Logger.error(err)
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Script execution was unsuccessful')
  }
}

async function executeScript (script, payload) {
  try {
    return await scriptEngine.execute(script, payload)
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

function retrieveScriptConfiguration (scriptLines, scriptsMap, scriptFile, scriptSource) {
  for (let i = 0; i < scriptLines.length; i++) {
    if (scriptLines[i].startsWith('// Type:')) {
      const scriptType = scriptLines[i].split(':').pop().trim()
      const scriptAction = scriptLines[i + 1].split(':').pop().trim()
      const scriptStatus = scriptLines[i + 2].split(':').pop().trim()
      const scriptStart = scriptLines[i + 3].substring(scriptLines[i + 3].indexOf(':') + 1).trim()
      const scriptEnd = scriptLines[i + 4].substring(scriptLines[i + 4].indexOf(':') + 1).trim()
      const script = {
        filename: scriptFile,
        startTime: new Date(scriptStart),
        endTime: new Date(scriptEnd),
        script: new vm.Script(scriptSource)
      }
      const scriptMap = {}
      scriptMap[scriptType] = {}
      scriptMap[scriptType][scriptAction] = {}
      scriptMap[scriptType][scriptAction][scriptStatus] = [script]
      Logger.info(`Loading script: ${scriptFile}: ${JSON.stringify(script)}`)
      _.mergeWith(scriptsMap, scriptMap, (objValue, srcValue) => {
        if (_.isArray(objValue)) {
          return objValue.concat(srcValue)
        }
      })
      break
    }
  }
}

module.exports = {
  executeScripts,
  loadScripts
}
