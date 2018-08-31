'use strict'
var Mockgen = require('./mockgen.js')
/**
 * Operations on /settlements
 */
module.exports = {
  /**
     * summary: Returns Settlement(s) as per parameter(s).
     * description:
     * parameters: currency, participantId, settlementWindowId, accountId, state, fromDateTime, toDateTime
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: getSettlementsByParams
     */
  get: {
    200: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'get',
        response: '200'
      }, callback)
    },
    400: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'get',
        response: '400'
      }, callback)
    },
    401: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'get',
        response: '401'
      }, callback)
    },
    404: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'get',
        response: '404'
      }, callback)
    },
    415: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'get',
        response: '415'
      }, callback)
    },
    default: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'get',
        response: 'default'
      }, callback)
    }
  },
  /**
     * summary: Trigger the creation of a settlement event, that does the calculation of the net settlement position per participant and marks all transfers in the affected windows as Pending settlement. Returned dataset is the net settlement report for the settlementwindow
     * description:
     * parameters: settlementEventPayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: postSettlementEvent
     */
  post: {
    200: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'post',
        response: '200'
      }, callback)
    },
    400: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'post',
        response: '400'
      }, callback)
    },
    401: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'post',
        response: '401'
      }, callback)
    },
    404: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'post',
        response: '404'
      }, callback)
    },
    415: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'post',
        response: '415'
      }, callback)
    },
    default: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/settlements',
        operation: 'post',
        response: 'default'
      }, callback)
    }
  }
}
