const RC = require('rc')('CSET', require('../../config/default.json'))

module.exports = {
  HOSTNAME: RC.HOSTNAME.replace(/\/$/, ''),
  PORT: RC.PORT,
  DATABASE_URI: RC.DATABASE_URI,
  TRANSFER_VALIDITY_SECONDS: RC.TRANSFER_VALIDITY_SECONDS,
  HUB_ID: RC.HUB_PARTICIPANT.ID,
  HUB_NAME: RC.HUB_PARTICIPANT.NAME
}
