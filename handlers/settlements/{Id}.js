'use strict';

const Boom = require('boom');

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
     */
    get: function getSettlementsBySettlementParticipantCurrency(request, h) {
        return Boom.notImplemented();
    },
    /**
     * summary: Acknowledegement of settlement by updating with Settlements Id.
     * description: 
     * parameters: Id, settlementUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    put: function updateSettlementBySettlementId(request, h) {
        return Boom.notImplemented();
    }
};
