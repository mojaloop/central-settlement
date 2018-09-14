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
 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

// 'use strict'

// const Test = require('tapes')(require('tape'))
// const Mockgen = require('../../../../../data/mockgen.js')
// const InitServer = require('./../../../../../../src/setup').initialize
// const responseCodes = [200, 400, 401, 404, 415, 500]

// /**
//  * Test for /settlements/{settlementId}/participants/{participantId}
//  */
// Test('/settlements/{settlementId}/participants/{participantId}', function (settlementTest) {
//   let server
//   settlementTest.beforeEach(async t => {
//     server = await InitServer()
//     t.end()
//   })

//   settlementTest.afterEach(async t => {
//     await server.stop()
//     t.end()
//   })

//   /**
//      * summary: Acknowledegement of settlement by updating with Settlements Id and Participant Id.
//      * description:
//      * parameters: settlementId, participantId, settlementParticipantUpdatePayload
//      * produces: application/json
//      * responses: 200, 400, 401, 404, 415, default
//      */
//   settlementTest.test('test updateSettlementBySettlementIdParticipantId put operation', async function (t) {
//     try {
//       const requests = new Promise((resolve, reject) => {
//         Mockgen().requests({
//           path: '/settlements/{settlementId}/participants/{participantId}',
//           operation: 'put'
//         }, function (error, mock) {
//           return error ? reject(error) : resolve(mock)
//         })
//       })

//       const mock = await requests

//       t.ok(mock)
//       t.ok(mock.request)
//       // Get the resolved path from mock request
//       // Mock request Path templates({}) are resolved using path parameters
//       const options = {
//         method: 'put',
//         url: '/v1' + mock.request.path
//       }
//       if (mock.request.body) {
//         // Send the request body
//         options.payload = mock.request.body
//       } else if (mock.request.formData) {
//         // Send the request form data
//         options.payload = mock.request.formData
//         // Set the Content-Type as application/x-www-form-urlencoded
//         options.headers = options.headers || {}
//         options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
//       }
//       // If headers are present, set the headers.
//       if (mock.request.headers && mock.request.headers.length > 0) {
//         options.headers = mock.request.headers
//       }

//       for (let responseCode of responseCodes) {
//         server.app.responseCode = responseCode
//         const response = await server.inject(options)

//         switch (responseCode) {
//           case 200:
//             responseCode = 200
//             break
//           case 400:
//             responseCode = 500
//             break
//           case 401:
//             responseCode = 500
//             break
//           case 404:
//             responseCode = 500
//             break
//           case 415:
//             responseCode = 500
//             break
//           default:
//             responseCode = 500
//             break
//         }

//         t.equal(response.statusCode, responseCode, 'Ok response status')
//       }

//       t.end()
//     } catch (e) {
//       t.fail(e)
//       t.end()
//     }
//   })
// })
