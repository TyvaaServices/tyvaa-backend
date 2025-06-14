# Use official Node.js LTS image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the application port (change if needed)
EXPOSE 3000

# Set environment variables (can be overridden by docker-compose)
ENV NODE_ENV=production

# Start the application
CMD ["node", "src/app.js"]

