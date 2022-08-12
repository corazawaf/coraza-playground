FROM node:18.7-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
RUN ls -lh

FROM caddy:latest
COPY --from=build /usr/src/app/dist/web-app /www/
