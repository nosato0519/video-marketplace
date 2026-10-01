FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend ./backend
COPY app ./app

ENV NODE_ENV=production
EXPOSE 10000

CMD ["node", "backend/src/server.js"]
