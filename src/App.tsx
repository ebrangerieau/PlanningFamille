import React, { useState, useMemo } from 'react';

// --- Types & Constants ---
type Member = { id: string; name: string; initial: string; colorKey: 'blue' | 'purple' | 'pink' | 'orange' };
type Chore = { id: string; name: string; icon: string; iconColor: string };
type Day = { id: string; name: string; short: string };

const MEMBERS: Member[] = [
  { id: 'tom', name: 'Tom', initial: 'T', colorKey: 'blue' },
  { id: 'jules', name: 'Jules', initial: 'J', colorKey: 'purple' },
  { id: 'karine', name: 'Karine', initial: 'K', colorKey: 'pink' },
  { id: 'eric', name: 'Eric', initial: 'E', colorKey: 'orange' },
];

const CHORES: Chore[] = [
  { id: 'c1', name: 'Mettre la table', icon: 'restaurant', iconColor: 'text-orange-400' },
  { id: 'c2', name: 'Débarrasser la table', icon: 'cleaning_services', iconColor: 'text-green-400' },
  { id: 'c3', name: 'Lave-vaisselle', icon: 'flatware', iconColor: 'text-blue-400' },
  { id: 'c4', name: 'Faire chauffer le repas', icon: 'microwave', iconColor: 'text-red-400' },
  { id: 'c5', name: 'Nettoyer le plan de travail', icon: 'countertops', iconColor: 'text-cyan-400' },
  { id: 'c6', name: "Passer l'aspirateur", icon: 'vacuum', iconColor: 'text-purple-400' },
];

const DAYS: Day[] = [
  { id: 'mon', name: 'Lundi', short: 'Lun' },
  { id: 'tue', name: 'Mardi', short: 'Mar' },
  { id: 'wed', name: 'Mercredi', short: 'Mer' },
  { id: 'thu', name: 'Jeudi', short: 'Jeu' },
  { id: 'fri', name: 'Vendredi', short: 'Ven' },
  { id: 'sat', name: 'Samedi', short: 'Sam' },
  { id: 'sun', name: 'Dimanche', short: 'Dim' },
];

// Today's index in DAYS (0=Lun … 6=Dim)
const TODAY_INDEX = (new Date().getDay() + 6) % 7;

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500',   lightBg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   cardBg: 'bg-blue-50'   },
  purple: { bg: 'bg-purple-500', lightBg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', cardBg: 'bg-purple-50' },
  pink:   { bg: 'bg-pink-500',   lightBg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   cardBg: 'bg-pink-50'   },
  orange: { bg: 'bg-orange-500', lightBg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', cardBg: 'bg-orange-50' },
};

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

// Returns "9 mars au 15 mars 2026" style string for the current week
function getWeekRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `${fmt(monday)} au ${fmt(sunday)}`;
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [rewardPeriod, setRewardPeriod] = useState<'semaine' | 'mois'>('semaine');
  const [rewardDescription, setRewardDescription] = useState('Soirée Cinéma + Pizza 🍕');
  const [isEditingReward, setIsEditingReward] = useState(false);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Scores: only past + today days count toward points
  const scores = useMemo(() => {
    const s: Record<string, number> = {};
    MEMBERS.forEach(m => (s[m.id] = 0));
    Object.entries(completed).forEach(([key, isDone]) => {
      if (!isDone || !assignments[key]) return;
      const dayId = key.split('-').pop()!;
      const dayIndex = DAYS.findIndex(d => d.id === dayId);
      if (dayIndex <= TODAY_INDEX) {
        s[assignments[key]]++;
      }
    });
    return s;
  }, [assignments, completed]);

  const maxScore = Math.max(...Object.values(scores), 0);
  const winners = MEMBERS.filter(m => scores[m.id] === maxScore && maxScore > 0);

  // Sorted members for leaderboard view (stable sort to avoid jumps)
  const sortedMembers = useMemo(
    () => [...MEMBERS].sort((a, b) => scores[b.id] - scores[a.id]),
    [scores],
  );

  // Rank by unique score position (for emoji, supporting ties)
  const memberRanks = useMemo(() => {
    const unique = [...new Set(Object.values(scores))].sort((a, b) => b - a);
    const ranks: Record<string, number> = {};
    MEMBERS.forEach(m => { ranks[m.id] = unique.indexOf(scores[m.id]); });
    return ranks;
  }, [scores]);

  const totalAssigned = Object.keys(assignments).length;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct = totalAssigned === 0 ? 0 : Math.round((completedCount / totalAssigned) * 100);

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    if (isLocked) { e.preventDefault(); return; }
    e.dataTransfer.setData('memberId', memberId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverKey(key);
  };

  const handleDragLeave = () => setDragOverKey(null);

  const handleDrop = (e: React.DragEvent, choreId: string, dayId: string) => {
    if (isLocked) return;
    e.preventDefault();
    const memberId = e.dataTransfer.getData('memberId');
    if (memberId) {
      const key = `${choreId}-${dayId}`;
      setAssignments(prev => ({ ...prev, [key]: memberId }));
      setCompleted(prev => ({ ...prev, [key]: false }));
    }
    setDragOverKey(null);
  };

  // --- Cell click ---
  const handleCellClick = (choreId: string, dayId: string) => {
    const key = `${choreId}-${dayId}`;
    if (!isLocked) {
      // Edit mode: click removes assignment
      if (assignments[key]) {
        setAssignments(prev => { const n = { ...prev }; delete n[key]; return n; });
        setCompleted(prev => { const n = { ...prev }; delete n[key]; return n; });
      }
    } else {
      // Locked mode: only past + today can be toggled
      const dayIndex = DAYS.findIndex(d => d.id === dayId);
      if (assignments[key] && dayIndex <= TODAY_INDEX) {
        setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
      }
    }
  };

  return (
    <div className="bg-background-light text-slate-900 flex min-h-screen font-display overflow-hidden">

      {/* ── Sidebar ── */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen ? 'w-72' : 'w-0'
        }`}
      >
        <div className="w-72 flex flex-col h-full">

          {/* Brand header */}
          <div className="p-5 flex items-center gap-3 border-b border-slate-100 shrink-0">
            <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined">family_history</span>
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-slate-900">La Tribu</h1>
              <p className="text-xs text-slate-500">Gestion familiale</p>
            </div>
          </div>

          {/* Members / Leaderboard */}
          <div className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isLocked ? '🏆 Classement' : '👥 Membres'}
              </h2>
              {!isLocked && (
                <span className="text-[10px] text-slate-400 italic">Glisser → tableau</span>
              )}
            </div>

            <div className="space-y-3">
              {(isLocked ? sortedMembers : MEMBERS).map(member => {
                const colors = COLOR_MAP[member.colorKey];
                const isWinner = winners.some(w => w.id === member.id);
                const rank = memberRanks[member.id];
                const scoreMax = Math.max(...Object.values(scores), 1);
                const scorePct = Math.round((scores[member.id] / scoreMax) * 100);

                return (
                  <div
                    key={member.id}
                    draggable={!isLocked}
                    onDragStart={e => handleDragStart(e, member.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      !isLocked
                        ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02] hover:shadow-md'
                        : 'cursor-default'
                    } ${
                      isWinner
                        ? 'border-yellow-400 bg-yellow-50 shadow-md shadow-yellow-100'
                        : `${colors.border} ${colors.cardBg}`
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`size-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${colors.bg} text-white ${
                        isWinner ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
                      }`}
                    >
                      {isLocked && scores[member.id] > 0 && rank < 3 ? RANK_EMOJI[rank] : member.initial}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">
                          {member.name}
                          {isWinner && <span className="ml-1">⭐</span>}
                        </p>
                        <p className={`text-sm font-bold ${colors.text}`}>{scores[member.id]} pts</p>
                      </div>

                      {/* Score bar (locked) */}
                      {isLocked ? (
                        <div className="mt-1.5 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${colors.bg}`}
                            style={{ width: `${scorePct}%` }}
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-0.5">Glisser dans le tableau</p>
                      )}
                    </div>

                    {!isLocked && (
                      <span className="material-symbols-outlined text-slate-300 text-sm shrink-0">
                        drag_indicator
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lock button in sidebar */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsLocked(v => !v)}
                className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                  isLocked
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {isLocked ? 'lock_open' : 'lock'}
                </span>
                {isLocked ? 'Déverrouiller' : 'Verrouiller le tableau'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(v => !v)}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title={isSidebarOpen ? 'Masquer le volet' : 'Afficher le volet'}
            >
              <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <span className="material-symbols-outlined text-primary text-3xl">calendar_month</span>
            <div>
              <h2 className="text-xl font-bold tracking-tight leading-tight">Planning de la Semaine</h2>
              <p className="text-xs text-slate-400">Semaine du {getWeekRange()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLocked && (
              <span className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                <span className="material-symbols-outlined text-sm">lock</span>
                Mode suivi actif
              </span>
            )}
            <button
              onClick={() => setIsLocked(v => !v)}
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${
                isLocked
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
              }`}
            >
              <span className="material-symbols-outlined text-base">{isLocked ? 'lock_open' : 'lock'}</span>
              {isLocked ? 'Modifier' : 'Verrouiller'}
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="p-6 flex-1 max-w-[1400px] mx-auto w-full">

          {/* Planning table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-4 text-left bg-slate-50 border-b border-slate-200 w-52">
                      <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm">
                        <span className="material-symbols-outlined text-slate-400 text-lg">checklist</span>
                        Tâches
                      </div>
                    </th>
                    {DAYS.map((day, idx) => {
                      const isPast = idx < TODAY_INDEX;
                      const isToday = idx === TODAY_INDEX;
                      return (
                        <th
                          key={day.id}
                          className={`p-3 text-center font-semibold border-b border-l min-w-[100px] ${
                            isToday
                              ? 'bg-primary text-white border-primary'
                              : isPast
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-sm">{day.short}</span>
                            {isToday && (
                              <span className="text-[10px] font-normal bg-white/25 px-2 py-0.5 rounded-full">
                                Aujourd'hui
                              </span>
                            )}
                            {isPast && (
                              <span className="text-[10px] font-normal opacity-60">Passé</span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {CHORES.map(chore => (
                    <tr key={chore.id} className="group">

                      {/* Chore label */}
                      <td className="p-4 bg-slate-50/50 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined ${chore.iconColor} text-xl shrink-0`}>
                            {chore.icon}
                          </span>
                          <span className="font-medium text-sm text-slate-700 leading-tight">{chore.name}</span>
                        </div>
                      </td>

                      {/* Day cells */}
                      {DAYS.map((day, dayIdx) => {
                        const key = `${chore.id}-${day.id}`;
                        const assignedId = assignments[key];
                        const member = assignedId ? MEMBERS.find(m => m.id === assignedId) : null;
                        const isDone = !!completed[key];
                        const colors = member ? COLOR_MAP[member.colorKey] : null;
                        const isPast = dayIdx < TODAY_INDEX;
                        const isToday = dayIdx === TODAY_INDEX;
                        const isFuture = dayIdx > TODAY_INDEX;
                        const countsForScore = !isFuture; // past + today
                        const isDragTarget = dragOverKey === key;

                        return (
                          <td
                            key={day.id}
                            className={`p-2 border-l h-20 relative transition-colors ${
                              isToday ? 'bg-primary/5 border-primary/20' : 'border-slate-100'
                            } ${!isLocked ? 'hover:bg-slate-50' : ''} ${isDragTarget && !isLocked ? 'bg-primary/10' : ''}`}
                            onDragOver={e => handleDragOver(e, key)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, chore.id, day.id)}
                            onClick={() => handleCellClick(chore.id, day.id)}
                          >
                            {/* Assigned cell */}
                            {member && colors ? (
                              <div
                                className={`w-full h-full flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all select-none ${
                                  isLocked && countsForScore
                                    ? 'cursor-pointer hover:scale-105'
                                    : isLocked && isFuture
                                    ? 'cursor-default opacity-60'
                                    : !isLocked
                                    ? 'cursor-pointer hover:opacity-75'
                                    : ''
                                } ${
                                  isDone && countsForScore
                                    ? 'bg-green-100 text-green-800 ring-2 ring-green-400'
                                    : isDone && isFuture
                                    ? 'bg-slate-100 text-slate-500 ring-2 ring-slate-300'
                                    : `${colors.lightBg} ${colors.text}`
                                }`}
                                title={
                                  !isLocked
                                    ? 'Cliquer pour retirer'
                                    : isFuture
                                    ? 'Jour à venir — pas encore disponible'
                                    : isDone
                                    ? 'Marquer comme non fait'
                                    : 'Marquer comme fait !'
                                }
                              >
                                {isDone ? (
                                  <>
                                    <span className={`text-xl leading-none ${isFuture ? 'opacity-40' : ''}`}>✅</span>
                                    <span className="mt-1">{member.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <span>{member.name}</span>
                                    {isLocked && countsForScore && (
                                      <span className="text-[9px] opacity-50 mt-1">Toucher pour valider</span>
                                    )}
                                    {isLocked && isFuture && (
                                      <span className="text-[9px] opacity-40 mt-1">À venir</span>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              /* Empty cell (edit mode only) */
                              !isLocked && (
                                <div
                                  className={`w-full h-full border-2 border-dashed rounded-xl flex items-center justify-center transition-all ${
                                    isDragTarget
                                      ? 'border-primary bg-primary/10 scale-105'
                                      : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5'
                                  }`}
                                >
                                  <span
                                    className={`material-symbols-outlined text-xl transition-opacity ${
                                      isDragTarget
                                        ? 'text-primary opacity-100'
                                        : 'text-slate-300 opacity-0 group-hover:opacity-60'
                                    }`}
                                  >
                                    add
                                  </span>
                                </div>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Dashboard ── */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Progression */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">trending_up</span>
                Progression de la tribu
              </h3>

              {/* Global bar */}
              <div className="mb-5">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 font-medium">Tâches accomplies</span>
                  <span className="font-bold text-primary">{completedCount} / {totalAssigned || CHORES.length * DAYS.length}</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-right text-sm font-bold text-primary mt-1">{progressPct}%</p>
              </div>

              {/* Per-member cards */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {MEMBERS.map(member => {
                  const memberTasks = Object.keys(assignments).filter(k => assignments[k] === member.id).length;
                  const memberDone = scores[member.id];
                  const pct = memberTasks === 0 ? 0 : Math.round((memberDone / memberTasks) * 100);
                  const colors = COLOR_MAP[member.colorKey];
                  return (
                    <div key={member.id} className={`p-3 rounded-xl ${colors.cardBg}`}>
                      <div
                        className={`size-8 rounded-full ${colors.bg} text-white font-bold text-sm flex items-center justify-center mx-auto mb-1.5`}
                      >
                        {member.initial}
                      </div>
                      <p className="text-xs font-semibold text-slate-600">{member.name}</p>
                      <p className={`text-xl font-bold ${colors.text}`}>{pct}%</p>
                      <p className="text-[10px] text-slate-400">{memberDone}/{memberTasks} pts</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reward & Tips */}
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 flex flex-col justify-between relative overflow-hidden">
              {/* Decorative */}
              <div className="absolute -right-8 -top-8 text-primary/10 rotate-12 pointer-events-none select-none">
                <span className="material-symbols-outlined" style={{ fontSize: '140px' }}>celebration</span>
              </div>

              {/* Tip */}
              <div className="flex items-start gap-3 relative z-10">
                <span className="material-symbols-outlined text-primary shrink-0">tips_and_updates</span>
                <div>
                  <h4 className="font-bold text-primary mb-1">Astuce</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {isLocked
                      ? 'Touchez vos tâches pour les valider et gagner des points ! Seuls les jours passés comptent au score. 🎯'
                      : 'Glissez les membres sur les cases du tableau, puis verrouillez pour commencer le suivi des tâches. 👆'}
                  </p>
                </div>
              </div>

              {/* Reward card */}
              <div className="mt-5 flex items-center gap-4 bg-white p-4 rounded-xl border border-primary/10 shadow-sm relative z-10">
                <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-2xl">workspace_premium</span>
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingReward ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={rewardPeriod}
                        onChange={e => setRewardPeriod(e.target.value as 'semaine' | 'mois')}
                        className="text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-primary"
                      >
                        <option value="semaine">Récompense de la semaine</option>
                        <option value="mois">Récompense du mois</option>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={rewardDescription}
                          onChange={e => setRewardDescription(e.target.value)}
                          className="text-sm font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-1 flex-1 outline-none focus:border-primary"
                          placeholder="Ex: Soirée Pizza"
                        />
                        <button
                          onClick={() => setIsEditingReward(false)}
                          className="bg-primary hover:bg-primary/90 text-white size-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                          title="Valider"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                          Récompense {rewardPeriod === 'semaine' ? 'de la semaine' : 'du mois'}
                        </p>
                        <p className="text-base font-bold text-slate-900 mt-0.5 truncate">{rewardDescription}</p>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={() => setIsEditingReward(true)}
                          className="text-slate-400 hover:text-primary transition-colors p-1 shrink-0"
                          title="Modifier la récompense"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Winner announcement */}
              {winners.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3 relative z-10">
                  <span className="text-2xl shrink-0">🏆</span>
                  <div>
                    <p className="text-xs text-yellow-700 font-medium">En tête cette semaine</p>
                    <p className="font-bold text-yellow-800">
                      {winners.map(w => w.name).join(' & ')} — {maxScore} pt{maxScore > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
