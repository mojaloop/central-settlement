
'use strict';
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const scriptEngine = require('../lib/scriptEngine')
const fs = require('fs')
const vm = require('vm')
const path = require('path')


const loadScripts = (scriptDirectory) => {
  const scriptsMap = {}
  const scriptDirectoryPath = path.join(process.cwd(), scriptDirectory)
  const scriptFiles = fs.readdirSync(scriptDirectoryPath)
  for (const scriptFile of scriptFiles) {
    const scriptSource = fs.readFileSync(path.join(scriptDirectoryPath, scriptFile), 'utf8')
    const scriptLines = scriptSource.split(/\r?\n/)
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
const executeScripts = async (scriptsMap, scriptType, scriptAction, scriptStatus, payload) => {
  const scriptResults = {}
  if (scriptsMap[scriptType][scriptAction][scriptStatus]) {
    const now = new Date()
    for (const script of scriptsMap[scriptType][scriptAction][scriptStatus]) {
      if (now.getTime() >= script.startTime.getTime() && now.getTime() <= script.endTime.getTime()) {
        Logger.debug(`Running script: ${JSON.stringify(script)}`)
        const scriptResult = await processScriptEngine(script.script, payload)
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
}

async function processScriptEngine(script, payload) {
  try {
    const result = await scriptEngine.execute(script, payload)
    return result
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

module.exports = {
  processScriptEngine,
  executeScripts,
  loadScripts,
}
