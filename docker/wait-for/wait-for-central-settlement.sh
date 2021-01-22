#!/bin/sh

echo "** STARTUP - Checking for Central-Settlement..."

source /opt/wait-for/wait-for.env

sh /opt/wait-for/wait-for-mysql.sh

sh /opt/wait-for/wait-for-kafka.sh

# We need to wait for central-ledger since this runs the migrations etc.
sh /opt/wait-for/wait-for.sh $WAIT_FOR_CENTRAL_LEDGER_SERVER -t 240 -- echo "** STARTUP - central-ledger connection successful!"

echo "** STARTUP - Central-Settlement successful!"
