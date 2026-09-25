FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

ARG BUILD_REV=2026-09-25-main-copy-base
ENV BUILD_REV=$BUILD_REV

COPY . .

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npm", "start"]
