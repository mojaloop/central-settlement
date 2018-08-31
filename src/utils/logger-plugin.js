
const Logger = require('@mojaloop/central-services-shared').Logger

module.exports.plugin = {
  name: 'logger-plugin',
  register: async function (server) {
    server.events.on('log', function (event) {
      if (Array.isArray(event.tags) && event.tags.length === 1) { Logger[`${event.tags[0]}`](event.data) } else Logger.info(event.data)
    })
  }
}
