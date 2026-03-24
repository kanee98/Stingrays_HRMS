FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY frontend ./frontend
RUN npm run build --workspace stingrays-frontend

FROM node:20-bookworm-slim AS runner
WORKDIR /app/frontend
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=builder /app/frontend ./
EXPOSE 3000
CMD ["npm", "run", "start"]
