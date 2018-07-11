'use strict';
var Mockgen = require('../mockgen.js');
/**
 * Operations on /settlementWindows/findByState
 */
module.exports = {
    /**
     * summary: Returns Settlement Windows including states and closure reasons. Filtered by state.
     * description: 
     * parameters: state
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, 500, default
     * operationId: getSettlementWindowsByState
     */
    get: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows/findByState',
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
                path: '/settlementWindows/findByState',
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
                path: '/settlementWindows/findByState',
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
                path: '/settlementWindows/findByState',
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
                path: '/settlementWindows/findByState',
                operation: 'get',
                response: '415'
            }, callback);
        },
        500: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows/findByState',
                operation: 'get',
                response: '500'
            }, callback);
        },
        default: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlementWindows/findByState',
                operation: 'get',
                response: 'default'
            }, callback);
        }
    }
};
