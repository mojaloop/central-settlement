# central-settlements
[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/central-settlement.svg?style=flat)](https://github.com/mojaloop/central-settlement/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/central-settlement.svg?style=flat)](https://github.com/mojaloop/central-settlement/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/mojaloop/central-settlement.svg?style=flat)](https://hub.docker.com/r/mojaloop/central-settlement)
[![CircleCI](https://circleci.com/gh/mojaloop/central-settlement.svg?style=svg)](https://circleci.com/gh/mojaloop/central-settlement)


The Central Settlements service is part of the Mojaloop project and deployment.

The central settlements service exposes Settlement API to manage the settlements between FSPs and the Central Hub.
The service manages Settlement Windows and Settlements Event Triggers and provides information about FSPs accounts and settlements.

Contents:

- [Deployment](#deployment)
- [Configuration](#configuration)
- [API](#api)
- [Logging](#logging)
- [Tests](#tests)

## Deployment

TBA

## Configuration

Currently the only configuration, necessary is kept [here](./config/default.json)
Example values are as follows:

```json
{
  "PORT": 3007,
  "HOSTNAME": "http://central-settlements.local",
  "DATABASE_URI" : "mysql://central_ledger:password@localhost:3306/central_ledger"
}
```

## Environmental variables

Currently all is set into the config.

## API

The Markdown version of API is available [here](./APIDefinition.md)
The actual Swagger API documentation can be found [here](./src/interface/swagger.json)

## Logging

Logs are sent to standard output by default.

## Tests

Includes unit tests at the moment. Functional and integration are outstanding.

Running the tests:

    npm run test:all

Tests include code coverage via istanbul. See the test/ folder for testing scripts.
