# Contexte de build = racine du monorepo :
#   docker build -f apps/api/Dockerfile -t devsync-api .
# (avec wslc : wslc build -f apps/api/Dockerfile -t devsync-api .)

FROM node:24-alpine AS builder
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @devsync/api...
RUN pnpm --filter @devsync/api db:generate \
 && pnpm --filter @devsync/api build \
 && pnpm --filter @devsync/api deploy --prod --legacy /out

# Cible one-shot : applique les migrations (outillage prisma, dev deps incluses).
FROM builder AS migrate
CMD ["pnpm", "--filter", "@devsync/api", "db:deploy"]

# Runtime : bundle dist/server.js + dépendances de production uniquement.
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /out/package.json /out/node_modules ./
COPY --from=builder --chown=node:node /out/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
