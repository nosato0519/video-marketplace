FROM node:22-bookworm-slim

WORKDIR /app

COPY backend/package.json ./backend/package.json
RUN cd backend && npm install --omit=dev

COPY backend ./backend
COPY index.html styles.css ./
COPY pages ./pages
COPY seller ./seller
COPY app ./app
COPY shared ./shared
COPY locales ./locales

ENV PORT=10000
EXPOSE 10000

CMD ["node", "backend/src/server.js"]
