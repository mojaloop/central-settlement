'use strict';

const Boom = require('boom');
const dataAccess = require('../../data/settlementWindows/{settlementWindowId}.js')

/**
 * Operations on /settlementWindows/{settlementWindowId}
 */
module.exports = {
    /**
     * summary: If the settlementWindow is open, it can be closed and a new window created. If it is already closed, return an error message. Returns the new settlement window.
     * description: 
     * parameters: settlementWindowId, settlementWindowClosurePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    post: async function closeSettlementWindow(request, h) {
        const getData = new Promise((resolve, reject) => {
            dataAccess.post["200"](request, h, (error, mock) => {
                return error ? reject(error) : resolve(mock.responses)
            })
        })
        return await getData

    }
};
