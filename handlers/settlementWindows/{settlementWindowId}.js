'use strict';

const Boom = require('boom');

/**
 * Operations on /settlementWindows/{settlementWindowId}
 */
module.exports = {
    /**
     * summary: Returns a Settlement Window as per Settlement Window Id.
     * description: 
     * parameters: settlementWindowId
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    get: function getSettlementWindowById(request, h) {
        return Boom.notImplemented();
    },
    /**
     * summary: If the settlementWindow is open, it can be closed and a new window created. If it is already closed, return an error message. Returns the new settlement window.
     * description: 
     * parameters: settlementWindowId, settlementWindowClosurePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    post: function closeSettlementWindow(request, h) {
        return Boom.notImplemented();
    }
};
