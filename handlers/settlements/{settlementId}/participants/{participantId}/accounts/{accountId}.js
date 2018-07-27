'use strict';

const Boom = require('boom');

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
     */
    get: function getSettlementsBySettlementParticipantAccounts(request, h) {
        return Boom.notImplemented();
    },
    /**
     * summary: Acknowledegement of settlement by updating thereason and state by Settlements Id, Participant Id and accounts Id
     * description: 
     * parameters: settlementId, participantId, accountId, settlementUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    put: function updateSettlementBySettlementParticipantsAccounts(request, h) {
        return Boom.notImplemented();
    }
};
