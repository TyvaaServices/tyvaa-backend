# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the shared utils package first
COPY ../../packages/utils ./packages/utils

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies including the local package
RUN npm install --production=false

# Copy the rest of the application code
COPY . .

# Make port available (mapping done in docker-compose.yml)
EXPOSE ${PORT:+-$PORT}

# Define the command to run your app
CMD ["node", "server.js"]
