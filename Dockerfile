FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm ci && npm --prefix server ci && npm --prefix client ci

COPY server ./server
COPY client ./client

RUN npm --prefix server run build && npm --prefix client run build

FROM node:24-alpine AS runner
WORKDIR /app

COPY server/package*.json ./server/
RUN npm --prefix server ci --omit=dev && npm cache clean --force

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/server/uploads /app/server/data && chown -R node:node /app

USER node
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.js"]
