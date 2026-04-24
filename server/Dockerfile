# ---------- 1. Base Image ----------
FROM node:20-alpine

# ---------- 2. Set Working Directory ----------
WORKDIR /app

# ---------- 3. Copy package files ----------
COPY package*.json ./

# ---------- 4. Install ONLY production deps ----------
RUN npm install

# ---------- 5. Copy remaining files ----------
COPY . .

# ---------- 6. Set environment ----------
ENV NODE_ENV=production
ENV PORT=3001

# ---------- 7. Expose port ----------
EXPOSE 3001

# ---------- 8. Start app ----------
CMD ["npm", "start"]