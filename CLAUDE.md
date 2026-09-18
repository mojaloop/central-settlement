# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Central-settlement is a Mojaloop microservice that manages settlements between Financial Service Providers (FSPs) and the Central Hub. It handles settlement windows, settlement event triggers, and provides information about FSP accounts and settlements.

## Common Commands

```bash
# Start the API server
npm start

# Run unit tests
npm test

# Run a single unit test file
npx tape 'test/unit/path/to/file.test.js' | tap-spec

# Run unit tests with coverage
npm run test:coverage

# Run integration tests (requires docker containers)
npm run test:int:spec

# Lint code
npm run lint
npm run lint:fix

# Build and run with Docker
npm run docker:build && npm run docker:up

# Start specific handlers via CLI
node src/handlers/index.js handler --deferredSettlement
node src/handlers/index.js handler --grossSettlement
node src/handlers/index.js handler --rules
```

## Architecture

### Entry Points
- **API Server** (`src/api/index.js`): REST API for settlement operations, runs on port 3007
- **Handlers CLI** (`src/handlers/index.js`): Kafka message handlers started via command-line flags

### Code Organization
```
src/
├── api/              # REST API routes and handlers (Hapi.js)
│   └── handlers/     # Route handlers for settlements, settlement windows
├── domain/           # Business logic layer
│   ├── settlement/   # Settlement operations
│   ├── settlementWindow/
│   └── rules/        # Fee calculation rules engine
├── handlers/         # Kafka event handlers
│   ├── deferredSettlement/  # Handles settlement window close events
│   ├── grossSettlement/     # Handles gross settlement processing
│   └── rules/               # Rules execution handler
├── models/           # Data access layer (Knex.js)
│   ├── settlement/
│   ├── settlementWindow/
│   └── settlementWindowContent/
├── lib/              # Utilities (config, db, kafka)
└── shared/           # Shared setup and plugins
```

### Key Dependencies
- **@mojaloop/central-ledger**: Imported as a dependency; shares the same database schema
- **@hapi/hapi**: HTTP server framework
- **Kafka**: Async messaging via `@mojaloop/central-services-stream`
- **MySQL**: Database via Knex.js (`@mojaloop/database-lib`)

### Database
Uses the same MySQL database as central-ledger (schema: `central_ledger`). No separate migrations in this repo - database schema is managed by central-ledger.

### Testing
- **Framework**: tape (not Jest)
- **Pattern**: Tests mirror source structure in `test/unit/`
- **Mocking**: Uses sinon and proxyquire
- **Integration tests**: Require Docker containers (MySQL, Kafka, central-ledger)

### Configuration
- Primary config: `config/default.json`
- Environment overrides via `rc` library
- Key settings: PORT (3007), DATABASE, KAFKA consumers/producers

## Node.js Version

Always run `nvm use` when entering the repository. The project uses Node.js 22.x (see `.nvmrc`).
