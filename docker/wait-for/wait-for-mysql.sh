#!/bin/sh

echo "** STARTUP - Checking for DB connection..."

source /opt/wait-for/wait-for.env

sh /opt/wait-for/wait-for.sh $WAIT_FOR_DB_SERVER -t 240 -- echo "** STARTUP - DB connection successful!"
