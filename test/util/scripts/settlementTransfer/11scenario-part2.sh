#!/usr/bin/env bash
echo "---------------------------------------------------------------------"
echo "Starting script to populate test transfers"
echo "---------------------------------------------------------------------"
echo

CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi

echo "Loading env vars..."
source $CWD/env.sh

echo
echo "---------------------------------------------------------------------"
echo "Settle only PAYEE's account, but SETTLEMENT is SETTLED"
echo "---------------------------------------------------------------------"
sh -c "curl -X PUT \
  http://localhost:3007/v1/settlements/1 \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: 7d78bd18-2614-494a-9860-4236564df1c6' \
  -d '{
    \"participants\": [
      {
        \"id\": 2,
        \"accounts\": [
          {
            \"id\": 3,
            \"reason\": \"test settlement transfer\",
            \"state\": \"SETTLED\"
          }
        ]
      }
    ]
  }'"
echo
echo
echo "Completed Scenario 11-2 - Settlement transfer prepare & commit"
echo