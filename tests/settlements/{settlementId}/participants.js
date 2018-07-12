'use strict';

const Test = require('tape');
const Hapi = require('hapi');
const HapiOpenAPI = require('hapi-openapi');
const Path = require('path');
const Mockgen = require('../../../data/mockgen.js');
const responseCodes = [200, 400, 401, 404, 415]

/**
 * Test for /settlements/{settlementId}/participants
 */
Test('/settlements/{settlementId}/participants', function (t) {

    /**
     * summary: Acknowledgement of a settlement.
     * description: 
     * parameters: settlementId
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    t.test('test getSettledParticipants get operation', async function (t) {

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
                path: '/settlements/{settlementId}/participants',
                operation: 'get'
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
            method: 'get',
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
//            options.responseCode = responseCode
            server.app.responseCode = responseCode
            const response = await server.inject(options);
            t.equal(response.statusCode, responseCode, 'Ok response status');
        }

        t.end();
    } catch (e) {
        console.log(e)
    }
    });
});
