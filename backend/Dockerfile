FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY backend ./backend
RUN npm run build --workspace stingrays-backend

FROM node:20-bookworm-slim AS runner
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=4000
ENV BACKEND_PORT=4000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./package.json
RUN mkdir -p /app/backend/dist/modules/onboarding/uploads
EXPOSE 4000
CMD ["node", "dist/index.js"]
