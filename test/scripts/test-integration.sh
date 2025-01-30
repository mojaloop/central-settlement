#!/bin/bash
set -xe

# docker load -i /tmp/docker-image.tar
docker compose up -d
docker compose ps

nvm use default
npm run wait-4-docker

curl localhost:3000/health && npm -s run test:int

docker compose down -v --timeout 30
docker compose -f ./docker-compose.yml up -d
docker compose ps
