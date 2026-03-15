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
# Étape 2 : serveur Express (API + static)
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Installer uniquement les dépendances de production
COPY package*.json ./
RUN npm ci --omit=dev

# Copier le build et le serveur
COPY --from=builder /app/dist ./dist
COPY server.js ./

# Créer le dossier de données persistantes
RUN mkdir -p data

EXPOSE 3051

ENV NODE_ENV=production
ENV PORT=3051

CMD ["node", "server.js"]
