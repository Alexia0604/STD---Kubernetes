FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

FROM node:18-alpine

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/index.js ./
COPY --from=build /app/package.json ./
COPY --from=build /app/.env* ./

EXPOSE 5001
CMD ["node", "index.js"]