FROM node:12.16.0-alpine
USER root

WORKDIR /opt/central-settlement

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g tape tap-xunit

COPY package.json package-lock.json* /opt/central-settlement/
RUN npm install

RUN apk del build-dependencies

COPY config /opt/central-settlement/config
COPY src /opt/central-settlement/src
COPY test /opt/central-settlement/test
COPY README.md /opt/central-settlement

# overwrite default.json with integration environment specific config
RUN cp -f /opt/central-settlement/test/integration-config-centralsettlement.json /opt/central-settlement/config/default.json

EXPOSE 3007
CMD node src/server.js
