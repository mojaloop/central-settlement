'use strict';

const Boom = require('boom');
const dataAccess = require('../../data/settlementWindows/findByState')

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
     */
    get: async function getSettlementWindowsByState(request, h) {
        const getData = new Promise((resolve, reject) => {
            dataAccess.get["200"](request, h, (error, mock) => {
                return error ? reject(error) : resolve(mock.responses)
            })
        })
        return await getData
    }
};
