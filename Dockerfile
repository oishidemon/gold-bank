FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci
COPY apps/api apps/api
RUN npm run build

FROM node:22-alpine
WORKDIR /app
# version shown by GET /api/version and in the page footer; set by CI (git tag)
ARG APP_VERSION=dev
ENV NODE_ENV=production APP_VERSION=$APP_VERSION
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev \
 && npm cache clean --force \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/web apps/web
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
