'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const { statusEnum, serviceName } = require('@mojaloop/central-services-shared').HealthCheck.HealthCheckEnums

const MigrationLockModel = require('../../../../src/models/misc/migrationLock')

const {
  getSubServiceHealthDatastore
} = require('../../../../src/lib/healthCheck/subServiceHealth')

Test('SubServiceHealth test', function (subServiceHealthTest) {
  let sandbox

  subServiceHealthTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()

    t.end()
  })

  subServiceHealthTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  subServiceHealthTest.test('getSubServiceHealthDatastore', datastoreTest => {
    datastoreTest.test('datastore test passes when the database is not migration locked', async test => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(false)
      const expected = { name: serviceName.datastore, status: statusEnum.OK }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthDatastore should match expected result')
      test.ok(MigrationLockModel.getIsMigrationLocked.called)
      test.end()
    })

    datastoreTest.test('datastore test fails when the database is migration locked', async test => {
      // Arrange

      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').returns(true)
      const expected = { name: serviceName.datastore, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthDatastore should match expected result')
      test.ok(MigrationLockModel.getIsMigrationLocked.called)
      test.end()
    })

    datastoreTest.test('datastore test fails when getIsMigrationLocked throws', async test => {
      // Arrange
      sandbox.stub(MigrationLockModel, 'getIsMigrationLocked').throws(new Error('Error connecting to db'))
      const expected = { name: serviceName.datastore, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthDatastore()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthDatastore should match expected result')
      test.ok(MigrationLockModel.getIsMigrationLocked.called)
      test.end()
    })

    datastoreTest.end()
  })

  subServiceHealthTest.end()
})
