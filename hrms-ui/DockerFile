FROM node:20-alpine
WORKDIR /workspace
COPY hrms-ui/package*.json hrms-ui/
WORKDIR hrms-ui
RUN npm install --legacy-peer-deps
COPY hrms-ui .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
