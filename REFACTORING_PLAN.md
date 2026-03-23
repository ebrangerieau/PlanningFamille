# Plan de refactorisation — PlanningFamille

## Objectif
Passer de 1 fichier monolithique (1051 lignes) à une architecture modulaire
sans changer aucun comportement visible pour l'utilisateur.

## Structure cible

```
src/
├── types.ts                    # Types TypeScript partagés
├── constants.ts                # Constantes (CHORES, DAYS, COLOR_MAP…)
├── utils/
│   └── date.ts                 # Fonctions de date (getISOWeekId, weekInMonth…)
├── hooks/
│   ├── usePersistence.ts       # Fetch/save vers le serveur
│   ├── useAppState.ts          # États + actions (lock, membres, drag&drop, cellules)
│   └── useStats.ts             # Calcul des stats (useMemo)
├── components/
│   ├── AppHeader.tsx           # Barre de navigation en haut
│   ├── Sidebar.tsx             # Panneau latéral complet
│   ├── MemberCard.tsx          # Carte membre (mode normal + mode édition)
│   ├── ChoreGrid.tsx           # Tableau planning (tâches × jours)
│   ├── StatsPanel.tsx          # Dashboard de progression
│   └── RewardCard.tsx          # Carte récompense + astuce + banner gagnant
├── App.tsx                     # Orchestrateur (~50 lignes)
├── main.tsx                    # Inchangé
└── index.css                   # Inchangé
```

---

## Étape 1 — Types & Constantes
**Fichiers créés :** `src/types.ts`, `src/constants.ts`

Extraire depuis App.tsx :
- `types.ts` : `Member`, `Chore`, `Day`, `WeekHistory`
- `constants.ts` : `COLOR_KEYS`, `DEFAULT_MEMBERS`, `CHORES`, `DAYS`,
  `TODAY_INDEX`, `COLOR_MAP`, `RANK_EMOJI`

**Résultat :** App.tsx perd ~45 lignes, aucune logique ne change.

---

## Étape 2 — Utilitaires de date
**Fichier créé :** `src/utils/date.ts`

Extraire depuis App.tsx :
- `getWeekRange()` — plage affichée dans le header
- `getISOWeekId()` — identifiant ISO de la semaine courante
- `getWeekMonday()` — lundi d'une semaine ISO donnée
- `weekInMonth()` — test d'appartenance au mois

**Résultat :** App.tsx perd ~35 lignes supplémentaires.

---

## Étape 3 — Hooks personnalisés
**Fichiers créés :** `src/hooks/usePersistence.ts`, `src/hooks/useAppState.ts`, `src/hooks/useStats.ts`

### 3a. `usePersistence`
Encapsule le chargement initial + la sauvegarde automatique :
- `useEffect` fetch GET `/api/state`
- `useEffect` POST `/api/state` à chaque changement
- `useEffect` sendBeacon à la fermeture de page
- Gestion de l'archivage automatique de semaine
- Retourne : `{ isLoading }`

### 3b. `useAppState`
Centralise tous les `useState` et les actions :
- États : `isLocked`, `assignments`, `completed`, `members`, `selectedMemberId`,
  `editingMemberId`, `editName`, `dragOverKey`, `currentWeek`, `history`,
  `statsPeriod`, `rewardPeriod`, `rewardDescription`, `isEditingReward`,
  `isSidebarOpen`
- Actions : `handleLockToggle`, `handleMemberTap`, `handleStartEdit`,
  `handleRename`, `handleDeleteMember`, `handleAddMember`,
  `handleDragStart/Over/Leave/Drop`, `handleCellClick`
- Retourne tout sous forme d'objet unique

### 3c. `useStats`
Extrait le `useMemo` de calcul des statistiques :
- Paramètres : `statsPeriod`, `members`, `assignments`, `completed`,
  `history`, `currentWeek`
- Retourne : `periodData` (`scores`, `taskCounts`, `totalAssigned`,
  `totalCompleted`, `progressPct`, `weekCount`)

**Résultat :** App.tsx ne contient plus de logique métier.

---

## Étape 4 — Composants UI
**Fichiers créés :** 6 composants dans `src/components/`

### 4a. `MemberCard`
Props : `member`, `isLocked`, `isSelected`, `isEditing`, `editName`,
`rank`, `scores`, `winners`, `onTap`, `onStartEdit`, `onRename`,
`onDelete`, `onEditNameChange`, `onCancelEdit`, `onDragStart`

Contenu : les deux branches du rendu membre (formulaire + carte normale)

### 4b. `Sidebar`
Props : `isOpen`, `onClose`, `members`, `isLocked`, `...stateProps`

Contenu : header "La Tribu", liste des MemberCard, bouton "Ajouter", bouton lock

### 4c. `AppHeader`
Props : `isSidebarOpen`, `onToggleSidebar`, `isLocked`, `onLockToggle`

Contenu : barre sticky avec menu toggle, titre, badge "Mode suivi", bouton lock

### 4d. `ChoreGrid`
Props : `chores`, `days`, `members`, `assignments`, `completed`, `isLocked`,
`selectedMemberId`, `dragOverKey`, `onCellClick`, `onDragOver`,
`onDragLeave`, `onDrop`, `selectedMember`

Contenu : `<table>` complet avec header des jours et body des tâches

### 4e. `StatsPanel`
Props : `periodData`, `statsPeriod`, `onPeriodChange`, `members`, `history`

Contenu : sélecteur de période, barre globale, cartes par membre

### 4f. `RewardCard`
Props : `isLocked`, `rewardPeriod`, `rewardDescription`, `isEditingReward`,
`winners`, `maxScore`, `selectedMember`, `onEdit`, `onSave`,
`onPeriodChange`, `onDescriptionChange`

Contenu : astuce contextuelle, carte récompense éditable, banner gagnant

---

## Étape 5 — Nettoyage final d'App.tsx
App.tsx devient un orchestrateur pur :

```tsx
export default function App() {
  const state = useAppState();
  usePersistence(state);
  const periodData = useStats(state);

  if (state.isLoading) return <LoadingScreen />;

  return (
    <div className="...">
      <Sidebar {...state} />
      <main>
        <AppHeader {...state} />
        <ChoreGrid {...state} />
        <StatsPanel periodData={periodData} {...state} />
        <RewardCard {...state} />
      </main>
    </div>
  );
}
```

---

## Ordre d'exécution
1. Étape 1 (types/constantes) — sans risque, juste des imports à ajouter
2. Étape 2 (utils/date) — sans risque, fonctions pures
3. Étape 3a (usePersistence) — critique, tester la sauvegarde après
4. Étape 3b (useAppState) — plus complexe, tester toutes les interactions
5. Étape 3c (useStats) — simple, juste déplacer un useMemo
6. Étapes 4a→4f — un composant à la fois, tester visuellement à chaque fois
7. Étape 5 — simplification finale de App.tsx

## Règles
- Aucune fonctionnalité ne change
- Chaque étape est committée séparément
- L'application doit fonctionner à chaque étape intermédiaire
