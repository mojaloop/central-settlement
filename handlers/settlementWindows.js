'use strict';

const Boom = require('boom');

/**
 * Operations on /settlementWindows
 */
module.exports = {
    /**
     * summary: Returns a Settlement Window(s) as per parameter(s).
     * description: 
     * parameters: id, state, fromDateTime, toDateTime
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    get: function getSettlementWindowByParams(request, h) {
        return Boom.notImplemented();
    }
};
