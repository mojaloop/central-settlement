'use strict';

const Boom = require('boom');
const Path = require('path')
const dataAccess = require('../data/settlements')

console.log('path ', Path.basename(__filename))
/**
 * Operations on /settlements
 */

module.exports = {
    /**
     * summary: Trigger the creation of a settlement event, that does the calculation of the net settlement position per participant and marks all transfers in the affected windows as Pending settlement. Returned dataset is the net settlement report for the settlementwindow
     * description: 
     * parameters: settlementEventPayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    post: async function postSettlementEvent(request, h) {
        // console.log(request.payload)
        const getData = new Promise((resolve, reject) => {
            dataAccess.post["200"](request, h, (error, mock) => {
                return error ? reject(error) : resolve(mock.responses)
            })
        })
        return await getData
    }
};
