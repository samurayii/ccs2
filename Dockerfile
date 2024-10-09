FROM registry.tp.sblogistica.ru/curlimages/curl:builder AS curlbuilder
RUN curl -k --location https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_x86_64 --output dumb-init
RUN chmod +x dumb-init

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

ENTRYPOINT [ "/usr/local/bin/dumb-init" ]
CMD [ "node","app.js", "--config", "config.toml" ]

COPY --from=builder /dist /central-config-server
COPY --from=curlbuilder dumb-init /usr/local/bin/dumb-init

RUN apk add --no-cache git git-crypt && \
    git version

RUN chown -R node:node /central-config-server

RUN git version && \
    node --version && \
    npm --version && \
    cd /central-config-server && \
    npm ci && \
    node app.js -v

USER 1000