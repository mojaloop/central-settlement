FROM node:16.15.0-alpine
USER root

WORKDIR /opt/app

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 libtool autoconf automake wget \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g tape tap-xunit

COPY package.json package-lock.json* /opt/app/
RUN npm install

RUN apk del build-dependencies

COPY config /opt/app/config
COPY src /opt/app/src
COPY test /opt/app/test
COPY README.md /opt/app

# Start - TigerBeetle

COPY tigerbeetle /opt/app
RUN chmod 777 /opt/app/tigerbeetle
# TigerBeetle LSM:
# RUN /opt/app/tigerbeetle format --cluster=1 --replica=0 /opt/app/1_0.tigerbeetle
# RUN /opt/app/tigerbeetle start --addresses=5001 /opt/app/1_0.tigerbeetle &
# TigerBeetle:
RUN /opt/app/tigerbeetle init --cluster=1 --replica=0 --directory=.
# ./tigerbeetle start --cluster=1 --replica=0 --directory=. --addresses=3001

# DEBUG
# RUN ps -ef
# DEBUG

# End - TigerBeetle

# overwrite default.json with integration environment specific config
RUN cp -f /opt/app/test/integration-config-centralsettlement.json /opt/app/config/default.json

EXPOSE 3007
CMD node src/api/index.js
