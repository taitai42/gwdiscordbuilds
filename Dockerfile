FROM node:20-slim

# napi-rs/canvas needs some native libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 libstdc++6 libgcc-s1 \
    libfontconfig1 libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

# Cache dir persists via volume mount; create it in image too
RUN mkdir -p cache/icons

# Run as non-root
RUN useradd -u 1001 -m botuser && chown -R botuser:botuser /app
USER botuser

CMD ["node", "src/index.js"]
