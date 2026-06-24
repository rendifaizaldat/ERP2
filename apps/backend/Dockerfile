# ==========================================
# STAGE 1: BUILDER
# ==========================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Salin konfigurasi workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Salin source code backend dan packages (jika ada shared protocol)
COPY apps/backend ./apps/backend
COPY packages/protocol ./packages/protocol

# Install dependensi dan Build TypeScript ke JavaScript
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend run build

# ==========================================
# STAGE 2: RUNNER (Production Image)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Hanya salin hasil build dan node_modules untuk production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

# Set environment ke production
ENV NODE_ENV=production
ENV PORT=4000

# Ekspos port API
EXPOSE 4000

# Jalankan server
CMD ["node", "apps/backend/dist/index.js"]