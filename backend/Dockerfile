# ==========================================
# Builder Stage: Install & compile dependencies
# ==========================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install compilation tools needed for native node modules (e.g. bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# ==========================================
# Production Stage: Lightweight runtime
# ==========================================
FROM node:20-bookworm-slim

WORKDIR /app

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy built node_modules from builder and source code
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node . .

# Environment configuration
ENV NODE_ENV=production
ENV PORT=5000

# Run container as non-root node user
USER node

EXPOSE 5000

# Health check to ensure server is serving traffic
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
