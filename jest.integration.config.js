'use strict'

module.exports = {
  verbose: true,
  // preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['./src/**/*.js'],
  coverageReporters: ['json', 'lcov', 'text', 'html'],
  clearMocks: false,
  coverageThreshold: {
  /* Adjust accordingly when integration testing is phased in. */
    global: {
      statements: 0,
      functions: 0,
      branches: 0,
      lines: 0
    }
  },
  // globalSetup: '<rootDir>/test/int/global_setup.js',
  // globalTeardown: '<rootDir>/test/int/global_tear_down.js',
  reporters: ['jest-junit', 'default']
}
