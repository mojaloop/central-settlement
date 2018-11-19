#!/usr/bin/env bash
echo
echo "---------------------------------------------------------------------"
echo "PS_TRANSFERS_RESERVED for PAYER & PAYEE"
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
            \"reason\": \"Transfers recorded for payer & payee\",
            \"state\": \"PS_TRANSFERS_RESERVED\"
          }
        ]
      },
      {
        \"id\": 3,
        \"accounts\": [
          {
            \"id\": 5,
            \"reason\": \"Transfers recorded for payer & payee\",
            \"state\": \"PS_TRANSFERS_RESERVED\"
          }
        ]
      }
    ]
  }'"
echo
echo
echo "Completed Scenario 11-3 - Settlement to PS_TRANSFERS_RESERVED -- Q: Should HMLNS be positive 800?"
echo