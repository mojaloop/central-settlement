'use strict';

const Boom = require('boom');
const Path = require('path');
const dataAccess = require('../../../../data/settlements/{settlementId}/participants/{participantId}');

console.log('path ', Path.basename(__filename));
/**
 * Operations on /settlements/{settlementId}/participants/{participantId}
 */
module.exports = {
    /**
     * summary: Acknowledegement of settlement by updating with Settlements Id and Participant Id.
     * description:
     * parameters: settlementId, participantId, settlementUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    put: async function updateSettlementBySettlementIdParticiapntId(request, h) {
        const getData = new Promise((resolve, reject) => {
            switch (request.server.app.responseCode) {
                case 200:
                case 400:
                case 401:
                case 404:
                case 415:
                    dataAccess.put[`${request.server.app.responseCode}`](request, h, (error, mock) => {
                        if (error) reject(error)
                        else if (!mock.responses) resolve()
                        else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), {statusCode: mock.responses.code}))
                        else resolve(mock.responses)
                    })
                    break
                default:
                    dataAccess.put[`default`](request, h, (error, mock) => {
                        if (error) reject(error)
                        else if (!mock.responses) resolve()
                        else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), {statusCode: mock.responses.code}))
                        else resolve(mock.responses)
                    })
            }
        })
        try {
            return await getData
        } catch (e) {
            throw (Boom.boomify(e))
        }
    }
};
