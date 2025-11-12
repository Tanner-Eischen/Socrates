FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (without cache to avoid lock issues)
RUN npm ci --no-cache

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build
# Build timestamp: 2025-01-12

# Platform (Railway/Render/Cloud Run) sets PORT automatically via environment variable
# Our server reads PORT from process.env, so no need to expose

# Start server - Platform will set PORT automatically
CMD ["node", "dist/api/index.js"]

