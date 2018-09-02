FROM mhart/alpine-node:8.9.4

WORKDIR /opt/central-settlement
COPY config /opt/central-settlement/config
COPY src /opt/central-settlement/src
COPY tests /opt/central-settlement/tests
COPY package.json /opt/central-settlement
COPY README.md /opt/central-settlement

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm

RUN npm install --production && \
  npm uninstall -g npm

RUN apk del build-dependencies

EXPOSE 3007
CMD node src/server.js
