# Stage 1: Install dependencies
FROM node:25-alpine AS deps

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Stage 2: Copy only necessary files and run app
FROM node:25-alpine

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy application source code
COPY src ./src
COPY seeders ./seeders
COPY migrations ./migrations
COPY config ./config
COPY models ./models
COPY .env* ./

# Expose the application port (change if needed)
EXPOSE 3000

# Set environment variables (can be overridden by docker-compose)
ENV NODE_ENV=production

# Start the application
CMD ["node", "src/app.js"]
