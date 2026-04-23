# Audit du projet — La Tribu / Planning Familial

Date : 2026-04-23
Périmètre : arborescence complète du dépôt, build, déploiement, code source.

Les points sont classés par **ordre décroissant d'importance** (du plus bloquant au plus cosmétique).

---

## 🔴 P0 — Bloquants / régressions en production

### 1. Backend `/api/state` — ✅ traité (commit `9f91677`)

**État** — Le backend Express existe (`server.js` à la racine) et répond à `GET /api/state` et `POST /api/state`, avec persistance dans `data/state.json`. Le `Dockerfile` a été refait pour lancer `node server.js` (et non plus `serve -s dist`), honore `PORT` et `NODE_ENV`, et installe les deps de prod via `npm ci --omit=dev`. Le `package.json` a un script `start: NODE_ENV=production node server.js` et un `dev` qui lance Vite + le serveur via `concurrently`.

**Compatibilité avec le docker-compose VPS** — Le volume `./data:/app/data` et les env vars `PORT=3051` / `NODE_ENV=production` du compose sont désormais **effectifs** : le serveur Express écrit bien dans `/app/data/state.json`, et celui-ci survit aux rebuilds grâce au volume monté.

**Reste à faire** — Aucun bloqueur. Point mineur : la route fallback `app.get('*', …)` sert `index.html` pour toute URL inconnue, y compris `GET /api/inconnue`, qui devrait plutôt renvoyer 404. Peu critique.

---

### 2. `docker-compose.yml` commité ≠ `docker-compose.yml` de production — ✅ traité

**État** — Correctifs appliqués le 2026-04-23 :
- `docker-compose.yml` à la racine = **version VPS/Traefik** (identique à `tmp/docker-compose.yml`).
- `docker-compose.dev.yml` = **version locale standalone** avec `ports: 3051:3051`, utilisable via `docker compose -f docker-compose.dev.yml up`.
- `scripts/deploy.sh` = script idempotent et safe pour mettre à jour le VPS depuis Git (`git pull --ff-only` + `docker compose up -d --build`). Refuse de tourner s'il y a des modifications locales non commitées.
- `data/.gitkeep` créé pour que le répertoire existe dès le clone.
- `.gitignore` mis à jour pour ignorer `data/*` (sauf `.gitkeep`) et un éventuel `docker-compose.override.yml` local.

**Migration à faire côté VPS** (une seule fois, pour basculer sans conflit) :
```bash
cd /docker/planningfamille

# 1. Sauvegarder la config actuelle par prudence
cp docker-compose.yml docker-compose.yml.bak

# 2. Vérifier que la config committée correspond à la tienne
git fetch
git diff origin/main -- docker-compose.yml

# 3a. Si identique (ou divergences acceptables) : discard local
git checkout -- docker-compose.yml
git pull --ff-only

# 3b. Si divergent (ex. autre domaine) : merger à la main, puis commit
#     et pousser une branche perso avant `git pull`.

# 4. Vérifier l'état du conteneur après pull
docker compose up -d
docker compose ps
```

Ensuite, les mises à jour suivantes se font simplement avec `./scripts/deploy.sh`.

**Historique condensé** — Le fichier commité à la racine n'était pas celui utilisé sur le VPS (le vrai vivait dans `tmp/docker-compose.yml`, version propre avec volume `./data`, réseau `web`, labels Traefik complets). Le fichier commité, lui, mélangeait `ports:` actifs + labels orphelins (parent `# labels:` commenté, enfants non commentés, donc YAML les rattachait à `ports:`) — ce qui produisait l'erreur `invalid containerPort: traefik.enable=true` du `.build.log`. Toute personne clonant le dépôt tombait sur une erreur immédiate.

**Choix retenu** — Deux fichiers nommés explicitement (`docker-compose.yml` prod, `docker-compose.dev.yml` local) plutôt qu'un `docker-compose.override.yml`. Raison : l'override aurait nécessité `networks: !reset []` (syntaxe moderne, fragile selon les versions de Compose) et créait un risque d'écrasement accidentel si le fichier arrivait sur le VPS. Deux fichiers nommés ne laissent aucune ambiguïté.

**Action restante** — Supprimer `tmp/docker-compose.yml` (devenu redondant avec le nouveau fichier racine) après avoir validé que la migration côté VPS s'est bien passée.

---

### 3. `isLocked` n'est jamais restauré au rechargement

Dans `usePersistence.ts` (chargement initial, l. 45-77), **aucune ligne ne lit `data.isLocked`**, alors que cette valeur est bien envoyée dans le POST (l. 88). L'application redémarre donc toujours en mode "déverrouillé", même après un verrouillage volontaire.

**Correctif** (ajouter dans le `.then` de l'effet de chargement) :
```ts
// Note : isLocked doit être exposé via setIsLocked depuis useAppState
if (typeof data.isLocked === 'boolean') setIsLocked(data.isLocked);
```

---

## 🟠 P1 — Problèmes importants

### 4. Dépendances inutilisées alourdissant le bundle et la surface d'attaque

Depuis l'ajout du backend (commit `9f91677`), la situation est :
- `express`, `@types/express`, `dotenv`, `concurrently` — **utilisées** par `server.js` ou le script `dev`.
- `@google/genai` — **inutilisée** (plusieurs MB embarqués pour rien).
- `motion` — **inutilisée** (aucune import de framer-motion).
- `tsx` — **inutilisée** (le projet utilise `node server.js` directement, pas `tsx`).

**Correctif** — `npm uninstall @google/genai motion tsx` + retirer `process.env.GEMINI_API_KEY` dans `vite.config.ts`.

Au passage, `vite.config.ts` injecte `process.env.GEMINI_API_KEY` alors qu'aucun appel Gemini n'est fait — résidu de Google AI Studio à retirer.

---

### 5. `.env` versionné par mégarde

`git ls-files` contient `.env` (1 octet, vide). Le `.gitignore` exclut `.env*` avec exception `!.env.example`, donc Git suit un fichier qu'il ne devrait pas. Risque : un jour quelqu'un y colle un secret et le commite sans s'en rendre compte.

**Correctif** :
```bash
git rm --cached .env
git commit -m "chore: untrack .env file"
```

---

### 6. Erreurs de persistance complètement silencieuses

`.catch(() => {})` (l. 77, 89) masque tous les échecs réseau. Combiné au point 2, l'utilisateur croit que tout est sauvegardé alors que rien ne l'est.

**Correctif** — Afficher un toast discret, ou une pastille "hors-ligne" dans le header, avec retry automatique. Exemple : état `saveStatus: 'ok' | 'pending' | 'error'` dans un contexte + indicateur dans `AppHeader`.

---

### 7. `TODAY_INDEX` figé au chargement du module

`src/constants.ts:28` calcule `TODAY_INDEX` une seule fois à l'import. Pour un planning familial typiquement laissé ouvert en continu (tablette de cuisine), le "jour actuel" ne change pas à minuit.

**Correctif** — Exposer `TODAY_INDEX` via un hook (ou le recalculer dans chaque composant concerné via `useEffect` + `setInterval` à minuit). Exemple :
```ts
function useTodayIndex() {
  const [idx, setIdx] = useState(() => (new Date().getDay() + 6) % 7);
  useEffect(() => {
    const ms = new Date().setHours(24, 0, 5, 0) - Date.now();
    const t = setTimeout(() => setIdx((new Date().getDay() + 6) % 7), ms);
    return () => clearTimeout(t);
  }, [idx]);
  return idx;
}
```

---

### 8. Aucune authentification si exposé publiquement

Le compose montre une règle `Host(\`planning.bandtrack.fr\`)` — si l'app est déployée sur Internet, n'importe qui peut lire et modifier le planning. Il n'y a ni auth, ni notion de "famille" séparée, ni rate-limiting.

**Correctif** — Au minimum une Basic Auth côté reverse-proxy (Traefik `basicauth` middleware), ou un mot de passe partagé stocké côté backend. Pour plus long terme : petit système d'invitation par lien signé.

---

### 9. Pas de confirmation avant suppression d'un membre

`handleDeleteMember` supprime immédiatement un membre **et toutes ses assignations** sans confirmation. Un clic accidentel (surtout sur mobile) = perte de données non-récupérable.

**Correctif** — Ajouter un `confirm()` ou un petit modal ("Supprimer Karine ? Cela retirera toutes ses tâches").

---

### 10. Les tâches (`CHORES`) sont codées en dur

`src/constants.ts:12-19` contient une liste figée de 6 tâches. L'utilisateur peut ajouter / renommer / supprimer des **membres**, mais pas des **tâches** — alors que chaque famille a ses propres besoins (arroser les plantes, sortir les poubelles, etc.).

**Correctif** — Déplacer `CHORES` dans l'état persisté (même mécanisme que `members`), avec UI de gestion dans la sidebar ou un écran dédié.

---

## 🟡 P2 — Améliorations recommandées

### 11. Pas de PWA / installabilité

Pour une app planifiée "posée sur la tablette de la cuisine", le manque de manifest + service worker est un vrai inconfort (pas d'icône sur écran d'accueil, pas d'offline).

**Correctif** — Ajouter `vite-plugin-pwa`, un `manifest.webmanifest` avec icônes, et activer la stratégie `networkFirst` sur `/api/state`.

---

### 12. Re-renders non optimisés

Les handlers (`handleCellClick`, `handleDragStart`, etc.) dans `useAppState` sont recréés à chaque render, donc `ChoreGrid` et chaque `MemberCard` re-rendent sur toute mise à jour. Sur mobile, ça se sent au drag.

**Correctif** — `useCallback` sur tous les handlers exposés, et `React.memo` sur `MemberCard` et les cellules du `ChoreGrid`.

---

### 13. Aucun test

Pas de `vitest`, pas de test unitaire. Les fonctions dans `utils/date.ts` (`getISOWeekId`, `weekInMonth`) sont critiques pour le comptage des points et faciles à tester.

**Correctif** — Installer `vitest` + `@testing-library/react`. Premiers tests prioritaires : `date.ts`, `useStats`, `useAppState.handleCellClick`.

---

### 14. Pas d'ESLint / Prettier

Le script `"lint": "tsc --noEmit"` ne fait que le type-check. Aucun linter ne surveille les bugs non-typés (dépendances de hooks manquantes, `console.log` oubliés, etc.). Le commentaire `// eslint-disable-next-line` dans `usePersistence.ts:78` montre d'ailleurs que l'auteur l'a anticipé.

**Correctif** — Ajouter `eslint` + `eslint-plugin-react-hooks` + `prettier`.

---

### 15. Accessibilité

- Les cellules du `ChoreGrid` n'ont pas de `role="button"` ni de `tabIndex` — navigable à la souris/tactile uniquement.
- Les couleurs de texte sur fond pastel ne sont pas vérifiées contre WCAG AA (particulièrement `text-slate-400` sur `bg-slate-50`).
- Le focus visible n'est pas stylisé (défaut navigateur seulement).

**Correctif** — Passer un `axe-core` dans le dev server, ajouter les `role`/`tabIndex` et corriger les contrastes faibles.

---

### 16. Debounce / concurrence sur la persistance

Le POST part à chaque mutation de state. Un utilisateur qui assigne 10 tâches d'affilée envoie 10 POST concurrents. Le `sendBeacon` final peut arriver avant un POST plus ancien.

**Correctif** — Debounce de 300-500 ms + monotonically-increasing `revision` ignorant les réponses obsolètes.

---

### 17. Pas d'« undo »

Une assignation effacée, une validation cochée par erreur — aucun moyen d'annuler. Pour un usage quotidien, c'est frustrant.

**Correctif** — Toast avec bouton "Annuler" qui restaure la dernière mutation. Stack simple de 5-10 opérations.

---

## 🟢 P3 — Hygiène / nettoyage

### 18. `metadata.json` vide — résidu Google AI Studio, supprimer.

### 19. `vite.config.ts` — commentaire malformé ligne 20 (`modifyâfile`) — caractère mal encodé à corriger.

### 20. `package.json` — champ `"name": "react-example"`, `"version": "0.0.0"` — renommer en `planning-famille` / `1.0.0`.

### 21. `Dockerfile` — `serve` est un paquet npm moyennement adapté en prod. Un `nginx:alpine` ou `caddy:alpine` multi-stage produit une image plus petite et plus rapide. Non bloquant.

### 22. `RewardCard.tsx:27` — `style={{ fontSize: '120px' }}` inline, à remplacer par une classe Tailwind (`text-[120px]`) pour cohérence.

### 23. `.env.example` parle de `GEMINI_API_KEY` et `APP_URL` — ni l'un ni l'autre n'est utilisé côté client. À nettoyer (ou alors implémenter une fonctionnalité IA si c'était l'intention).

### 24. Images / favicon — `index.html` ne référence aucun favicon / icône. Pour une app "nom de marque" (La Tribu), c'est visuellement attendu.

### 25. Commentaires non-français mélangés — mineur, mais le fichier est 100% français sauf quelques commentaires EN résiduels (ex. `// Derived`, `// Actions`, `// UI state`). Uniformiser.

---

## Synthèse — ordre d'attaque recommandé

Les deux premiers P0 (backend + docker-compose) sont **traités**. Reste :

1. **Restaurer `isLocked` au chargement** (P0-3). Fix trivial : ajouter la lecture dans `usePersistence.ts` et exposer `setIsLocked` depuis `useAppState`.
2. **Retirer `.env` du tracking + `npm uninstall @google/genai motion tsx`** (P1-5, P1-4).
3. **Rendre visibles les erreurs réseau** (P1-6) — maintenant que le backend existe, les 5xx doivent remonter à l'UI.
4. **Confirmation avant suppression + tâches éditables** (P1-9, P1-10).
5. **Sécuriser l'accès public** (Basic Auth Traefik ou auth app) puisque `planning.bandtrack.fr` est exposé (P1-8).
6. **Qualité de vie** : PWA, TODAY_INDEX dynamique, useCallback, tests, lint (P2).

Les points P3 peuvent être traités en une seule passe de nettoyage.
