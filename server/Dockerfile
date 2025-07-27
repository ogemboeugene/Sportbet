# Multi-stage build for production optimization
FROM node:18-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development dependencies stage
FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

# Build stage
FROM dev-deps AS build
COPY . .
RUN npm run build

# Production stage
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Copy configuration files
COPY --chown=nestjs:nodejs ecosystem.config.js ./
COPY --chown=nestjs:nodejs config/ ./config/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV UV_THREADPOOL_SIZE=4
ENV NODE_OPTIONS="--max-old-space-size=512 --gc-interval=100"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node dist/health-check.js || exit 1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nestjs

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application with PM2 in production
CMD ["npm", "run", "start:prod"]
