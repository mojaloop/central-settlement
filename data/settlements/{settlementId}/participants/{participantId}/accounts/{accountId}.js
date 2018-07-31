'use strict';
var Mockgen = require('../../../../../mockgen.js');
/**
 * Operations on /settlements/{settlementId}/participants/{participantId}/accounts/{accountId}
 */
module.exports = {
    /**
     * summary: Returns Settlement(s) as per filter criteria.
     * description: 
     * parameters: settlementId, participantId, accountId
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: getSettlementsBySettlementParticipantAccounts
     */
    get: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
                operation: 'get',
                response: 'default'
            }, callback);
        }
    },
    /**
     * summary: Acknowledegement of settlement by updating thereason and state by Settlements Id, Participant Id and accounts Id
     * description: 
     * parameters: settlementId, participantId, accountId, settlementUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     * operationId: updateSettlementBySettlementParticipantsAccounts
     */
    put: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
                operation: 'put',
                response: 'default'
            }, callback);
        }
    }
};
