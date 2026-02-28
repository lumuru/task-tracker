# Stage 1: Build the React frontend
FROM node:20-alpine AS build

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine

# Install build tools needed for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

# Copy server source
COPY server/src/ ./server/src/

# Copy built frontend from build stage
COPY --from=build /app/client/dist ./client/dist

# Create data directory for SQLite
RUN mkdir -p server/data

EXPOSE 3001

CMD ["node", "server/src/index.js"]
