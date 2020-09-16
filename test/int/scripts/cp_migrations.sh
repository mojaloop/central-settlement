mkdir -p ./migrations ./seeds
rm -rf ./migrations/* ./seeds/*
docker_id=$(docker ps -aq -f name=cl_int)
if ! [ docker_id ]
then
  docker_id=$(docker create  --name	cl_int mojaloop/central-ledger:latest)
fi
docker cp $docker_id:/opt/central-ledger/migrations ./
docker cp $docker_id:/opt/central-ledger/seeds ./
