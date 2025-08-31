# Multi-stage Dockerfile for LifeBox API
FROM node:20-alpine AS base
# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

# Builder stage - install all dependencies and build
FROM base AS builder
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY libs/database/package*.json ./libs/database/
COPY libs/shared/package*.json ./libs/shared/

# Install all dependencies (including dev dependencies for build)
RUN npm install --ignore-scripts && npm cache clean --force

# Copy source code with proper structure
COPY apps/api ./apps/api
COPY libs ./libs
COPY tsconfig.json ./

# Create scripts directory if it doesn't exist and add postinstall script
RUN mkdir -p apps/api/scripts
COPY apps/api/scripts/postinstall.js apps/api/scripts/postinstall.js

# Generate Prisma client explicitly
RUN cd libs/database && npx prisma generate

# Build the application
RUN cd apps/api && npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper process handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S lifebox -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies only
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY libs/database/package*.json ./libs/database/
COPY libs/shared/package*.json ./libs/shared/

# Install only production dependencies
RUN NODE_ENV=production npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy built application
COPY --from=builder --chown=lifebox:nodejs /app/apps/api/dist ./
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
CMD ["node", "main.js"]