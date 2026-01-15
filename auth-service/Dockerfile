FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build || true
EXPOSE 4000
CMD ["npx", "ts-node-dev", "src/index.ts"]