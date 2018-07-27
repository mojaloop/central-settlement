'use strict';

const Boom = require('boom');

/**
 * Operations on /settlements/{settlementId}/participants/{participantId}
 */
module.exports = {
    /**
     * summary: Acknowledegement of settlement by updating with Settlements Id and Participant Id.
     * description: 
     * parameters: settlementId, participantId, settlementUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    put: function updateSettlementBySettlementIdParticiapntId(request, h) {
        return Boom.notImplemented();
    }
};
