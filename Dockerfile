FROM node:22-slim

# Install Supabase CLI dan tool yang diperlukan untuk development agent
RUN apt-get update && apt-get install -y \
  curl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://ref.supabase.com/install.sh | sh

WORKDIR /app

# Copy package files untuk cache dependencies
COPY package.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port untuk health check
EXPOSE 3000

# Default command
CMD ["npm", "run", "dev:web"]
