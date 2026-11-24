FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate --schema=prisma/schema.postgres.prisma
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --schema=prisma/schema.postgres.prisma --accept-data-loss && npm start"]