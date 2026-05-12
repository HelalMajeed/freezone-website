FROM node:20-bookworm-slim AS builder
# Monorepo root deploy: --build-arg SERVICE_PATH=freezone-api (see repo root fly.toml).
# Subdir deploy (Docker context = freezone-api): default SERVICE_PATH=.
ARG SERVICE_PATH=.
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY ${SERVICE_PATH}/package.json ${SERVICE_PATH}/package-lock.json ./
COPY ${SERVICE_PATH}/prisma ./prisma
RUN npm ci
COPY ${SERVICE_PATH}/tsconfig.json ./
COPY ${SERVICE_PATH}/src ./src
COPY ${SERVICE_PATH}/docker-entrypoint.sh ./docker-entrypoint.sh
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/docker-entrypoint.sh /docker-entrypoint.sh
# Windows CRLF in shell scripts breaks shebang (ENOENT); normalize line endings.
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
