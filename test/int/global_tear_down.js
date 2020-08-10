

module.exports = async () => {
  global.server.stop({ timeout: 10000 }).then(function (err) {
    process.exit((err) ? 1 : 0)
  })
}
