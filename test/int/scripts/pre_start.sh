#!/bin/sh
mydir="${0%/*}"

sh "$mydir"/cp_migrations.sh
docker-compose  -f docker-compose.integration_2.yml up --build -d mysql kafka

sh "$mydir"/wait_for_mysql.sh

# docker-compose -f docker-compose.integration_2.yml down
