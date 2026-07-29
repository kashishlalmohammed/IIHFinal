# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --prefer-offline
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev --prefer-offline

# Copy backend source
COPY backend/src ./src

# Copy compiled frontend into the location Express expects
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Data directory — override DATA_DIR to point to a mounted persistent volume
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

# Bundle the seed database — copied to volume on first boot if not already there
COPY backend/data/influencers.sqlite /app/seed/influencers.sqlite

EXPOSE 3001

# On start: seed the volume if empty, then run the app
CMD ["sh", "-c", "if [ ! -f /app/data/influencers.sqlite ]; then cp /app/seed/influencers.sqlite /app/data/influencers.sqlite; fi && node src/index.js"]
