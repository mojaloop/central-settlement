'use strict';

const Boom = require('boom');
const dataAccess = require('../../../data/settlements/{settlementId}/participants')
/**
 * Operations on /settlements/{settlementId}/participants
 */
module.exports = {
    /**
     * summary: Acknowledgement of a settlement.
     * description: 
     * parameters: settlementId
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    put: async function putSettledParticipants(request, h) {
        const getData = new Promise((resolve, reject) => {
            dataAccess.put["200"](request, h, (error, mock) => {
                return error ? reject(error) : resolve(mock.responses)
            })
        })
        return await getData
    }
};
