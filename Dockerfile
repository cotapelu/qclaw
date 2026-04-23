# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false \
    && npm cache clean --force
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime
WORKDIR /app
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/settings.example.json ./

# Create default agent directory with proper ownership
RUN mkdir -p /home/nodejs/.pi/agent \
    && chown -R nodejs:nodejs /home/nodejs/.pi

VOLUME /home/nodejs/.pi/agent
USER nodejs

# Health check (basic - checks if process responds to SIGTERM)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

CMD ["node", "dist/index.js"]