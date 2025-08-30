# Multi-stage Dockerfile for LifeBox MQTT Ingestion Service
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/mqtt-ingestion/package*.json ./apps/mqtt-ingestion/
COPY libs/shared/package*.json ./libs/shared/

# Install all dependencies (including dev dependencies for building)
RUN npm install

# Copy source code
COPY apps/mqtt-ingestion ./apps/mqtt-ingestion
COPY libs/shared ./libs/shared

# Build the application
RUN cd apps/mqtt-ingestion && npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper process handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S lifebox -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=lifebox:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=lifebox:nodejs /app/apps/mqtt-ingestion/dist ./dist
COPY --from=builder --chown=lifebox:nodejs /app/apps/mqtt-ingestion/package*.json ./

# Switch to non-root user
USER lifebox

# Health check (simple process check)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep -f "node.*dist/index.js" || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]