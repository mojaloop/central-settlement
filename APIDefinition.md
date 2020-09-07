# MOJALOOP Central Settlements, version 1.0.0

Base URL: http|https://undefined/v2

- [Endpoints](#endpoints)
  - [GET /settlementWindows/{id}](#get-settlementwindowsid)
  - [POST /settlementWindows/{id}](#post-settlementwindowsid)
  - [GET /settlementWindows](#get-settlementwindows)
  - [GET /settlements](#get-settlements)
  - [POST /settlements](#post-settlements)
  - [GET /settlements/{settlementId}/participants/{participantId}/accounts/{accountId}](#get-settlementssettlementidparticipantsparticipantidaccountsaccountid)
  - [PUT /settlements/{settlementId}/participants/{participantId}/accounts/{accountId}](#put-settlementssettlementidparticipantsparticipantidaccountsaccountid)
  - [GET /settlements/{id}](#get-settlementsid)
  - [PUT /settlements/{id}](#put-settlementsid)
  - [PUT /settlements/{settlementId}/participants/{participantId}](#put-settlementssettlementidparticipantsparticipantid)

## Endpoints

### GET /settlementWindows/{id}

**Parameters**

| in   | name | type    | required | description                                                |
|------|------|---------|----------|------------------------------------------------------------|
| path | id   | integer | true     | A valid settlement window id to be supplied in the query.
 |

#### Response: 200 OK

A settlement window's data returned.

**Schema**

- (object)
  - id (integer)
  - reason (string) (optional)
  - state (string)
  - createdDate (string)
  - changedDate (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### POST /settlementWindows/{id}

**Parameters**

| in   | name    | type    | required | description                                              |
|------|---------|---------|----------|----------------------------------------------------------|
| path | id      | integer | true     |                                                          |
| body | payload |         | true     | A JSON object containing settlement window closure info. |

**Request Body**

- (object)
  - state (string)
  - reason (string)

#### Response: 200 OK

Settlement window closed and new window opened.

**Schema**

- (object)
  - id (integer)
  - reason (string) (optional)
  - state (string)
  - createdDate (string)
  - changedDate (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### GET /settlementWindows

**Parameters**

| in    | name          | type                                                           | required | description                          |
|-|-|-|-|-|
| query | participantId | integer | false | A valid participant Id to filter on. |
| query | state         | string: OPEN, CLOSED, PENDING_SETTLEMENT, SETTLED, ABORTED | false    | A settlement window state to filter on. |
| query | fromDateTime  | string, date-time | false | The start date for query (relates to central-ledger.settlementWindow.createdDate). Can be used together with `toDateTime'. eg 2017-07-20T17:32:28Z |
| query | toDateTime    | string, date-time                                              | false    | The end date for query (relates to central-ledger.settlementWindow.createdDate). Can be used together with `fromDateTime'. eg 2017-07-21T17:32:28Z |

#### Response: 200 OK

Settlement window(s) returned by the filtering parameters.

**Schema**

- (array)
  - (object)
    - id (integer)
    - reason (string) (optional)
    - state (string)
    - createdDate (string)
    - changedDate (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### GET /settlements

**Parameters**

| in    | name                         | type                                             | required | description |
|-|-|-|-|-|
| query | currency                     | string                                           | false    | A valid currency to filter on. |
| query | participantId                | integer                                          | false    | A valid participant Id to filter on |
| query | settlementWindowId           | number                                           | false    | A valid Settlement Window Id to filter on.|
| query | accountId                    | number                                           | false    | A valid Account Id to filter on. |
| query | state                        | string: PENDING_SETTLEMENT, SETTLED, ABORTED | false    | A settlement state to filter on. |
| query | fromDateTime                 | string, date-time                                | false    | The start date for query (relates to central-ledger.settlement.createdDate). Can be used together with `toDateTime'. eg 2017-07-20T17:32:28Z |
| query | toDateTime                   | string, date-time                                | false    | The end date for query (relates to central-ledger.settlement.createdDate). Can be used together with `fromDateTime'. eg 2017-07-21T17:32:28Z |
| query | fromSettlementWindowDateTime | string, date-time                                | false    | The start date for query (relates to central-ledger.settlementWindow.createdDate). Can be used together with `toDateTime'. eg 2017-07-20T17:32:28Z |
| query | toSettlementWindowDateTime   | string, date-time                                | false    | The end date for query (relates to central-ledger.settlementWindow.createdDate). Can be used together with `fromDateTime'. eg 2017-07-21T17:32:28Z |

#### Response: 200 OK

Settlement window(s) returned by the filtering parameters.

**Schema**

- (array)
  - (object)
    - id (integer) (optional)
    - state (string) (optional)
    - settlementWindows (array) (optional)
      - (array)
        - (object)
          - id (integer)
          - reason (string) (optional)
          - state (string)
          - createdDate (string)
          - changedDate (string) (optional)
    - participants (array) (optional)
      - (object)
        - id (integer) (optional)
        - accounts (array) (optional)
          - (object)
            - id (integer) (optional) Paricipant Currency Id
            - reason (string) (optional) TBD
            - state (string) (optional)
            - netSettlementAmount (object) (optional)
              - amount (number) (optional)
              - currency (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### POST /settlements

**Parameters**

| in   | name    | required | description                                                 |
|------|---------|----------|-------------------------------------------------------------|
| body | payload | true     | A JSON object containing settlement windows to be included. |

**Request Body**

- (object)
  - reason (string) (optional)
  - settlementWindows (array) (optional)
    - (object)
      - id (integer)

#### Response: 200 OK

Created settlement with all windows and accounts.

**Schema**

- (object)
  - id (integer) (optional)
  - state (string) (optional)
  - settlementWindows (array) (optional)
    - (array)
      - (object)
        - id (integer)
        - reason (string) (optional)
        - state (string)
        - createdDate (string)
        - changedDate (string) (optional)
  - participants (array) (optional)
    - (object)
      - id (integer) (optional)
      - accounts (array) (optional)
        - (object)
          - id (integer) (optional) Paricipant Currency Id
          - reason (string) (optional) TBD
          - state (string) (optional)
          - netSettlementAmount (object) (optional)
            - amount (number) (optional)
            - currency (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### GET /settlements/{settlementId}/participants/{participantId}/accounts/{accountId}

**Parameters**

| in   | name          | type    | required | description              |
|------|---------------|---------|----------|--------------------------|
| path | settlementId  | integer | true     | A valid Settlement Id. |
| path | participantId | integer | true     | A valid Participant Id.|
| path | accountId     | integer | true     | A valid Account Id.    |

#### Response: 200 OK

Settlement, settlement windows and settlement accounts returned by the filtering parameters.

**Schema**

- (object)
  - id (integer) (optional)
  - state (string) (optional)
  - settlementWindows (array) (optional)
    - (array)
      - (object)
        - id (integer)
        - reason (string) (optional)
        - state (string)
        - createdDate (string)
        - changedDate (string) (optional)
  - participants (array) (optional)
    - (object)
      - id (integer) (optional)
      - accounts (array) (optional)
        - (object)
          - id (integer) (optional) Paricipant Currency Id
          - reason (string) (optional) TBD
          - state (string) (optional)
          - netSettlementAmount (object) (optional)
            - amount (number) (optional)
            - currency (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### PUT /settlements/{settlementId}/participants/{participantId}/accounts/{accountId}

**Parameters**

| in   | name          | type    | required | description                                      |
|------|---------------|---------|----------|--------------------------------------------------|
| path | settlementId  | integer | true     | A valid Settlement Id.                           |
| path | participantId | integer | true     | A valid Participant Id.                          |
| path | accountId     | integer | true     | A valid Account Id.                              |
| body | payload       |         | true     | A JSON object containing settlement update info. |

**Request Body**

- (object)
  - state (string)
  - reason (string)

#### Response: 200 OK

Settlements updated.

**Schema**

- (object)
  - id (integer) (optional)
  - state (string) (optional)
  - settlementWindows (array) (optional)
    - (array)
      - (object)
        - id (integer)
        - reason (string) (optional)
        - state (string)
        - createdDate (string)
        - changedDate (string) (optional)
  - participants (array) (optional)
    - (object)
      - id (integer) (optional)
      - accounts (array) (optional)
        - (object)
          - id (integer) (optional) Paricipant Currency Id
          - reason (string) (optional) TBD
          - state (string) (optional)
          - netSettlementAmount (object) (optional)
            - amount (number) (optional)
            - currency (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### GET /settlements/{id}

**Parameters**

| in   | name | type    | required | description             |
|------|------|---------|----------|-------------------------|
| path | id   | integer | true     | A valid Settlement Id.
 |

#### Response: 200 OK

Settlement successfully returned by the filtering/Query parameters.

**Schema**

- (object)
  - id (integer) (optional)
  - state (string) (optional)
  - settlementWindows (array) (optional)
    - (array)
      - (object)
        - id (integer)
        - reason (string) (optional)
        - state (string)
        - createdDate (string)
        - changedDate (string) (optional)
  - participants (array) (optional)
    - (object)
      - id (integer) (optional)
      - accounts (array) (optional)
        - (object)
          - id (integer) (optional) Paricipant Currency Id
          - reason (string) (optional) TBD
          - state (string) (optional)
          - netSettlementAmount (object) (optional)
            - amount (number) (optional)
            - currency (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### PUT /settlements/{id}

**Parameters**

| in   | name    | type    | required | description                                      |
|------|---------|---------|----------|--------------------------------------------------|
| path | id      | integer | true     | A valid Settlement Id.                           |
| body | payload |         | true     | A JSON object containing settlement update info. |

**Request Body**

- (object)
  - participants (array) (optional)
    - (object)
      - id (integer) (optional) Participant Id
      - accounts (array) (optional)
        - (object)
          - id (integer) (optional) Participant Currency Id
          - reason (string) (optional)
          - state (string) (optional)

#### Response: 200 OK

Settlements updated.

**Schema**

- (object)
  - id (integer) (optional)
  - state (string) (optional)
  - settlementWindows (array) (optional)
    - (array)
      - (object)
        - id (integer)
        - reason (string) (optional)
        - state (string)
        - createdDate (string)
        - changedDate (string) (optional)
  - participants (array) (optional)
    - (object)
      - id (integer) (optional)
      - accounts (array) (optional)
        - (object)
          - id (integer) (optional) Paricipant Currency Id
          - reason (string) (optional) TBD
          - state (string) (optional)
          - netSettlementAmount (object) (optional)
            - amount (number) (optional)
            - currency (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A

### PUT /settlements/{settlementId}/participants/{participantId}

**Parameters**

| in   | name          | type    | required | description                                      |
|------|---------------|---------|----------|--------------------------------------------------|
| path | settlementId  | integer | true     | A valid Settlement Id.                           |
| path | participantId | integer | true     | A valid Participant Id.                          |
| body | payload       |         | true     | A JSON object containing settlement update info. |

**Request Body**

- (object)
  - accounts (array) (optional)
    - (object)
      - id (integer) (optional) Participant Currency Id
      - reason (string) (optional)
      - state (string) (optional)

#### Response: 200 OK

Settlements updated.

**Schema**

- (object)
  - id (integer) (optional)
  - state (string) (optional)
  - settlementWindows (array) (optional)
    - (array)
      - (object)
        - id (integer)
        - reason (string) (optional)
        - state (string)
        - createdDate (string)
        - changedDate (string) (optional)
  - participants (array) (optional)
    - (object)
      - id (integer) (optional)
      - accounts (array) (optional)
        - (object)
          - id (integer) (optional) Paricipant Currency Id
          - reason (string) (optional) TBD
          - state (string) (optional)
          - netSettlementAmount (object) (optional)
            - amount (number) (optional)
            - currency (string) (optional)

#### Response: 400 Bad Request

Bad request.

**Schema**

N/A

#### Response: 401 Unauthorized

Authorisation information is missing or invalid.

**Schema**

N/A

#### Response: 404 Not Found

No data found.

**Schema**

N/A

#### Response: 415 Unsupported Media Type

Unsupported Media Type.

**Schema**

N/A

#### Response: default

Unexpected error

**Schema**

N/A
