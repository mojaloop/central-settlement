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
            dataAccess.get[`${request.server.app.responseCode}`](request, h, (error, mock) => {
                if (error) reject(error)
                else if (!mock.responses) resolve()
                else if (mock.responses && mock.responses.code) resolve(Boom.boomify(new Error(mock.responses.message), {statusCode: mock.responses.code}))
                else resolve(mock.responses)
            })
        })
        try {
            return await getData
        } catch (e) {
            console.log(e)
        }
    }
};
