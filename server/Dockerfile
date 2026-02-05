FROM node:18-slim

# Install system dependencies (Poppler utils for pdf-poppler)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source
COPY . .

# Expose port
EXPOSE 5000

# Start command
CMD [ "npm", "start" ]
