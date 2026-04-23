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

## Déploiement Docker

Deux configurations Docker Compose cohabitent à la racine du dépôt :

| Fichier | Cible | Réseau | Exposition |
|---------|-------|--------|------------|
| `docker-compose.yml` | VPS + Traefik (production) | `web` (externe) | via Traefik |
| `docker-compose.dev.yml` | Dev local / test standalone | bridge par défaut | `localhost:3051` |

### Test local (sans Traefik)

```bash
docker compose -f docker-compose.dev.yml up --build
```

L'application est accessible sur [http://localhost:3051](http://localhost:3051).

### Déploiement VPS avec Traefik

Prérequis sur le VPS :
- Traefik tourne et est rattaché au réseau Docker externe `web` (`docker network create web` si besoin).
- Le certresolver `letsencrypt` est configuré côté Traefik.

Première installation :
```bash
git clone <url-du-depot> /docker/planningfamille
cd /docker/planningfamille
docker compose up -d --build
```

Mises à jour ultérieures :
```bash
cd /docker/planningfamille
./scripts/deploy.sh
```

Le script `deploy.sh` :
1. Refuse de continuer s'il y a des modifications locales non commitées (évite d'écraser une config manuelle).
2. Fait un `git pull --ff-only` (refuse les merges non-linéaires).
3. Rebuild l'image et relance le conteneur (`docker compose up -d --build`).
4. Affiche l'état final.

Les données persistées (fichier JSON côté backend) vivent dans `./data/` qui est monté comme volume et survit aux rebuilds.

### Commandes utiles

```bash
# Logs
docker compose logs -f

# Redémarrer
docker compose restart

# Arrêter
docker compose down

# Reconstruire sans pull
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
