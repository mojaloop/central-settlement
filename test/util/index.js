/* Helper Functions */

const fs = require('fs')
const path = require('path')
const os = require('os')
const { GenericContainer, Wait } = require('testcontainers')
const Config = require('../../src/lib/config')

const TIGERBEETLE_IMAGE = 'ghcr.io/coilhq/tigerbeetle@sha256:c312832a460e7374bcbd4bd4a5ae79b8762f73df6363c9c8106c76d864e21303'
const TIGERBEETLE_CONTAINER_LOG = true
const TIGERBEETLE_DIR = '/var/lib/tigerbeetle'
const TIGERBEETLE_PORT = 5001

/**
 * Create a mock request handler
 * @param {*} param0
 */
const createRequest = ({ payload, params, query }) => {
  const requestPayload = payload || {}
  const requestParams = params || {}
  const requestQuery = query || {}

  return {
    payload: requestPayload,
    params: requestParams,
    query: requestQuery,
    server: {
      log: () => { },
      methods: {

      }
    }
  }
}

/**
 * unwrapResponse
 *
 * Use this function to unwrap the innner response body and code from an async Handler
 */
const unwrapResponse = async (asyncFunction) => {
  let responseBody
  let responseCode
  const nestedReply = {
    response: (response) => {
      responseBody = response
      return {
        code: statusCode => {
          responseCode = statusCode
        }
      }
    }
  }
  await asyncFunction(nestedReply)

  return {
    responseBody,
    responseCode
  }
}

const startTigerBeetleContainer = async (clusterId = 1) => {
  const tigerBeetleDirSrc = fs.mkdtempSync(path.join(os.tmpdir(), 'tigerbeetle-'))

  const tbContFormat = await new GenericContainer(TIGERBEETLE_IMAGE)
    .withExposedPorts(TIGERBEETLE_PORT)
    .withBindMount(tigerBeetleDirSrc, TIGERBEETLE_DIR)
    .withPrivilegedMode()
    .withCmd([
      'init',
      '--cluster=' + clusterId,
      '--replica=0',
      '--directory=' + TIGERBEETLE_DIR
    ])
    .withWaitStrategy(Wait.forLogMessage(/initialized data file/))
    .start()

  const streamTbFormat = await tbContFormat.logs()
  if (TIGERBEETLE_CONTAINER_LOG) {
    streamTbFormat
      .on('data', (line) => console.log(line))
      .on('err', (line) => console.error(line))
      .on('end', () => console.log('Stream closed for [tb-format]'))
  }

  // Give TB a chance to startup (no message currently to notify allocation is complete):
  setTimeout(() => {}, 1000)
  await tbContFormat.stop()

  const tbContStart = await new GenericContainer(TIGERBEETLE_IMAGE)
    .withExposedPorts(TIGERBEETLE_PORT)
    .withBindMount(tigerBeetleDirSrc, TIGERBEETLE_DIR)
    .withPrivilegedMode()
    .withCmd([
      'start',
      '--cluster=' + clusterId,
      '--replica=0',
      '--addresses=0.0.0.0:' + TIGERBEETLE_PORT,
      '--directory=' + TIGERBEETLE_DIR
    ])
    .withWaitStrategy(Wait.forLogMessage(/listening on/))
    .start()
  const streamTbStart = await tbContStart.logs()

  if (TIGERBEETLE_CONTAINER_LOG) {
    streamTbStart
      .on('data', (line) => console.log(line))
      .on('err', (line) => console.error(line))
      .on('end', () => console.log('Stream closed for [running-tb-cluster]'))
  }

  Config.TIGERBEETLE.replicaEndpoint01 = tbContStart.getMappedPort(TIGERBEETLE_PORT)

  setTimeout(() => {}, 2000)
  return tbContStart
}

module.exports = {
  createRequest,
  unwrapResponse,
  startTigerBeetleContainer
}
