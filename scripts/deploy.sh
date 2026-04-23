#!/bin/bash
# Déploiement VPS depuis Git
# ──────────────────────────
# Usage sur le VPS (dans /docker/planningfamille ou équivalent) :
#   ./scripts/deploy.sh
#
# Ce script :
#   1. Vérifie qu'il n'y a pas de modifications locales non commitées
#      (refuse sinon, pour éviter d'écraser une config manuelle).
#   2. Fait un `git pull --ff-only` (refuse si ce n'est pas un fast-forward,
#      pour éviter les merges automatiques surprises).
#   3. Rebuild l'image et relance le conteneur.
#   4. Affiche l'état final.
#
# La persistance est assurée par le volume `./data` qui survit aux rebuilds.

set -euo pipefail

# Se placer à la racine du projet (parent du dossier scripts/)
cd "$(dirname "$0")/.."

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Déploiement Planning Famille"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Check modifications locales
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "✗ Modifications locales détectées :"
  git status --short
  echo
  echo "Résoudre avant de déployer :"
  echo "  - soit commiter : git add <fichier> && git commit"
  echo "  - soit annuler  : git checkout -- <fichier>"
  echo "  - soit mettre de côté : git stash"
  exit 1
fi

# 2. Récupérer les changements
echo "→ git fetch"
git fetch --tags

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse '@{u}' 2>/dev/null || git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✓ Déjà à jour ($LOCAL)."
  echo "  Rebuild forcé quand même ? [y/N] "
  read -r reply
  [[ ! "$reply" =~ ^[Yy]$ ]] && exit 0
else
  echo "→ Pull $LOCAL → $REMOTE"
  git pull --ff-only
fi

# 3. Rebuild + restart
echo "→ docker compose build"
docker compose build

echo "→ docker compose up -d"
docker compose up -d

# 4. État final
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Déploiement terminé"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose ps
