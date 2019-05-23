FROM node:10.15.3-alpine

WORKDIR /opt/central-settlement

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true

COPY package.json package-lock.json* /opt/central-settlement/
RUN npm install --production && \
  npm uninstall -g npm

RUN apk del build-dependencies

COPY config /opt/central-settlement/config
COPY src /opt/central-settlement/src
COPY README.md /opt/central-settlement

EXPOSE 3007
CMD node src/server.js
