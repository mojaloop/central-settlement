'use strict';

const Boom = require('boom');
const dataAccess = require('../../data/settlements/findByParticipant')

/**
 * Operations on /settlements/findByParticipant
 */
module.exports = {
    /**
     * summary: Returns Settlements per Partricipant (DFSP).
     * description: 
     * parameters: participantId
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    get: async function getSettlementsByParticipantId(request, h) {
        const getData = new Promise((resolve, reject) => {
            dataAccess.get["200"](request, h, (error, mock) => {
                return error ? reject(error) : resolve(mock.responses)
            })
        })
        return await getData
    }
};
