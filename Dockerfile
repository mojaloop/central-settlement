FROM node:12.16.1-alpine as builder

WORKDIR /opt/central-settlement

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true

COPY package.json package-lock.json* /opt/central-settlement/

RUN npm ci

COPY config /opt/central-settlement/config
COPY scripts /opt/central-settlement/scripts
COPY src /opt/central-settlement/src
COPY README.md /opt/central-settlement

FROM builder
WORKDIR /opt/central-settlement

# Create empty log file & link stdout to the application log file
RUN mkdir ./logs && touch ./logs/combined.log \
    && ln -sf /dev/stdout ./logs/combined.log \
    && adduser -D ml-user
# Create a non-root user: ml-user
# RUN adduser -D ml-user
USER ml-user

COPY --chown=ml-user --from=builder /opt/central-settlement .
RUN npm prune --production

EXPOSE 3007
CMD ["node" "src/handlers/index.js" "h" "--transfersettlement"]
