# Stage 1: load full repo context (context must be repo root)
FROM alpine AS repo
WORKDIR /repo
COPY . .

# Stage 2: build the app from repo paths
FROM node:20-alpine
WORKDIR /app
COPY --from=repo /repo/employee-onboarding/frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY --from=repo /repo/employee-onboarding/frontend/ ./
COPY --from=repo /repo/hrms-ui/shared/ ./shared/
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
