FROM node:20-alpine
WORKDIR /workspace
COPY payroll/frontend/package*.json payroll/frontend/
WORKDIR payroll/frontend
RUN npm install --legacy-peer-deps
COPY payroll/frontend .
COPY hrms-ui/shared ./shared/
RUN npm run build
EXPOSE 3010
CMD ["npm", "run", "start"]
