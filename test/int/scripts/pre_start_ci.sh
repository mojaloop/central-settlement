#!/bin/sh
mydir="${0%/*}"
sh "$mydir"/cp_migrations_ci.sh

docker-compose --env-file ./test/int/docker/.env -f docker-compose.integration_2.yml up -d --build

sh "$mydir"/wait_for_mysql.sh

# docker-compose -f docker-compose.integration_2.yml down
