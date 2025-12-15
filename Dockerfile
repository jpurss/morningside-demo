FROM oven/bun:1 AS base

# Install Python for CSV analysis
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY server/python/requirements.txt ./server/python/

# Install JavaScript dependencies
RUN bun install

# Setup Python environment and install dependencies
RUN python3 -m venv .venv && \
    . .venv/bin/activate && \
    pip install -r server/python/requirements.txt

# Copy source code
COPY . .

# Build frontend
RUN bun run build

# Expose port
EXPOSE 8787

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["bun", "run", "start"]

