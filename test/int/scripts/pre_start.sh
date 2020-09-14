#!/bin/sh
mydir="${0%/*}"

docker-compose  -f docker-compose.integration_2.yml up -d
sh "$mydir"/cp_migrations.sh

sh "$mydir"/wait_for_mysql.sh
