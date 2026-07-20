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
- Espaces privés et isolés pour plusieurs familles
- Appairage sans mot de passe par invitation temporaire à usage unique
- Deux types d'appareils : téléphone adulte et écran familial partagé
- Paramètres protégés par un PIN adulte (déverrouillage de 15 minutes)
- Participants et tâches personnalisables par famille
- Révocation individuelle des appareils perdus ou remplacés

---

## Pilote multi-familles

Le pilote ne propose volontairement pas d'inscription publique. L'opérateur crée
chaque famille depuis `/pilot`, puis génère un lien d'appairage pour le premier
téléphone adulte. Les adultes peuvent ensuite inviter d'autres téléphones et
écrans familiaux depuis les paramètres protégés par PIN.

### Parcours d'accès

1. L'opérateur crée l'espace familial et son PIN initial dans `/pilot`.
2. Il génère une invitation `adulte` ou `écran familial` valable 24 heures.
3. Le lien est ouvert une seule fois sur l'appareil concerné.
4. Une session révocable de 180 jours est enregistrée dans un cookie `HttpOnly`.
5. Les usages quotidiens ne demandent aucun mot de passe.

Les téléphones adultes peuvent modifier le planning. L'écran familial partagé
peut consulter le planning et valider les tâches, mais ne peut ni modifier les
assignations ni ouvrir les paramètres.

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

L'administration locale du pilote est accessible sur
[http://localhost:3051/pilot](http://localhost:3051/pilot) avec la clé de
développement `pilot-local-3051`. Cette valeur ne doit jamais être utilisée sur
le VPS.

### Déploiement VPS avec Traefik

Prérequis sur le VPS :
- Traefik tourne et est rattaché au réseau Docker externe `web` (`docker network create web` si besoin).
- Le certresolver `letsencrypt` est configuré côté Traefik.
- Un fichier `.env` non commité définit une clé d'administration longue et
  aléatoire : `PILOT_ADMIN_KEY=...`.

Génération conseillée de la clé :

```bash
openssl rand -base64 32
```

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

Au premier déploiement de la version multi-familles, si l'ancien
`data/state.json` existe, l'écran `/pilot` propose de l'importer lors de la
création de la première famille. Le nouveau PIN remplace l'ancien secret.

### Sauvegarde du pilote

Les métadonnées, invitations et sessions vivent dans `data/catalog.json`. Chaque
planning familial est isolé dans `data/families/<id>.json`. Les écritures sont
atomiques, mais le dossier doit malgré tout être sauvegardé régulièrement :

```bash
tar -czf "planning-famille-$(date +%F-%H%M).tar.gz" data/
```

Conserver les sauvegardes hors du VPS et restreindre leur accès : elles
contiennent les noms, le planning et les sessions des familles.

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
│   ├── App.tsx        # Routage appairage, planning et administration
│   ├── main.tsx       # Point d'entrée React
│   └── index.css      # Tailwind CSS + thème couleurs
├── index.html
├── server.js          # API multi-familles, sessions, PIN et fichiers JSON
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
