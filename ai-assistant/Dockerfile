# ==========================================
# STAGE 1: Build the Vite React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Copy dependency files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY index.html vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Build production bundle
RUN npm run build

# ==========================================
# STAGE 2: Create the Final Add-on Image
# ==========================================
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.21
FROM $BUILD_FROM

# Install Node.js, npm, and jq (required for reading configuration options)
RUN apk add --no-cache nodejs npm jq

# Create application directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy backend server code and built frontend assets
COPY server.js ./
COPY --from=frontend-builder /build/dist ./dist

# Copy entrypoint script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Run startup script
CMD [ "/run.sh" ]
