FROM mhart/alpine-node:10.15.1
USER root

WORKDIR /opt/central-settlement
COPY config /opt/central-settlement/config
COPY src /opt/central-settlement/src
COPY test /opt/central-settlement/test
COPY package.json /opt/central-settlement
COPY README.md /opt/central-settlement

# overwrite default.json with integration environment specific config
RUN cp -f /opt/central-settlement/test/integration-config-centralsettlement.json /opt/central-settlement/config/default.json

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true

RUN npm install

RUN npm install -g tape tap-xunit

RUN apk del build-dependencies

EXPOSE 3007
CMD node src/server.js
