module.exports = {
  reject: [
    // From v6 get-port is now a pure esm package.
    "get-port",
    // @hapi/catbox-memory v6 and onwards breaks tests. Needs investigation.
    "@hapi/catbox-memory"
  ]
}
