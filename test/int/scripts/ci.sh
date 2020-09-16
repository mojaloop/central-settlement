#workers number
docker exec -it cs_central-settlement sh -c "npm run test:coverage"

docker exec -it cs_central-settlement sh -c "npm run test:int:new:series:run"


docker exec -it cs_central-settlement sh -c "npm run test:coverage:combined:check"


docker-compose -f docker-compose.integration_2.yml stop
