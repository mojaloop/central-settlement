# Arguments
ARG NODE_VERSION="24.18.0-alpine3.24"
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
RUN apk add --no-cache -t build-dependencies \
    autoconf automake bash g++ gcc libtool make openssl-dev py3-setuptools python3

COPY package.json package-lock.json* /opt/app/
# Lifecycle scripts are skipped for supply-chain safety (docker:S6505); node-rdkafka
# is the only production dependency that needs its native build, so run it explicitly.
# node-gyp ships with npm, so there is no separate unpinned global install (docker:S8543).
# Dev dependencies are omitted here rather than pruned from the runtime image: `npm prune`
# re-extracts node-rdkafka and would throw away the native build made just above.
RUN npm ci --omit=dev --ignore-scripts
RUN npm rebuild node-rdkafka

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

EXPOSE 3007
CMD ["node" "src/handlers/index.js" "h" "--transfersettlement"]
