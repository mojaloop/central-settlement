#workers number
docker exec -it cs_central-settlement sh -c "WORKERS=1 ./node_modules/.bin/jest --config './jest.integration.config.js' --coverage  --runInBand --testMatch '**/test/int/**/*.(test|spec).js'"
