# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — Build
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

# Cài dependencies (tận dụng cache layer)
COPY package*.json ./
RUN npm ci

# Build source
COPY . .
RUN npm run build

# ============================================================
# Stage 2 — Runtime (chỉ chứa output, gọn nhẹ)
# ============================================================
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

# Chỉ copy output của Nitro
COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
