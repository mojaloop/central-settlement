# Arguments
ARG NODE_VERSION=lts-alpine

# NOTE: Ensure you set NODE_VERSION Build Argument as follows...
#
#  export NODE_VERSION="$(cat .nvmrc)-alpine" \
#  docker build \
#    --build-arg NODE_VERSION=$NODE_VERSION \
#    -t mojaloop/central-settlement:local \
#    .
#

# Build Image
FROM node:${NODE_VERSION} as builder

WORKDIR /opt/app/

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python3 libtool openssl-dev autoconf automake bash \
    && cd $(npm root -g)/npm \
    && npm install -g node-gyp

COPY package.json package-lock.json* /opt/app/
RUN npm ci

COPY config /opt/app/config
COPY scripts /opt/app/scripts
COPY src /opt/app/src
COPY README.md /opt/app

FROM node:${NODE_VERSION}
WORKDIR /opt/app/

# Create empty log file & link stdout to the application log file
RUN mkdir ./logs && touch ./logs/combined.log
RUN ln -sf /dev/stdout ./logs/combined.log

# Create a non-root user: app-user
RUN adduser -D app-user
USER app-user

COPY --chown=app-user --from=builder /opt/app/ .
RUN npm prune --production

EXPOSE 3007
CMD ["node" "src/handlers/index.js" "h" "--transfersettlement"]
