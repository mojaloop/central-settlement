// /*****
//  License
//  --------------
//  Copyright © 2017 Bill & Melinda Gates Foundation
//  The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
//  http://www.apache.org/licenses/LICENSE-2.0
//  Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
//  Contributors
//  --------------
//  This is the official list of the Mojaloop project contributors for this file.
//  Names of the original copyright holders (individuals or organizations)
//  should be listed with a '*' in the first column. People who have
//  contributed from an organization can be listed under the organization
//  that actually holds the copyright for their contributions (see the
//  Gates Foundation organization for an example). Those individuals should have
//  their names indented and be marked with a '-'. Email address can be added
//  optionally within square brackets <email>.
//  * Gates Foundation
//  - Name Surname <name.surname@gatesfoundation.com>

//  * VesselsTech
//  - Lewis Daly <lewis@vesselstech.com>
//  --------------
//  **********/

// 'use strict'

// const Test = require('tape')
// const Joi = require('@hapi/joi')

// Test('Setup test', async setupTest => {
//   await setupTest.test('healthCheck should', async healthCheckTest => {
//     await healthCheckTest.test('get the basic health of the service', async (test) => {
//       // Arrange
//       const expectedSchema = {
//         status: Joi.string().valid('OK').required(),
//         uptime: Joi.number().required(),
//         startTime: Joi.date().iso().required(),
//         versionNumber: Joi.string().required(),
//         services: Joi.array().required()
//       }
//       const expectedStatus = 200
//       const expectedServices = [
//         { name: 'datastore', status: 'OK' },
//         { name: 'broker', status: 'OK' }
//       ]

//       // Act
//       const {
//         responseBody,
//         responseCode
//       } = await unwrapResponse((reply) => rootApiHandler.getHealth(createRequest({}), reply))

//       // Assert
//       const validationResult = Joi.validate(responseBody, expectedSchema) // We use Joi to validate the results as they rely on timestamps that are variable
//       test.equal(validationResult.error, null, 'The response matches the validation schema')
//       test.deepEqual(responseCode, expectedStatus, 'The response code matches')
//       test.deepEqual(responseBody.services, expectedServices, 'The sub-services are correct')
//       test.end()
//     })

//     healthCheckTest.end()
//   })

//   setupTest.end()
// })
