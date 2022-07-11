FROM node:16.15.0-alpine as builder
USER root

WORKDIR /opt/app/

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp

COPY package.json package-lock.json* /opt/app/
RUN npm ci

COPY config /opt/app/config
COPY scripts /opt/app/scripts
COPY src /opt/app/src
COPY README.md /opt/app
FROM node:16.15.0-alpine
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
