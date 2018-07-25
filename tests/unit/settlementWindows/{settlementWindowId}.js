'use strict';

const Test = require('tape');
const Hapi = require('hapi');
const HapiOpenAPI = require('hapi-openapi');
const Path = require('path');
const Mockgen = require('../../../data/mockgen.js');
const responseCodes = [200, 400, 401, 404, 415, 500];

/**
 * Test for /settlementWindows/{settlementWindowId}
 */
Test('/settlementWindows/{settlementWindowId}', function (t) {

    /**
     * summary: If the settlementWindow is open, it can be closed and a new window created. If it is already closed, return an error message. Returns the new settlement window.
     * description:
     * parameters: settlementWindowId, settlementWindowClosurePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    t.test('test closeSettlementWindow post operation', async function (t) {

        const server = new Hapi.Server();
        try {
            await server.register({
                plugin: HapiOpenAPI,
                options: {
                    api: Path.resolve(__dirname, '../../../config/swagger.json'),
                    handlers: Path.join(__dirname, '../../../handlers'),
                    outputvalidation: true
                }
            });

            const requests = new Promise((resolve, reject) => {
                Mockgen().requests({
                    path: '/settlementWindows/{settlementWindowId}',
                    operation: 'post'
                }, function (error, mock) {
                    return error ? reject(error) : resolve(mock);
                });
            });

            const mock = await requests;

            t.ok(mock);
            t.ok(mock.request);
            //Get the resolved path from mock request
            //Mock request Path templates({}) are resolved using path parameters
            const options = {
                method: 'post',
                url: '/v2' + mock.request.path
            };
            if (mock.request.body) {
                //Send the request body
                options.payload = mock.request.body;
            } else if (mock.request.formData) {
                //Send the request form data
                options.payload = mock.request.formData;
                //Set the Content-Type as application/x-www-form-urlencoded
                options.headers = options.headers || {};
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            // If headers are present, set the headers.
            if (mock.request.headers && mock.request.headers.length > 0) {
                options.headers = mock.request.headers;
            }

            for (let responseCode of responseCodes) {
                server.app.responseCode = responseCode
                const response = await server.inject(options);
                t.equal(response.statusCode, responseCode, 'Ok response status');
            }
            t.end();

        } catch (e) {
            t.fail(e)
            t.end()
        }
    });

});
