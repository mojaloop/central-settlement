#!/usr/bin/env bash
CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi

echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
echo "---------------------------------------------------------------------"
echo "PS_TRANSFERS_COMMITTED for PAYER & PAYEE"
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
            \"reason\": \"Transfers committed for payer & payee\",
            \"state\": \"PS_TRANSFERS_COMMITTED\"
          }
        ]
      },
      {
        \"id\": 3,
        \"accounts\": [
          {
            \"id\": 5,
            \"reason\": \"Transfers committed for payer & payee\",
            \"state\": \"PS_TRANSFERS_COMMITTED\"
          }
        ]
      }
    ]
  }'"
echo
echo
echo "Completed Scenario 11-4 - Settlement to PS_TRANSFERS_COMMITTED"
echo

sh $CWD/21scenario-part4-results.sh
