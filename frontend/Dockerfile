FROM node:20-bookworm-slim

WORKDIR /app

# Install curl for health/troubleshooting checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build-time and runtime environment variables for API connection
ARG EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api
ENV EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}
ENV CI=1

EXPOSE 8081

CMD ["npx", "expo", "start", "--web", "--port", "8081"]
