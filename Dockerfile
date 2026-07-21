# ============================================
# Dr Ilhom Dental Clinic — Production Dockerfile
# Multi-stage: build (frontend + server bundle) -> slim runtime
# ============================================

# ---------- Build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies (express, helmet, bcryptjs, ...)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Built artifacts: SPA + bundled server
COPY --from=build /app/dist ./dist

# Run as non-root user
RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p data backups logs public/uploads \
  && chown -R app:app /app
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
