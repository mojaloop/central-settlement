'use strict';
var Mockgen = require('./mockgen.js');
/**
 * Operations on /settlementWindows
 */
module.exports = {
    /**
     * summary: Returns a Settlement Window(s) as per parameter(s).
     * description: 
     * parameters: participantId, state, fromDateTime, toDateTime
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: getSettlementWindowByParams
     */
    get: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows',
                operation: 'get',
                response: '200'
            }, callback);
        },
        400: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows',
                operation: 'get',
                response: '400'
            }, callback);
        },
        401: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows',
                operation: 'get',
                response: '401'
            }, callback);
        },
        404: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows',
                operation: 'get',
                response: '404'
            }, callback);
        },
        415: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows',
                operation: 'get',
                response: '415'
            }, callback);
        },
        default: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows',
                operation: 'get',
                response: 'default'
            }, callback);
        }
    }
};
