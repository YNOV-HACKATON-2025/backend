ARG NODE_VERSION=node:22-alpine

FROM ${NODE_VERSION} AS builder

ENV NODE_ENV=build
ENV APP_HOME=/home/node/app

USER node
WORKDIR ${APP_HOME}

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build \
    && npm prune --omit=dev \
    && npm cache clean --force

FROM ${NODE_VERSION} AS production

ENV NODE_ENV=production
ENV APP_HOME=/home/node/app

WORKDIR ${APP_HOME}

COPY --from=builder --chown=node:node ${APP_HOME}/package*.json ./
COPY --from=builder --chown=node:node ${APP_HOME}/node_modules ./node_modules
COPY --from=builder --chown=node:node ${APP_HOME}/dist ./src
COPY --from=builder --chown=node:node ${APP_HOME}/.env ./

USER node
EXPOSE 8033
CMD ["node", "src/main.js"]
