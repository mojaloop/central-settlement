'use strict';
var Mockgen = require('../../mockgen.js');
/**
 * Operations on /settlements/{settlementId}/participants
 */
module.exports = {
    /**
     * summary: Acknowledgement of a settlement.
     * description: 
     * parameters: settlementId
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: putSettledParticipants
     */
    put: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{settlementId}/participants',
                operation: 'put',
                response: '200'
            }, callback);
        },
        400: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{settlementId}/participants',
                operation: 'put',
                response: '400'
            }, callback);
        },
        401: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{settlementId}/participants',
                operation: 'put',
                response: '401'
            }, callback);
        },
        404: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{settlementId}/participants',
                operation: 'put',
                response: '404'
            }, callback);
        },
        415: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{settlementId}/participants',
                operation: 'put',
                response: '415'
            }, callback);
        },
        default: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{settlementId}/participants',
                operation: 'put',
                response: 'default'
            }, callback);
        }
    }
};
