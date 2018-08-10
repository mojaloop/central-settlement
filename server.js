'use strict';

const Hapi = require('hapi');
const HapiOpenAPI = require('hapi-openapi');
const Path = require('path');
const Db = require('./dataAccessObject/index.js')
const Logger = require('@mojaloop/central-services-shared').Logger

const openAPIOptions = {
    api: Path.resolve('./config/swagger.json'),
    handlers: Path.resolve('./handlers')
}

async function connectDatabase () {
  return await Db.connect(`mysql://central_ledger:password@localhost:3306/central_ledger`)
}

const init = async function(config = {
    port: 8080
}, openAPIPluginOptions = openAPIOptions) {
    const server = new Hapi.Server(config);

    await server.register({
        plugin: HapiOpenAPI,
        options: {
            api: Path.resolve('./config/swagger.json'),
            handlers: Path.resolve('./handlers')
        }
    });

    await server.start();

    return server;
};

init().then((server) => {
    await connectDatabase()
    server.plugins.openapi.setHost(server.info.host + ':' + server.info.port);
    Logger.info(`Server running on ${server.info.host}:${server.info.port}`);
});

module.exports = {
    init
}
