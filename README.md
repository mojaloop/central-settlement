# central-settlements
[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/central-settlement.svg?style=flat)](https://github.com/mojaloop/central-settlement/commits/main)
[![Git Releases](https://img.shields.io/github/release/mojaloop/central-settlement.svg?style=flat)](https://github.com/mojaloop/central-settlement/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/mojaloop/central-settlement.svg?style=flat)](https://hub.docker.com/r/mojaloop/central-settlement)
[![CircleCI](https://circleci.com/gh/mojaloop/central-settlement.svg?style=svg)](https://app.circleci.com/pipelines/github/mojaloop/central-settlement)


The Central Settlements service is part of the Mojaloop project and deployment.

The central settlements service exposes Settlement API to manage the settlements between FSPs and the Central Hub.
The service manages Settlement Windows and Settlements Event Triggers and provides information about FSPs accounts and settlements.

## Contents:

- [central-settlements](#central-settlements)
  - [Contents:](#contents)
  - [Deployment](#deployment)
  - [Configuration](#configuration)
  - [Environmental variables](#environmental-variables)
  - [API](#api)
  - [Logging](#logging)
  - [Tests](#tests)
    - [Running Integration Tests interactively](#running-integration-tests-interactively)
  - [Auditing Dependencies](#auditing-dependencies)
  - [Container Scans](#container-scans)

## Deployment

TBA

## Configuration

Currently the only configuration, necessary is kept [here](./config/default.json)

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

Running integration tests (narrow)

    npm run test:int:narrow

### Running Integration Tests interactively

If you want to run integration tests in a repetitive manner, you can startup the test containers using `docker-compose`, login to running `central-settlement` container like so:

```bash
npm run docker:build && npm run docker:up

#first time only (in a new shell):
docker exec -it cs_central-ledger sh
npm run migrate

#in a new shell
docker exec -it cs_central-settlement sh
npm run test:int
```

## Auditing Dependencies

We use `audit-ci` along with `npm audit` to check dependencies for node vulnerabilities, and keep track of resolved dependencies with an `audit-ci.jsonc` file.

To start a new resolution process, run:

```bash
npm run audit:fix
```

You can then check to see if the CI will pass based on the current dependencies with:

```bash
npm run audit:check
```

The [audit-ci.jsonc](./audit-ci.jsonc) contains any audit-exceptions that cannot be fixed to ensure that CircleCI will build correctly.

## Container Scans

As part of our CI/CD process, we use anchore-cli to scan our built docker container for vulnerabilities upon release.

If you find your release builds are failing, refer to the [container scanning](https://github.com/mojaloop/ci-config#container-scanning) in our shared Mojaloop CI config repo. There is a good chance you simply need to update the `mojaloop-policy-generator.js` file and re-run the circleci workflow.

For more information on anchore and anchore-cli, refer to:
- [Anchore CLI](https://github.com/anchore/anchore-cli)
- [Circle Orb Registry](https://circleci.com/orbs/registry/orb/anchore/anchore-engine)
- 
