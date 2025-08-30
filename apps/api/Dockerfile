# Multi-stage Dockerfile for LifeBox API
FROM node:20-alpine AS base
# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY libs/database/package*.json ./libs/database/
COPY libs/shared/package*.json ./libs/shared/

# Install dependencies (cache this layer) - skip scripts to avoid husky issues
RUN NODE_ENV=production npm install --ignore-scripts && npm cache clean --force

# Install dev dependencies in separate stage for better caching
FROM base AS dev-deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY libs/database/package*.json ./libs/database/
COPY libs/shared/package*.json ./libs/shared/
RUN npm install --ignore-scripts && npm cache clean --force

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Create scripts directory if it doesn't exist and add postinstall script
RUN mkdir -p apps/api/scripts
COPY apps/api/scripts/postinstall.js apps/api/scripts/postinstall.js

# Generate Prisma client explicitly
RUN cd libs/database && npx prisma generate

# Build the application
RUN cd apps/api && npm run build

# Skip pruning for now to keep all dependencies available

# Development stage
FROM base AS development
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for development
RUN cd libs/database && npm run generate

# Create app user for development
RUN addgroup -g 1001 -S nodejs
RUN adduser -S lifebox -u 1001

# Create directories
RUN mkdir -p uploads reports && chown -R lifebox:nodejs uploads reports
USER lifebox

# Expose port and debug port
EXPOSE 3000 9229

# Development command with debugging
CMD ["npm", "run", "start:debug"]

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper process handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S lifebox -u 1001

# Set working directory
WORKDIR /app

# Copy full node_modules from builder stage (includes all dependencies)
COPY --from=builder --chown=lifebox:nodejs /app/node_modules ./node_modules
# Copy built application
COPY --from=builder --chown=lifebox:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=lifebox:nodejs /app/apps/api/package*.json ./
# Copy the entire libs directory to ensure proper module resolution
COPY --from=builder --chown=lifebox:nodejs /app/libs ./libs
# Ensure Prisma client is available
COPY --from=builder --chown=lifebox:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p uploads reports && chown -R lifebox:nodejs uploads reports

# Switch to non-root user
USER lifebox

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/apps/api/src/main.js"]