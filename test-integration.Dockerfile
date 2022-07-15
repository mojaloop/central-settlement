FROM node:16.15.0-alpine
USER root

WORKDIR /opt/app

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 libtool autoconf automake \
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

# overwrite default.json with integration environment specific config
RUN cp -f /opt/app/test/integration-config-centralsettlement.json /opt/app/config/default.json

EXPOSE 3007
CMD node src/api/index.js
