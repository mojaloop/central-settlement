'use strict'

const Test = require('tape')
const Proxyquire = require('proxyquire')
const Defaults = require('../../../config/default.json')

Test('Config should', configTest => {
  configTest.test('enable API_DOC_ENDPOINTS_ENABLED', async function (test) {
    const DefaultsStub = { ...Defaults }
    DefaultsStub.API_DOC_ENDPOINTS_ENABLED = true

    const Config = Proxyquire('../../../src/lib/config', {
      '../../config/default.json': DefaultsStub
    })

    test.ok(Config.API_DOC_ENDPOINTS_ENABLED === true)
    test.end()
  })

  configTest.test('disable API_DOC_ENDPOINTS_ENABLED', async function (test) {
    console.log(Defaults)
    const DefaultsStub = { ...Defaults }
    DefaultsStub.API_DOC_ENDPOINTS_ENABLED = false

    const Config = Proxyquire('../../../src/lib/config', {
      '../../config/default.json': DefaultsStub
    })

    test.ok(Config.API_DOC_ENDPOINTS_ENABLED === false)
    test.end()
  })

  configTest.test('DEADLOCK.RETRIES is not set', async function (test) {
    const DefaultsStub = { ...Defaults }
    DefaultsStub.DEADLOCK.RETRIES = undefined

    const Config = Proxyquire('../../../src/lib/config', {
      '../../config/default.json': DefaultsStub
    })

    test.ok(Config.SETTLEMENT_DEADLOCK_RETRIES === 3)
    test.end()
  })

  configTest.test('DEADLOCK.RETRY_DELAY_MS is not set', async function (test) {
    const DefaultsStub = { ...Defaults }
    DefaultsStub.DEADLOCK.RETRY_DELAY_MS = undefined

    const Config = Proxyquire('../../../src/lib/config', {
      '../../config/default.json': DefaultsStub
    })

    test.ok(Config.SETTLEMENT_DEADLOCK_RETRY_DELAY_MS === 50)
    test.end()
  })

  configTest.end()
})
