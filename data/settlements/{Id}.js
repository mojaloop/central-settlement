'use strict';
var Mockgen = require('../mockgen.js');
/**
 * Operations on /settlements/{Id}
 */
module.exports = {
    /**
     * summary: Returns Settlement(s) as per parameters/filter criteria.
     * description: 
     * parameters: Id, currency, Id
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: getSettlementsBySettlementParticipantCurrency
     */
    get: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
                operation: 'get',
                response: 'default'
            }, callback);
        }
    },
    /**
     * summary: Acknowledegement of settlement by updating with Settlements Id.
     * description: 
     * parameters: Id, settlementUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: updateSettlementBySettlementId
     */
    put: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
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
                path: '/settlements/{Id}',
                operation: 'put',
                response: 'default'
            }, callback);
        }
    }
};
