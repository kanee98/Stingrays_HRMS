# Use Debian-based image so glibc is present; native @next/swc-linux-x64-gnu and Turbopack work.
# Alpine (musl) causes SWC to fall back to WASM, which does not support turbo.createProject.
FROM node:20-bookworm-slim
WORKDIR /workspace
COPY payroll/frontend/package*.json payroll/frontend/
WORKDIR payroll/frontend
RUN npm install --legacy-peer-deps
COPY payroll/frontend .
COPY hrms-ui/shared ./shared/

# Build args from docker-compose (PUBLIC_HOST) → baked into Next.js at build time
ARG NEXT_PUBLIC_PAYROLL_API_URL=http://localhost:4010
ARG NEXT_PUBLIC_HRMS_URL=http://localhost:3000
ARG NEXT_PUBLIC_EMPLOYEE_UI_URL=http://localhost:3001
ARG NEXT_PUBLIC_PAYROLL_URL=http://localhost:3010
ENV NEXT_PUBLIC_PAYROLL_API_URL=$NEXT_PUBLIC_PAYROLL_API_URL
ENV NEXT_PUBLIC_HRMS_URL=$NEXT_PUBLIC_HRMS_URL
ENV NEXT_PUBLIC_EMPLOYEE_UI_URL=$NEXT_PUBLIC_EMPLOYEE_UI_URL
ENV NEXT_PUBLIC_PAYROLL_URL=$NEXT_PUBLIC_PAYROLL_URL

RUN npm run build
EXPOSE 3010
CMD ["npm", "run", "start"]
