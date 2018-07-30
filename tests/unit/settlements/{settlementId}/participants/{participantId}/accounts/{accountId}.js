'use strict';

const Test = require('tape');
const Hapi = require('hapi');
const HapiOpenAPI = require('hapi-openapi');
const Path = require('path');
const Mockgen = require('../../../../../../../data/mockgen.js');
const responseCodes = [200, 400, 401, 404, 415];

/**
 * Test for /settlements/{settlementId}/participants/{participantId}/accounts/{accountId}
 */
Test('/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}', async function (t) {

    const server = new Hapi.Server();
    await server.register({
        plugin: HapiOpenAPI,
        options: {
            api: Path.resolve(__dirname, '../../../../../../../config/swagger.json'),
            handlers: Path.join(__dirname, '../../../../../../../handlers'),
            outputvalidation: true
        }
    });

    /**
     * summary: Returns Settlement(s) as per filter criteria.
     * description:
     * parameters: settlementId, participantId, accountId
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */

    await t.test('test getSettlementsBySettlementParticipantAccounts get operation', async function (t) {
        try {
            const requests = new Promise((resolve, reject) => {
                Mockgen().requests({
                    path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
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
                url: '/v1' + mock.request.path
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
    /**
     * summary: Acknowledegement of settlement by updating thereason and state by Settlements Id, Participant Id and accounts Id
     * description:
     * parameters: settlementId, participantId, accountId, settlementUpdatePayload
     * produces: application/json
     * responses: 200, 400, 401, 404, 415, default
     */
    await t.test('test updateSettlementBySettlementParticipantsAccounts put operation', async function (t) {

        /*const server = new Hapi.Server();

        await server.register({
            plugin: HapiOpenAPI,
            options: {
                api: Path.resolve(__dirname, '../../../../../../config/swagger.json'),
                handlers: Path.join(__dirname, '../../../../../../handlers'),
                outputvalidation: true
            }
        });*/
        try {
            const requests = new Promise((resolve, reject) => {
                Mockgen().requests({
                    path: '/settlements/{settlementId}/participants/{participantId}/accounts/{accountId}',
                    operation: 'put'
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
                method: 'put',
                url: '/v1' + mock.request.path
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
