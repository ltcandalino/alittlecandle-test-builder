# ALittleCandleTestBuilder: website, logins, question banks and pictures in one container.
# Node 26 (current LTS). Database: SQLite in /data by default, or PostgreSQL / MySQL / MariaDB via
# DATABASE_URL (see README.md).

# 1) Install the database drivers. npm is only needed here, not in the finished image.
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# 2) The image that runs: Node, the drivers and the app. No npm/npx/yarn/corepack, and the
#    Alpine packages are upgraded to their latest fixed versions.
FROM node:26-alpine
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-* /root/.npm

ARG APP_VERSION=dev
LABEL org.opencontainers.image.title="ALittleCandleTestBuilder" \
      org.opencontainers.image.version="$APP_VERSION"

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server.js db.js index.html ./

RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

CMD ["node", "--no-warnings", "server.js"]
