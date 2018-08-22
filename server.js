'use strict';

const Hapi = require('hapi');
const HapiOpenAPI = require('hapi-openapi');
const Path = require('path');

const openAPIOptions = {
    api: Path.resolve('./interface/swagger.json'),
    handlers: Path.resolve('./handlers')
}


const init = async function(config = {
    port: 8080
}, openAPIPluginOptions = openAPIOptions) {
    const server = new Hapi.Server(config);

    await server.register({
        plugin: HapiOpenAPI,
        options: {
            api: Path.resolve('./interface/swagger.json'),
            handlers: Path.resolve('./handlers')
        }
    });

    await server.start();

    return server;
};

init().then((server) => {
    server.plugins.openapi.setHost(server.info.host + ':' + server.info.port);

    console.log(`Server running on ${server.info.host}:${server.info.port}`);
});

module.exports = {
    init
}
