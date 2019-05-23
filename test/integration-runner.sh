#!/bin/bash

>&2 echo "--==== Integration Tests Runner ====--"

if [ $# -ne 1 ]; then
  echo ""
  echo "Usage: $0 {env-file}"
  echo "{env-file} must contain the following variables:"
  echo " - DOCKER_IMAGE: Name of Image"
  echo " - DOCKER_TAG: Tag/Version of Image"
  echo " - DOCKER_FILE: Recipe to be used for Docker build"
  echo " - DOCKER_WORKING_DIR: Docker working directory"
  echo " - DB_USER: Database user"
  echo " - DB_PASSWORD: Database password"
  echo " - DB_HOST: Database host name"
  echo " - DB_PORT: Database container port"
  echo " - DB_NAME: Database database"
  echo " - DB_IMAGE: Docker Image for Database"
  echo " - DB_TAG: Docker tag/version for Database"
  echo " - KAFKA_IMAGE: Kafka image:tag"
  echo " - KAFKA_HOST: Kafka host"
  echo " - KAFKA_ZOO_PORT: Kafka host name"
  echo " - KAFKA_BROKER_PORT: Kafka container port"
  echo " - APP_HOST: Application host name"
  echo " - APP_PORT: Application port"
  echo " - APP_DIR_TEST_INTEGRATION: Location of the integration tests relative to the working directory"
  echo " - APP_DIR_TEST_RESULTS: Location of test results relative to the working directory"
  echo " - TEST_DIR: Base directory for tests"
  echo " - TEST_RESULTS_FILE: Name of integration test results xml file"
  echo " - TEST_CMD: Integration test command to be executed"
  echo " - SIMULATOR_HOST: Simulator host name"
  echo " - SIMULATOR_PORT: Simulator port"
  echo " - SIMULATOR_IMAGE: Simulator image"
  echo " - SIMULATOR_IMAGE_TAG: Simulator tag"
  echo " - CENTRAL_LEDGER_HOST: central-ledger host name"
  echo " - CENTRAL_LEDGER_PORT: central-ledger port"
  echo " - CENTRAL_LEDGER_IMAGE: central-ledger image"
  echo " - CENTRAL_LEDGER_TAG: central-ledger tag"
  echo " - ML_API_ADAPTER_HOST: ml-api-adapter host"
  echo " - ML_API_ADAPTER_PORT: ml-api-adapter port"
  echo " - ML_API_ADAPTER_IMAGE: ml-api-adapter image"
  echo " - ML_API_ADAPTER_TAG: ml-api-adapter tag"
  echo ""
  exit 1
fi
>&2 echo ""
>&2 echo "====== Loading environment variables ======"
cat $1
. $1
>&2 echo "==========================================="
>&2 echo ""

>&2 echo "Executing Integration Tests for $APP_HOST ..."

>&2 echo "Creating local directory to store test results"
mkdir -p $TEST_DIR/results

# Generic functions

stop_docker() {
  >&1 echo "Kafka is shutting down $KAFKA_HOST"
  (docker stop $KAFKA_HOST && docker rm $KAFKA_HOST) > /dev/null 2>&1
  >&1 echo "$SIMULATOR_HOST environment is shutting down"
  (docker stop $SIMULATOR_HOST && docker rm $SIMULATOR_HOST) > /dev/null 2>&1
  >&1 echo "$CENTRAL_LEDGER_HOST environment is shutting down"
  (docker stop $CENTRAL_LEDGER_HOST && docker rm $CENTRAL_LEDGER_HOST) > /dev/null 2>&1
  >&1 echo "$ML_API_ADAPTER_HOST environment is shutting down"
  (docker stop $ML_API_ADAPTER_HOST && docker rm $ML_API_ADAPTER_HOST) > /dev/null 2>&1
  >&1 echo "$DB_HOST environment is shutting down"
  (docker stop $DB_HOST && docker rm $DB_HOST) > /dev/null 2>&1
  >&1 echo "$APP_HOST environment is shutting down"
  (docker stop $APP_HOST && docker rm $APP_HOST) > /dev/null 2>&1
  >&1 echo "Deleting test network: $DOCKER_NETWORK"
  docker network rm $DOCKER_NETWORK
}

clean_docker() {
  stop_docker
}

fcmd_centralledger() {
  docker run -i --rm \
    --link $KAFKA_HOST \
    --link $DB_HOST \
    --network $DOCKER_NETWORK \
    --env HOST_IP="$APP_HOST" \
    --env CLEDG_DATABASE_URI="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    $CENTRAL_LEDGER_IMAGE:$CENTRAL_LEDGER_TAG \
    /bin/sh \
    -c "$@"
}

run_test_command() {
  >&2 echo "Running $APP_HOST Test command: $TEST_CMD"
  docker run -it \
    --link $KAFKA_HOST \
    --link $DB_HOST \
    --network $DOCKER_NETWORK \
    --name $APP_HOST \
    --env HOST_IP="$APP_HOST" \
    --env TEST_DIR=$TEST_DIR \
    --env CSET_DATABASE_URI="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    --env SIMULATOR_HOST=$SIMULATOR_HOST \
    --env SIMULATOR_PORT=$SIMULATOR_PORT \
    --env SIMULATOR_REMOTE_HOST=$SIMULATOR_REMOTE_HOST \
    --env SIMULATOR_REMOTE_PORT=$SIMULATOR_REMOTE_PORT \
    --env CENTRAL_LEDGER_HOST=$CENTRAL_LEDGER_HOST \
    --env CENTRAL_LEDGER_PORT=$CENTRAL_LEDGER_PORT \
    --env ML_API_ADAPTER_HOST=$ML_API_ADAPTER_HOST \
    --env ML_API_ADAPTER_PORT=$ML_API_ADAPTER_PORT \
    $DOCKER_IMAGE:$DOCKER_TAG \
    /bin/sh \
    -c "$TEST_CMD"
}

fcurl() {
  docker run --rm -i \
    --network $DOCKER_NETWORK \
    --entrypoint curl \
    "jlekie/curl:latest" \
    --silent --head --fail \
    "$@"
}

# Kafka functions

start_kafka() {
  echo "docker run -td -i -p $KAFKA_ZOO_PORT:$KAFKA_ZOO_PORT -p $KAFKA_BROKER_PORT:$KAFKA_BROKER_PORT --name=$KAFKA_HOST --env ADVERTISED_HOST=$KAFKA_HOST --env ADVERTISED_PORT=$KAFKA_BROKER_PORT --env CONSUMER_THREADS=1 --env TOPICS=my-topic,some-other-topic --env ZK_CONNECT=kafka7zookeeper:2181/root/path --env GROUP_ID=mymirror $KAFKA_IMAGE"
  docker run -td -i \
    -p $KAFKA_ZOO_PORT:$KAFKA_ZOO_PORT \
    -p $KAFKA_BROKER_PORT:$KAFKA_BROKER_PORT \
    --network $DOCKER_NETWORK \
    --name=$KAFKA_HOST \
    --env ADVERTISED_HOST=$KAFKA_HOST \
    --env ADVERTISED_PORT=$KAFKA_BROKER_PORT \
    --env CONSUMER_THREADS=1 \
    --env TOPICS=my-topic,some-other-topic \
    --env ZK_CONNECT=kafka7zookeeper:2181/root/path \
    --env GROUP_ID=mymirror \
    $KAFKA_IMAGE
}

fkafka() {
  >&2 echo "fkafka()"
	docker run --rm -i \
	  --link $KAFKA_HOST \
	  --network $DOCKER_NETWORK \
	  --env KAFKA_HOST="$KAFKA_HOST" \
      --env KAFKA_ZOO_PORT="$KAFKA_ZOO_PORT" \
	  taion809/kafka-cli \
	  /bin/sh \
	  -c \
		"$@"
}

is_kafka_up() {
  fkafka 'kafka-topics.sh --list --zookeeper $KAFKA_HOST:$KAFKA_ZOO_PORT' > /dev/null 2>&1
}

# DB functions

start_db() {
  docker run -td \
    -p $DB_PORT:$DB_PORT \
    --name $DB_HOST \
    --network $DOCKER_NETWORK \
    -e MYSQL_USER=$DB_USER \
    -e MYSQL_PASSWORD=$DB_PASSWORD \
    -e MYSQL_DATABASE=$DB_NAME \
    -e MYSQL_ALLOW_EMPTY_PASSWORD=true \
    $DB_IMAGE:$DB_TAG
}

fdb() {
  docker run -it --rm \
    --link $DB_HOST:mysql \
    --network $DOCKER_NETWORK \
    -e DB_HOST=$DB_HOST \
    -e DB_PORT=$DB_PORT \
    -e DB_PASSWORD=$DB_PASSWORD \
    -e DB_USER=$DB_USER \
    -e DB_NAME=$DB_NAME \
    mysql \
    sh -c \
    "$@"
}

is_db_up() {
  fdb 'mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "select 1"' > /dev/null 2>&1
}

# Mojaloop services

start_simulator () {
  docker run --rm -td \
    -p 8444:8444 \
    --network $DOCKER_NETWORK \
    --name=$SIMULATOR_HOST \
    --env TRANSFERS_ENDPOINT=http://${ML_API_ADAPTER_HOST}:3000 \
    $SIMULATOR_IMAGE:$SIMULATOR_IMAGE_TAG
}

is_simulator_up() {
  fcurl "http://${SIMULATOR_HOST}:8444/health?"
}

start_central_ledger () {
  docker run --rm -td \
    -p 3001:3001 \
    --network $DOCKER_NETWORK \
    --name=$CENTRAL_LEDGER_HOST \
    --volume ${PWD}/test/integration-config-centralledger.json:/opt/central-ledger/config/default.json \
    --env CLEDG_DATABASE_URI="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    $CENTRAL_LEDGER_IMAGE:$CENTRAL_LEDGER_TAG
}

is_central_ledger_up() {
  fcurl "http://${CENTRAL_LEDGER_HOST}:3001/health?"
}

start_ml_api_adapter () {
  docker run --rm -td \
    -p 3000:3000 \
    --network $DOCKER_NETWORK \
    --name=$ML_API_ADAPTER_HOST \
    --volume ${PWD}/test/integration-config-mlapiadapter.json:/opt/ml-api-adapter/config/default.json \
    $ML_API_ADAPTER_IMAGE:$ML_API_ADAPTER_TAG
}

is_ml_api_adapter_up() {
  fcurl "http://${ML_API_ADAPTER_HOST}:3000/health?"
}

# Script execution

>&1 echo "Building Docker Image $DOCKER_IMAGE:$DOCKER_TAG with $DOCKER_FILE"
docker build --cache-from $DOCKER_IMAGE:$DOCKER_TAG -t $DOCKER_IMAGE:$DOCKER_TAG -f $DOCKER_FILE .

if [ "$?" != 0 ]
then
  >&2 echo "Build failed...exiting"
  clean_docker
  exit 1
fi

>&1 echo "Creating test network: $DOCKER_NETWORK"
docker network create $DOCKER_NETWORK

>&1 echo "Kafka is starting"
start_kafka

if [ "$?" != 0 ]
then
  >&2 echo "Starting Kafka failed...exiting"
  clean_docker
  exit 1
fi

>&1 echo "Waiting for Kafka to start"
until is_kafka_up; do
  >&1 printf "."
  sleep 5
done

>&1 echo "DB is starting"
start_db

if [ "$?" != 0 ]
then
  >&2 echo "Starting DB failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Waiting for DB to start"
until is_db_up; do
  >&2 printf "."
  sleep 5
done

>&1 echo "Running migrations"
fcmd_centralledger "apk add --no-cache nodejs-npm && npm install npm-run-all && npm run migrate"

if [ "$?" != 0 ]
then
  >&2 echo "Migration failed...exiting"
  clean_docker
  exit 1
fi

>&1 echo "Simulator is starting"
start_simulator

if [ "$?" != 0 ]
then
  >&2 echo "Starting Simulator failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Waiting for Simulator to start"
until is_simulator_up; do
  >&2 printf "."
  sleep 5
done

>&1 echo "Central-ledger is starting"
start_central_ledger

if [ "$?" != 0 ]
then
  >&2 echo "Starting Central-ledger failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Waiting for Central-ledger to start"
until is_central_ledger_up; do
  >&2 printf "."
  sleep 5
done

>&1 echo "Ml-api-adapter is starting"
start_ml_api_adapter

if [ "$?" != 0 ]
then
  >&2 echo "Starting Ml-api-adapter failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Waiting for Ml-api-adapter to start"
until is_ml_api_adapter_up; do
  >&2 printf "."
  sleep 5
done

>&1 echo "Integration tests are starting"
run_test_command
test_exit_code=$?
>&2 echo "Test exited with result code.... $test_exit_code ..."

>&1 echo "Displaying test logs"
docker logs $APP_HOST

>&1 echo "Copy results to local directory"
docker cp $APP_HOST:$DOCKER_WORKING_DIR/$APP_DIR_TEST_RESULTS $TEST_DIR

if [ "$test_exit_code" == 0 ]
then
  >&1 echo "Showing results..."
  cat $APP_DIR_TEST_RESULTS/$TEST_RESULTS_FILE
else
  >&2 echo "Integration tests failed...exiting"
  >&2 echo "Test environment logs..."
  docker logs $APP_HOST
fi

clean_docker
>&1 echo "Integration tests exited with code: $test_exit_code"
exit "$test_exit_code"