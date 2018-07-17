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
            switch (request.server.app.responseCode) {
                case 200:
                case 400:
                case 401:
                case 404:
                case 415:
                    dataAccess.get[`${request.server.app.responseCode}`](request, h, (error, mock) => {
                        if (error) reject(error)
                        else if (!mock.responses) resolve()
                        else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), {statusCode: mock.responses.code}))
                        else resolve(mock.responses)
                    })
                    break
                default:
                    dataAccess.get[`default`](request, h, (error, mock) => {
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
            console.log(e)
        }
    }
};
