'use strict'

module.exports = {
  verbose: true,
  // preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  testPathIgnorePatterns: ['<rootDir>/test/integration/'],
  collectCoverageFrom: ['./src/**/*.js'],
  coverageReporters: ['json', 'lcov', 'text'],
  clearMocks: false,
  coverageThreshold: {
    global: {
      statements: 90,
      functions: 90,
      branches: 90,
      lines: 90
    }
  },
  reporters: ['jest-junit', 'default']
}
