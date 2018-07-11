'use strict';

const Boom = require('boom');
const dataAccess = require('../../data/settlementWindows/findByDateRange')

/**
 * Operations on /settlementWindows/findByDateRange
 */
module.exports = {
    /**
     * summary: Returns Settlement Windows including states and closure reasons. Filtered by date Range.
     * description: 
     * parameters: startDate, endDate
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    get: async function getSettlementWindowsByDateRange(request, h) {
        const getData = new Promise((resolve, reject) => {
            dataAccess.get["200"](request, h, (error, mock) => {
                return error ? reject(error) : resolve(mock.responses)
            })
        })
        return await getData
    }
};
