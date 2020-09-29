#!/bin/sh
mydir="${0%/*}"
sh "$mydir"/cp_migrations_ci.sh
if [ ! -z  "$CIRCLE_PROJECT_REPONAME" ]
then
  docker-compose -p $CIRCLE_PROJECT_REPONAME --env-file ./test/int/docker/.env -f docker-compose.integration_2.yml up -d --build
else
  docker-compose --env-file ./test/int/docker/.env -f docker-compose.integration_2.yml up -d --build
fi

sh "$mydir"/wait_for_mysql.sh

# docker-compose -f docker-compose.integration_2.yml down
# https://blog.jondh.me.uk/2018/04/strategies-for-docker-layer-caching-in-circleci/
