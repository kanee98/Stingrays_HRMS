FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . ./

ARG NEXT_PUBLIC_SUPER_ADMIN_API_URL=http://localhost:4020
ENV NEXT_PUBLIC_SUPER_ADMIN_API_URL=$NEXT_PUBLIC_SUPER_ADMIN_API_URL
ENV SUPER_ADMIN_API_INTERNAL_URL=http://super-admin-api:4020
ENV PORT=3020

RUN npm run build
EXPOSE 3020
CMD ["npm", "start"]
