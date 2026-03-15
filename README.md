# 📅 La Tribu — Planning Familial

Interface de gestion des tâches familiales hebdomadaires, responsive mobile & desktop.
Permet d'assigner des tâches par jour à chaque membre de la famille, de verrouiller le planning et de valider les tâches accomplies pour gagner des points.

---

## Fonctionnalités

- Tableau de planification (tâches × jours de la semaine)
- Glisser-déposer (desktop) et tap-to-assign (mobile/tablette)
- Mode verrouillage pour valider les tâches au fil de la semaine
- Compteur de points par personne (seuls les jours passés comptent)
- Classement hebdomadaire avec podium 🥇🥈🥉
- Gestion des membres : ajout, renommage, suppression
- Récompense de la semaine personnalisable
- Interface entièrement en français, responsive mobile et desktop

---

## Installation locale

### Prérequis

- [Node.js](https://nodejs.org/) ≥ 18

### Étapes

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd PlanningFamille

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement (port 3000)
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

### Build de production

```bash
npm run build     # génère le dossier dist/
npm run preview   # prévisualise le build (port 4173)
```

---

## Déploiement Docker (port 3051)

### Dockerfile

Créez un fichier `Dockerfile` à la racine du projet :

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Image de production ---
FROM node:20-alpine AS runner

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3051
CMD ["serve", "-s", "dist", "-l", "3051"]
```

### Construction et lancement

```bash
# Construire l'image
docker build -t planning-famille .

# Lancer le conteneur
docker run -d \
  --name planning-famille \
  -p 3051:3051 \
  planning-famille
```

L'application est accessible sur [http://localhost:3051](http://localhost:3051).

### Avec Docker Compose

Créez un fichier `docker-compose.yml` :

```yaml
services:
  planning-famille:
    build: .
    container_name: planning-famille
    ports:
      - "3051:3051"
    restart: unless-stopped
```

```bash
docker compose up -d
```

### Commandes utiles

```bash
# Voir les logs
docker logs planning-famille

# Arrêter le conteneur
docker compose down

# Reconstruire après une modification
docker compose up -d --build
```

---

## Structure du projet

```
PlanningFamille/
├── src/
│   ├── App.tsx        # Composant principal (planning, sidebar, dashboard)
│   ├── main.tsx       # Point d'entrée React
│   └── index.css      # Tailwind CSS + thème couleurs
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Stack technique

| Technologie | Version | Rôle |
|------------|---------|------|
| React | 19 | Framework UI |
| TypeScript | 5.8 | Typage statique |
| Vite | 6 | Build & dev server |
| Tailwind CSS | 4 | Styles utilitaires |
| Material Symbols | — | Icônes Google |
