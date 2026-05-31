# --- Build stage ---
FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY svelte.config.js vite.config.js jsconfig.json ./
COPY src ./src
COPY static ./static

RUN npm run build \
    && npm prune --omit=dev

# --- Runtime stage ---
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# Install Ookla speedtest CLI
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash \
    && apt-get install -y --no-install-recommends speedtest \
    && apt-get purge -y --auto-remove curl gnupg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/data
ENV DB_PATH=/data/speedtest.db
ENV CONFIG_PATH=/data/config.json

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

CMD ["node", "build"]
