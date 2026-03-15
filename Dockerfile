# ──────────────────────────────────────────────
# Étape 1 : build Vite
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ──────────────────────────────────────────────
# Étape 2 : serveur statique (production)
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

EXPOSE 3051

CMD ["serve", "-s", "dist", "-l", "3051"]
