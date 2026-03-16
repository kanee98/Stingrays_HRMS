# Stage 1: load full repo context
FROM alpine AS repo
WORKDIR /repo
COPY . .

# Stage 2: build the app
FROM node:20-alpine
WORKDIR /app
COPY --from=repo /repo/super-admin/frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY --from=repo /repo/super-admin/frontend/ ./

ARG NEXT_PUBLIC_SUPER_ADMIN_API_URL=http://localhost:4020
ENV NEXT_PUBLIC_SUPER_ADMIN_API_URL=$NEXT_PUBLIC_SUPER_ADMIN_API_URL
ENV SUPER_ADMIN_API_INTERNAL_URL=http://super-admin-api:4020
ENV PORT=3020

RUN npm run build
EXPOSE 3020
CMD ["npm", "start"]
