/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * ModusBox
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/
'use strict'

const Path = require('path')
const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend
const Handlers = require('./handlers')
const { getBasePath, handleRequest } = require('./openapiRouting')

/**
 * Core API Routes
 *
 * @param {object} api OpenAPIBackend instance
 */
const apiRoutes = (api) => {
  const basePath = getBasePath(api)
  return [
    {
      method: 'GET',
      path: `${basePath}/health`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'getHealth'],
        description: 'Gets the health of the service and sub-services (i.e. database).'
      }
    },
    {
      method: 'GET',
      path: `${basePath}/settlementWindows/{id}`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'getSettlementWindowById', 'sampled'],
        description: 'Returns a Settlement Window by id.'
      }
    },
    {
      method: 'POST',
      path: `${basePath}/settlementWindows/{id}`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'closeSettlementWindow', 'sampled'],
        description: 'Closes requested window and opens a new one.'
      }
    },
    {
      method: 'GET',
      path: `${basePath}/settlementWindows`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'getSettlementWindowsByParams', 'sampled'],
        description: 'Returns Settlement Windows as per parameter(s).'
      }
    },
    {
      method: 'GET',
      path: `${basePath}/settlements`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'getSettlementsByParams', 'sampled'],
        description: 'Returns Settlements as per parameter(s).'
      }
    },
    {
      method: 'POST',
      path: `${basePath}/settlements`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'createSettlement', 'sampled'],
        description: 'Triggers settlement creation. Returns settlement report.'
      }
    },
    {
      method: 'GET',
      path: `${basePath}/settlements/{id}`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'getSettlementById', 'sampled'],
        description: 'Returns Settlement(s) as per parameters/filter criteria.'
      }
    },
    {
      method: 'PUT',
      path: `${basePath}/settlements/{id}`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'updateSettlementById', 'sampled'],
        description: 'Acknowledgement of settlement by updating with Settlement Id.'
      }
    },
    {
      method: 'GET',
      path: `${basePath}/settlements/{sid}/participants/{pid}`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'getSettlementBySettlementParticipant', 'sampled'],
        description: 'Returns Settlement(s) as per filter criteria.'
      }
    },
    {
      method: 'PUT',
      path: `${basePath}/settlements/{sid}/participants/{pid}`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'updateSettlementBySettlementParticipant', 'sampled'],
        description: 'Acknowledgement of settlement by updating the reason and state by SP.'
      }
    },
    {
      method: 'GET',
      path: `${basePath}/settlements/{sid}/participants/{pid}/accounts/{aid}`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'getSettlementBySettlementParticipantAccount', 'sampled'],
        description: 'Returns Settlement(s) as per filter criteria.'
      }
    },
    {
      method: 'PUT',
      path: `${basePath}/settlements/{sid}/participants/{pid}/accounts/{aid}`,
      handler: (req, h) => handleRequest(api, req, h),
      options: {
        tags: ['api', 'updateSettlementBySettlementParticipantAccount', 'sampled'],
        description: 'Acknowledgement of settlement by updating the reason and state by SPA.'
      }
    }
  ]
}

module.exports = {
  plugin: {
    name: 'api-routes',
    register: async function (server) {
      const api = await OpenapiBackend.initialise(Path.resolve(__dirname, '../interface/swagger.json'), Handlers)
      server.route(apiRoutes(api))
    }
  }
}
