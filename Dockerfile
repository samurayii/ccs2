FROM node:20-alpine AS builder
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm --registry $NPM_REGISTRY install npm -g

COPY package.json /package.json
COPY _common /_common
RUN npm --registry $NPM_REGISTRY install --omit=optional

COPY src /src
COPY tsconfig.json /tsconfig.json

RUN npm run build

COPY default_config.toml /dist/config.toml

RUN node /dist/app.js --version

FROM node:20-alpine

USER root

ENV NODE_ENV=production
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /central-config-server

ENTRYPOINT [ "node" ]
CMD [ "app.js", "--config", "config.toml" ]

RUN apk add --no-cache git && \
    git version

COPY --from=builder /dist /central-config-server

RUN git version && \
    node --version && \
    npm --version && \
    cd /central-config-server && \
    npm ci && \
    node app.js -v

USER node