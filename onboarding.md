# Onboarding

>*Note:* Before completing this guide, make sure you have completed the _general_ onboarding guide in the [base mojaloop repository](https://github.com/mojaloop/mojaloop/blob/master/onboarding.md#mojaloop-onboarding).

## Contents

<!-- vscode-markdown-toc -->
1. [Prerequisites](#Prerequisites)
2. [Installing and Building](#InstallingandBuilding)
3. [Running Locally](#RunningLocally)
4. [Running Inside Docker](#RunningInsideDocker)
5. [Testing](#Testing)
6. [Common Errors/FAQs](#CommonErrorsFAQs)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

#  1. <a name='Prerequisites'></a>Prerequisites

If you have followed the [general onboarding guide](https://github.com/mojaloop/mojaloop/blob/master/onboarding.md#mojaloop-onboarding), you should already have the following cli tools installed:

* `brew` (macOS), [todo: windows package manager]
* `curl`, `wget`
* `docker` + `docker-compose`
* `node`, `npm` and (optionally) `nvm`

In addition to the above cli tools, you will need to install the following to build and run the `central-settlement`:


###  1.1. <a name='macOS'></a>macOS
```bash
#none - you have everything you need!
```

###  1.2. <a name='Linux'></a>Linux

[todo]

###  1.3. <a name='Windows'></a>Windows

[todo]


##  2. <a name='InstallingandBuilding'></a>Installing and Building

Firstly, clone your fork of the `central-settlement` onto your local machine:
```bash
git clone https://github.com/<your_username>/central-settlement.git
```

Then `cd` into the directory and install the node modules:
```bash
cd central-settlement
npm install
```

> If you run into problems running `npm install`, make sure to check out the [Common Errors/FAQs](#CommonErrorsFAQs) below.

##  3. <a name='RunningLocally'></a>Running Locally (with dependencies inside of docker)

In this method, we will run core dependencies (`mysql`, `kafka`) inside of docker containers, while running the `central-settlement` server on your local machine.

> Alternatively, you can run the `central-settlement` inside of `docker-compose` with the rest of the dependencies to make the setup a little easier: [Running Inside Docker](#RunningInsideDocker).

**1. Run the dependencies in `docker-compose`:**

```bash
# start the dependencies inside of docker
docker-compose up mysql kafka

```

**3. Configure the default files and run the server**
```bash
# start the server
npm run start
```

Upon running `npm run start`, your output should look similar to:

```bash

> central-settlement@6.2.0 start /<path_to>/central-settlement
> WITH_SASL=0&&LD_LIBRARY_PATH=$PWD/node_modules/node-rdkafka/build/deps&& node app.js

2019-06-03T07:23:27.850Z - info: Connection with database succeeded.
2019-06-03T07:23:27.863Z - info: CreateHandle::connect - creating Consumer for topics: [topic-notification-event]
2019-06-03T07:23:28.116Z - info: CreateHandle::connect - successful connected to topics: [topic-notification-event]
healthcheck is listening on port 3080

```

##  4. <a name='RunningInsideDocker'></a>Running Inside Docker

We use `docker-compose` to manage and run the `central-settlement` along with its dependencies with one command.

>*Note:* Before starting all of the containers however, start the `mysql` container alone, to give it some more time to set up the necessary permissions (this only needs to be done once). This is a short-term workaround because the `central-ledger` (which is a dependency of `central-settlement`) doesn't retry it's connection to MySQL.


**1. First run the mysql container, then run the test of the containers**
```bash
docker-compose up mysql #first time only - the initial mysql load takes a while, and if it's not up in time, the central-ledger will just crash

npm run docker:up
```

This will do the following:
* `docker pull` down any dependencies defined in the `docker-compose.yml` file
* `docker build` the `central-settlement` image based on the `Dockerfile` defined in this repo
* run all of the containers together (`central-ledger`, `ml-api-adapter`, `central-event-processor`, `central-settlement`)


### 4.1 Handy Docker Compose Tips

You can run `docker-compose` in 'detached' mode as follows:

```bash
npm run docker:up -- -d
```

And then attach to the logs with:
```bash
docker-compose logs -f
```

When you're done, don't forget to stop your containers however:
```bash
npm run docker:stop
```

##  5. <a name='Testing'></a>Testing

We use `npm` scripts as a common entrypoint for running the tests.
```bash
# unit tests:
npm run test:unit

# integration tests
npm run test:integration

# check test coverage
npm run test:coverage
```

### 5.1 Testing the `central-settlement` API with Postman

>Note: Make sure you have installed Postman and cloned the `mojaloop/postman` repo, which contains all the required collections and environments. You can find detailed instructions for this in the [general onboarding guide](https://github.com/mojaloop/mojaloop/blob/master/onboarding.md#2-postman).


#### Prerequisites:
* `ml-api-adapter`, `central-ledger`, simulator and mockserver services running (follow the [Running Inside Docker guide](#RunningInsideDocker) to get these services up and running)
* _Optionally_, run `central-timeout` , `cental-event-processor` as well.


#### Running Example Requests

1. Import the **Mojaloop v0.1 draft** collection, and open `API Examples` > `mojaloop v1.0` > `6.a. Transfer Prepare Request`
2. Click **Send**
3. If you get a valid response, continue to the next step, otherwise it reveals an issue in your configuration. 
4. Select the `7.a. Transfer Fulfil Request` and perform a corresponding fulfilment request
5. You can check the database to see the transfer state, status changes, positions and other such information. After this if everything looks good, you should be ready to go.


##  6. <a name='CommonErrorsFAQs'></a>Common Errors/FAQs

#### 6.1 `sodium v1.2.3` can't compile during npm install

Resolved by installing v2.0.3 `npm install sodium@2.0.3`


#### 6.2 `./src/argon2_node.cpp:6:10: fatal error: 'tuple' file not found` 

Resolved by running `CXX='clang++ -std=c++11 -stdlib=libc++' npm rebuild`


#### 6.3 On macOS, `npm install` fails with the following error
```
Undefined symbols for architecture x86_64:
  "_CRYPTO_cleanup_all_ex_data", referenced from:
      _rd_kafka_transport_ssl_term in rdkafka_transport.o
  "_CRYPTO_num_locks", referenced from:
  ........
  ld: symbol(s) not found for architecture x86_64
clang: error: linker command failed with exit code 1 (use -v to see invocation) 
```

Resolved by installing openssl `brew install openssl` and then running: 
  ```bash
  export CFLAGS=-I/usr/local/opt/openssl/include 
  export LDFLAGS=-L/usr/local/opt/openssl/lib 
  npm install
  ``` 
