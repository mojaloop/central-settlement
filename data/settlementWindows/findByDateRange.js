'use strict';
var Mockgen = require('../mockgen.js');
/**
 * Operations on /settlementWindows/findByDateRange
 */
module.exports = {
    /**
     * summary: Returns Settlement Windows including states and closure reasons. Filtered by date Range.
     * description: 
     * parameters: startDate, endDate
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: getSettlementWindowsByDateRange
     */
    get: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows/findByDateRange',
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
                path: '/settlementWindows/findByDateRange',
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
                path: '/settlementWindows/findByDateRange',
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
                path: '/settlementWindows/findByDateRange',
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
                path: '/settlementWindows/findByDateRange',
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
                path: '/settlementWindows/findByDateRange',
                operation: 'get',
                response: 'default'
            }, callback);
        }
    }
};
