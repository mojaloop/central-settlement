'use strict';

const Boom = require('boom');
const dataAccess = require('../../data/settlements/{settlementId}.js')
/**
 * Operations on /settlements/{settlementId}
 */
module.exports = {
    /**
     * summary: Returns Settlements per Id.
     * description: 
     * parameters: settlementId
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    get: async function getSettlementsById(request, h) {
        const getData = new Promise((resolve, reject) => {
            dataAccess.get["200"](request, h, (error, mock) => {
                return error ? reject(error) : resolve(mock.responses)
            })
        })
        return await getData
    }
};
