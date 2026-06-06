ARG BUILD_FROM=ghcr.io/home-assistant/base:3.21

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
FROM $BUILD_FROM

# Add image labels
LABEL \
  org.opencontainers.image.title="AI Center Assistant" \
  org.opencontainers.image.description="An intelligent, beautiful AI Home Assistant interface driven by Gemini 2.5." \
  org.opencontainers.image.source="https://github.com/inzone1941-afk/AI-Center" \
  org.opencontainers.image.licenses="MIT"

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
