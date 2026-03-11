# Multi-stage build for FikraHub
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Upgrade npm to avoid E400 registry errors with older npm versions
RUN npm install -g npm@latest

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage — use Debian slim for LibreOffice support
FROM node:20-slim

WORKDIR /app

# Install LibreOffice for PPTX→PDF conversion (no Google Drive needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-impress \
    libreoffice-writer \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Upgrade npm to avoid E400 registry errors with older npm versions
RUN npm install -g npm@latest

# Install all dependencies (needed because bundled code references dev dependencies)
RUN npm ci

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Ensure templates copied into image for production
COPY server/email-templates /app/dist/email-templates

# Expose port (Cloud Run sets this to 8080)
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the application
CMD ["npm", "start"]
