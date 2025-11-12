FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (without cache to avoid lock issues)
RUN npm ci --no-cache

# Copy source code (no cache to ensure latest code)
COPY --chown=node:node . .

# Build TypeScript
RUN npm run build

# Platform (Railway/Render/Cloud Run) sets PORT automatically via environment variable
# Our server reads PORT from process.env, so no need to expose

# Start server - Platform will set PORT automatically
CMD ["node", "dist/api/index.js"]

