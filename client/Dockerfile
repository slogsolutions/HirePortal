FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

# ✅ Build-time env
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

# 🔥 FIXED INSTALL (stable)
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build


FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80