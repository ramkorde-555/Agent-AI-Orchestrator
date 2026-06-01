# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the remaining frontend source code
COPY . .

# Expose the port Next.js runs on
EXPOSE 3000

# Start the Next.js development server
CMD ["npm", "run", "dev"]