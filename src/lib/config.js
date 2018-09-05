const RC = require('rc')('CSET', require('../../config/default.json'))

module.exports = {
  HOSTNAME: RC.HOSTNAME.replace(/\/$/, ''),
  PORT: RC.PORT,
  DATABASE_URI: RC.DATABASE_URI
}
