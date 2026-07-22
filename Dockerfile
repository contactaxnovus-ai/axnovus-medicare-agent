FROM node:20-alpine

WORKDIR /app

COPY app.js .
COPY index.html .
COPY package.json .
COPY server.example.js .
COPY styles.css .
COPY config ./config
COPY js ./js

ENV NODE_ENV=production
ENV PORT=4173

EXPOSE 4173

CMD ["node", "server.example.js"]
