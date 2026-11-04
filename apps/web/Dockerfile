# Contexte de build = racine du monorepo :
#   docker build -f apps/web/Dockerfile -t devsync-web .

FROM node:24-alpine AS builder
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @devsync/web...
RUN pnpm --filter @devsync/web build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
