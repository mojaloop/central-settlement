FROM mhart/alpine-node:8.9.4

WORKDIR /opt/central-settlement
COPY interface /opt/central-settlement/interface
COPY data /opt/central-settlement/data
COPY handlers /opt/central-settlement/handlers
COPY tests /opt/central-settlement/tests
COPY package.json /opt/central-settlement
COPY server.js /opt/central-settlement
COPY README.md /opt/central-settlement

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm

RUN npm install --production && \
  npm uninstall -g npm

RUN apk del build-dependencies

EXPOSE 8080
CMD node server.js
