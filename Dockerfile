FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (without cache to avoid lock issues)
RUN npm ci --no-cache

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Railway sets PORT automatically - don't hardcode it
# EXPOSE is just documentation, Railway will use its own port

# Start server
# Railway will set PORT environment variable automatically
CMD ["node", "dist/api/index.js"]

