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
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Logger = require('@mojaloop/central-services-shared').Logger
const cloneDeep = require('../../../src/utils/cloneDeep')

Test('cloneDeep utility', (cloneDeepTest) => {
  let input = {
    prop1: 'value',
    prop2: {
      prop21: 'deep21'
    },
    prop3: null,
    prop4: [1, 2, 3],
    prop5: Object.create({notOwn: true})
  }

  cloneDeepTest.test('should copy object', test => {
    try {
      let result = cloneDeep(input)
      test.deepEqual(result, input, 'result matches the input')
      result.prop2.prop21 = 'test'
      test.notDeepEqual(result, input, 'result does not match the input after deep change')
      let objAssign = Object.assign({}, input)
      test.deepEqual(objAssign, input, 'object assign copied the object')
      objAssign.prop2.prop21 = 'test'
      test.deepEqual(objAssign, input, 'change in objAssign deep property affected the input')
      test.deepEqual(result, input, 'now result matches the input')
      test.ok(input.prop5.notOwn, 'not own property present in the input')
      test.notOk(result.prop5.notOwn, 'not own property not copied')
      test.end()
    } catch (err) {
      Logger.error(`cloneDeep failed with error - ${err}`)
      test.fail()
      test.end()
    }
  })

  cloneDeepTest.end()
})
