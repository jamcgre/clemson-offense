FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

COPY client client
COPY server server
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
