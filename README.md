# central-settlements
[![](https://images.microbadger.com/badges/version/mojaloop/central-settlement.svg)](https://microbadger.com/images/mojaloop/central-settlement "Get your own version badge on microbadger.com")
[![](https://images.microbadger.com/badges/image/mojaloop/central-settlement.svg)](https://microbadger.com/images/mojaloop/central-settlement "Get your own image badge on microbadger.com")
[![CircleCI](https://circleci.com/gh/mojaloop/central-settlement/tree/master.svg?style=svg)](https://circleci.com/gh/mojaloop/central-settlement/tree/master)

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
