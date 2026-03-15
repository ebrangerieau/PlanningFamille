import React, { useState, useMemo } from 'react';

// --- Types & Constants ---
type Member = { id: string; name: string; initial: string; colorKey: 'blue' | 'purple' | 'pink' | 'orange' };
type Chore  = { id: string; name: string; icon: string; iconColor: string };
type Day    = { id: string; short: string };

const COLOR_KEYS: Array<Member['colorKey']> = ['blue', 'purple', 'pink', 'orange'];

const DEFAULT_MEMBERS: Member[] = [
  { id: 'tom',    name: 'Tom',    initial: 'T', colorKey: 'blue'   },
  { id: 'jules',  name: 'Jules',  initial: 'J', colorKey: 'purple' },
  { id: 'karine', name: 'Karine', initial: 'K', colorKey: 'pink'   },
  { id: 'eric',   name: 'Eric',   initial: 'E', colorKey: 'orange' },
];

const CHORES: Chore[] = [
  { id: 'c1', name: 'Mettre la table',            icon: 'restaurant',       iconColor: 'text-orange-400' },
  { id: 'c2', name: 'Débarrasser la table',        icon: 'cleaning_services',iconColor: 'text-green-400'  },
  { id: 'c3', name: 'Lave-vaisselle',              icon: 'flatware',         iconColor: 'text-blue-400'   },
  { id: 'c4', name: 'Faire chauffer le repas',     icon: 'microwave',        iconColor: 'text-red-400'    },
  { id: 'c5', name: 'Nettoyer le plan de travail', icon: 'countertops',      iconColor: 'text-cyan-400'   },
  { id: 'c6', name: "Passer l'aspirateur",         icon: 'vacuum',           iconColor: 'text-purple-400' },
];

const DAYS: Day[] = [
  { id: 'mon', short: 'Lun' }, { id: 'tue', short: 'Mar' }, { id: 'wed', short: 'Mer' },
  { id: 'thu', short: 'Jeu' }, { id: 'fri', short: 'Ven' }, { id: 'sat', short: 'Sam' },
  { id: 'sun', short: 'Dim' },
];

// 0 = Lun … 6 = Dim
const TODAY_INDEX = (new Date().getDay() + 6) % 7;

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500',   lightBg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   cardBg: 'bg-blue-50'   },
  purple: { bg: 'bg-purple-500', lightBg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', cardBg: 'bg-purple-50' },
  pink:   { bg: 'bg-pink-500',   lightBg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   cardBg: 'bg-pink-50'   },
  orange: { bg: 'bg-orange-500', lightBg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', cardBg: 'bg-orange-50' },
};

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

function getWeekRange(): string {
  const now      = new Date();
  const monday   = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday   = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export default function App() {
  // Sidebar starts open on desktop, closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  );
  const [isLocked,         setIsLocked]         = useState(false);
  const [assignments,      setAssignments]      = useState<Record<string, string>>({});
  const [completed,        setCompleted]        = useState<Record<string, boolean>>({});
  const [rewardPeriod,     setRewardPeriod]     = useState<'semaine' | 'mois'>('semaine');
  const [rewardDescription,setRewardDescription]= useState('Soirée Cinéma + Pizza 🍕');
  const [isEditingReward,  setIsEditingReward]  = useState(false);
  const [dragOverKey,      setDragOverKey]      = useState<string | null>(null);
  // Tap-to-assign: member selected via sidebar tap (touch UX)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  // Members as state (add / rename / delete)
  const [members,          setMembers]          = useState<Member[]>(DEFAULT_MEMBERS);
  const [editingMemberId,  setEditingMemberId]  = useState<string | null>(null);
  const [editName,         setEditName]         = useState('');

  // --- Scores (past + today only) ---
  const scores = useMemo(() => {
    const s: Record<string, number> = {};
    members.forEach(m => (s[m.id] = 0));
    Object.entries(completed).forEach(([key, isDone]) => {
      if (!isDone || !assignments[key]) return;
      const dayId    = key.split('-').pop()!;
      const dayIndex = DAYS.findIndex(d => d.id === dayId);
      if (dayIndex <= TODAY_INDEX) s[assignments[key]]++;
    });
    return s;
  }, [assignments, completed, members]);

  const maxScore     = Math.max(...Object.values(scores), 0);
  const winners      = members.filter(m => scores[m.id] === maxScore && maxScore > 0);
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => scores[b.id] - scores[a.id]),
    [scores, members],
  );
  const memberRanks = useMemo(() => {
    const unique = [...new Set(Object.values(scores))].sort((a, b) => b - a);
    const ranks: Record<string, number> = {};
    members.forEach(m => { ranks[m.id] = unique.indexOf(scores[m.id]); });
    return ranks;
  }, [scores, members]);

  const totalAssigned  = Object.keys(assignments).length;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct    = totalAssigned === 0 ? 0 : Math.round((completedCount / totalAssigned) * 100);
  const selectedMember = selectedMemberId ? members.find(m => m.id === selectedMemberId) : null;

  // --- Actions ---
  const handleLockToggle = () => {
    setIsLocked(v => !v);
    setSelectedMemberId(null);
    setEditingMemberId(null);
  };

  /** Tap a member card → select / deselect (touch UX) */
  const handleMemberTap = (memberId: string) => {
    if (isLocked || editingMemberId) return;
    setSelectedMemberId(prev => (prev === memberId ? null : memberId));
  };

  // --- Member CRUD ---
  const handleStartEdit = (memberId: string) => {
    const m = members.find(x => x.id === memberId);
    if (!m) return;
    setEditingMemberId(memberId);
    setEditName(m.name);
    setSelectedMemberId(null);
  };

  const handleRename = (memberId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setMembers(prev => prev.map(m =>
      m.id === memberId
        ? { ...m, name: trimmed, initial: trimmed[0].toUpperCase() }
        : m,
    ));
    setEditingMemberId(null);
  };

  const handleDeleteMember = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    // Remove all assignments for this member
    setAssignments(prev => {
      const n = { ...prev };
      Object.keys(n).forEach(k => { if (n[k] === memberId) delete n[k]; });
      return n;
    });
    if (selectedMemberId === memberId) setSelectedMemberId(null);
    setEditingMemberId(null);
  };

  const handleAddMember = () => {
    const id       = `m_${Date.now()}`;
    const colorKey = COLOR_KEYS[members.length % COLOR_KEYS.length];
    setMembers(prev => [...prev, { id, name: 'Nouveau', initial: 'N', colorKey }]);
    setEditingMemberId(id);
    setEditName('Nouveau');
    setSelectedMemberId(null);
  };

  // Desktop drag-and-drop
  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    if (isLocked) { e.preventDefault(); return; }
    e.dataTransfer.setData('memberId', memberId);
    e.dataTransfer.effectAllowed = 'copy';
    setSelectedMemberId(null);
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

  /** Cell tap: assign selected member OR toggle completion */
  const handleCellClick = (choreId: string, dayId: string) => {
    const key      = `${choreId}-${dayId}`;
    const dayIndex = DAYS.findIndex(d => d.id === dayId);

    if (!isLocked) {
      if (selectedMemberId) {
        // Tap-to-assign (or remove if same member)
        if (assignments[key] === selectedMemberId) {
          setAssignments(prev => { const n = { ...prev }; delete n[key]; return n; });
          setCompleted(prev =>   { const n = { ...prev }; delete n[key]; return n; });
        } else {
          setAssignments(prev => ({ ...prev, [key]: selectedMemberId }));
          setCompleted(prev =>   ({ ...prev, [key]: false }));
        }
      } else if (assignments[key]) {
        // Click on assigned cell without selection → remove
        setAssignments(prev => { const n = { ...prev }; delete n[key]; return n; });
        setCompleted(prev =>   { const n = { ...prev }; delete n[key]; return n; });
      }
    } else {
      // Locked: toggle only for past + today
      if (assignments[key] && dayIndex <= TODAY_INDEX) {
        setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
      }
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-background-light text-slate-900 flex min-h-screen font-display overflow-hidden">

      {/* ── Mobile backdrop ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <aside
        className={[
          // Structure
          'fixed md:sticky top-0 left-0 h-screen z-50 md:z-auto',
          'bg-white border-r border-slate-200 flex flex-col',
          'transition-all duration-300 ease-in-out',
          // Mobile: slide in/out   Desktop: width collapse
          isSidebarOpen
            ? 'translate-x-0 w-72'
            : '-translate-x-full w-72 md:translate-x-0 md:w-0 md:overflow-hidden',
        ].join(' ')}
      >
        {/* Fixed-width inner container so content never wraps during animation */}
        <div className="w-72 flex flex-col h-full overflow-hidden">

          {/* Brand header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-100 shrink-0">
            <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined">family_history</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight">La Tribu</h1>
              <p className="text-xs text-slate-500 truncate">{getWeekRange()}</p>
            </div>
            {/* Close button (mobile only) */}
            <button
              className="md:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Fermer le menu"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Members / Leaderboard */}
          <div className="flex-1 px-4 py-4 overflow-y-auto overscroll-contain">

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isLocked ? '🏆 Classement' : '👥 Membres'}
              </h2>
              {!isLocked && (
                <span className="text-[10px] text-slate-400 italic">
                  {selectedMemberId ? 'Toucher une case →' : 'Glisser ou toucher'}
                </span>
              )}
            </div>

            {/* Touch hint */}
            {!isLocked && (
              <p className={`text-xs mb-3 rounded-lg px-3 py-2 transition-all ${
                selectedMember
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-slate-400 bg-slate-50'
              }`}>
                {selectedMember
                  ? `${selectedMember.name} sélectionné·e — touchez une case`
                  : 'Touchez un membre puis une case pour l\'assigner'}
              </p>
            )}

            {/* Member cards */}
            <div className="space-y-2.5">
              {(isLocked ? sortedMembers : members).map(member => {
                const colors     = COLOR_MAP[member.colorKey];
                const isWinner   = winners.some(w => w.id === member.id);
                const isSelected = selectedMemberId === member.id;
                const rank       = memberRanks[member.id];
                const scorePct   = Math.round((scores[member.id] / Math.max(...Object.values(scores), 1)) * 100);
                const isEditing  = editingMemberId === member.id;

                // ── Edit form ──
                if (isEditing) {
                  return (
                    <div key={member.id} className={`p-3 rounded-xl border-2 border-primary/50 bg-primary/5`}>
                      {/* Input row */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className={`size-9 rounded-full flex items-center justify-center font-bold text-base text-white shrink-0 ${colors.bg}`}>
                          {editName.trim()[0]?.toUpperCase() || '?'}
                        </div>
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(member.id);
                            if (e.key === 'Escape') setEditingMemberId(null);
                          }}
                          className="flex-1 text-sm font-bold border border-primary/40 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary bg-white"
                          placeholder="Prénom…"
                          maxLength={20}
                        />
                      </div>
                      {/* Action buttons */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRename(member.id)}
                          disabled={!editName.trim()}
                          className="flex-1 py-1.5 bg-primary disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditingMemberId(null)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                          aria-label="Annuler"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                        {members.length > 1 && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                            aria-label="Supprimer"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // ── Normal card ──
                return (
                  <div
                    key={member.id}
                    draggable={!isLocked && !editingMemberId}
                    onDragStart={e => handleDragStart(e, member.id)}
                    onClick={() => handleMemberTap(member.id)}
                    className={[
                      'flex items-center gap-3 p-3 rounded-xl border-2 transition-all select-none',
                      !isLocked && !editingMemberId ? 'cursor-pointer active:scale-95' : 'cursor-default',
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                        : isWinner
                        ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                        : `${colors.border} ${colors.cardBg}`,
                    ].join(' ')}
                  >
                    {/* Avatar */}
                    <div className={[
                      'size-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0 text-white',
                      colors.bg,
                      isSelected ? 'ring-4 ring-primary ring-offset-2'
                        : isWinner  ? 'ring-2 ring-yellow-400 ring-offset-1' : '',
                    ].join(' ')}>
                      {isLocked && scores[member.id] > 0 && rank < 3
                        ? RANK_EMOJI[rank]
                        : member.initial}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-bold truncate">
                          {member.name}
                          {isWinner && !isSelected && <span className="ml-1">⭐</span>}
                        </p>
                        <p className={`text-sm font-bold shrink-0 ${colors.text}`}>
                          {scores[member.id]} pts
                        </p>
                      </div>
                      {isLocked ? (
                        <div className="mt-1.5 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${colors.bg}`}
                            style={{ width: `${scorePct}%` }}
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isSelected ? '→ Touchez une case du tableau' : 'Glisser ou toucher'}
                        </p>
                      )}
                    </div>

                    {/* Right: edit btn (edit mode) or check/drag icon */}
                    {isSelected ? (
                      <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                    ) : !isLocked ? (
                      <button
                        onClick={e => { e.stopPropagation(); handleStartEdit(member.id); }}
                        className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                        aria-label={`Modifier ${member.name}`}
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Add member button */}
            {!isLocked && members.length < 8 && !editingMemberId && (
              <button
                onClick={handleAddMember}
                className="w-full mt-2 py-2.5 border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-slate-400 hover:text-primary rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                Ajouter un membre
              </button>
            )}

            {/* Lock button */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={handleLockToggle}
                className={[
                  'w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm',
                  isLocked
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90',
                ].join(' ')}
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

      {/* ══════════════════ MAIN ══════════════════ */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Menu toggle */}
            <button
              onClick={() => setIsSidebarOpen(v => !v)}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              aria-label="Menu"
            >
              <span className="material-symbols-outlined text-xl">
                {isSidebarOpen ? 'menu_open' : 'menu'}
              </span>
            </button>
            <span className="material-symbols-outlined text-primary text-2xl sm:text-3xl shrink-0">
              calendar_month
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold leading-tight truncate">
                Planning Semaine
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">{getWeekRange()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLocked && (
              <span className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1.5 rounded-lg text-xs font-medium">
                <span className="material-symbols-outlined text-sm">lock</span>
                Mode suivi
              </span>
            )}
            <button
              onClick={handleLockToggle}
              className={[
                'px-3 sm:px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-sm',
                isLocked
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90',
              ].join(' ')}
            >
              <span className="material-symbols-outlined text-base">
                {isLocked ? 'lock_open' : 'lock'}
              </span>
              <span className="hidden sm:inline">{isLocked ? 'Modifier' : 'Verrouiller'}</span>
            </button>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="p-3 sm:p-6 flex-1 max-w-[1400px] mx-auto w-full">

          {/* Selected-member banner */}
          {selectedMember && !isLocked && (
            <div className={`mb-3 flex items-center gap-3 rounded-xl px-4 py-2.5 border-2 border-primary bg-primary/10`}>
              <div className={`size-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${COLOR_MAP[selectedMember.colorKey].bg}`}>
                {selectedMember.initial}
              </div>
              <p className="text-sm font-medium text-primary flex-1 min-w-0">
                <span className="font-bold">{selectedMember.name}</span>
                <span className="text-slate-600 font-normal"> — touchez une case pour assigner</span>
              </p>
              <button
                onClick={() => setSelectedMemberId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 shrink-0 rounded-lg hover:bg-white/60"
                aria-label="Désélectionner"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}

          {/* ── Planning table ── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Scroll shadow: fades right edge on mobile to hint at horizontal scroll */}
            <div className="relative">
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {/* Sticky chore-label column */}
                      <th className="p-2 sm:p-4 text-left bg-slate-50 border-b border-slate-200 sticky left-0 z-20 w-28 sm:w-52 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs sm:text-sm">
                          <span className="material-symbols-outlined text-slate-400 text-base sm:text-lg">checklist</span>
                          <span className="hidden sm:inline">Tâches</span>
                        </div>
                      </th>
                      {DAYS.map((day, idx) => {
                        const isPast  = idx < TODAY_INDEX;
                        const isToday = idx === TODAY_INDEX;
                        return (
                          <th
                            key={day.id}
                            className={[
                              'p-2 text-center font-semibold border-b border-l min-w-[68px] sm:min-w-[92px]',
                              isToday ? 'bg-primary text-white border-primary'
                                : isPast  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200',
                            ].join(' ')}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs sm:text-sm font-semibold">{day.short}</span>
                              {isToday && (
                                <span className="text-[9px] sm:text-[10px] font-normal bg-white/25 px-1.5 py-0.5 rounded-full">
                                  Auj.
                                </span>
                              )}
                              {isPast && (
                                <span className="text-[9px] font-normal opacity-60 hidden sm:block">Passé</span>
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

                        {/* Sticky chore label */}
                        <td className="p-2 sm:p-3 bg-white border-r border-slate-100 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center gap-1.5 sm:gap-3">
                            <span className={`material-symbols-outlined ${chore.iconColor} text-base sm:text-xl shrink-0`}>
                              {chore.icon}
                            </span>
                            <span className="font-medium text-[10px] sm:text-sm text-slate-700 leading-tight line-clamp-2">
                              {chore.name}
                            </span>
                          </div>
                        </td>

                        {/* Day cells */}
                        {DAYS.map((day, dayIdx) => {
                          const key          = `${chore.id}-${day.id}`;
                          const assignedId   = assignments[key];
                          const member       = assignedId ? members.find(m => m.id === assignedId) : null;
                          const isDone       = !!completed[key];
                          const colors       = member ? COLOR_MAP[member.colorKey] : null;
                          const isPast       = dayIdx < TODAY_INDEX;
                          const isToday      = dayIdx === TODAY_INDEX;
                          const isFuture     = dayIdx > TODAY_INDEX;
                          const countsForScore = !isFuture;
                          const isDragTarget = dragOverKey === key && !isLocked;
                          const isAssignTarget = !!selectedMemberId && !isLocked;

                          return (
                            <td
                              key={day.id}
                              className={[
                                'p-1 sm:p-1.5 border-l transition-colors',
                                'h-[60px] sm:h-20',
                                isToday ? 'bg-primary/5 border-primary/20' : 'border-slate-100',
                                isDragTarget ? 'bg-primary/10' : '',
                              ].join(' ')}
                              onDragOver={e => handleDragOver(e, key)}
                              onDragLeave={handleDragLeave}
                              onDrop={e => handleDrop(e, chore.id, day.id)}
                              onClick={() => handleCellClick(chore.id, day.id)}
                            >
                              {/* ── Assigned cell ── */}
                              {member && colors ? (
                                <div
                                  className={[
                                    'w-full h-full flex flex-col items-center justify-center rounded-lg sm:rounded-xl',
                                    'text-[10px] sm:text-xs font-bold transition-all select-none',
                                    // Cursor / scale feedback
                                    isLocked && countsForScore ? 'cursor-pointer active:scale-95'
                                      : isLocked && isFuture   ? 'cursor-default opacity-55'
                                      : !isLocked              ? 'cursor-pointer active:scale-95' : '',
                                    // Colors
                                    isDone && countsForScore
                                      ? 'bg-green-100 text-green-800 ring-2 ring-green-400'
                                      : isDone && isFuture
                                      ? 'bg-slate-100 text-slate-400 ring-2 ring-slate-300'
                                      : selectedMemberId === assignedId && !isLocked
                                      ? `${colors.lightBg} ${colors.text} ring-2 ring-primary/60`
                                      : `${colors.lightBg} ${colors.text}`,
                                  ].join(' ')}
                                  title={
                                    !isLocked ? 'Toucher pour retirer'
                                      : isFuture ? 'Jour à venir'
                                      : isDone   ? 'Marquer comme non fait'
                                      : 'Marquer comme fait !'
                                  }
                                >
                                  {isDone ? (
                                    <>
                                      <span className={`text-base sm:text-xl leading-none ${isFuture ? 'opacity-40' : ''}`}>✅</span>
                                      <span className="mt-0.5 hidden sm:block">{member.name}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>{member.name}</span>
                                      {isLocked && countsForScore && (
                                        <span className="text-[8px] opacity-50 mt-0.5 hidden sm:block">Toucher ✓</span>
                                      )}
                                    </>
                                  )}
                                </div>

                              ) : (
                                /* ── Empty cell ── */
                                !isLocked && (
                                  <div
                                    className={[
                                      'w-full h-full border-2 border-dashed rounded-lg sm:rounded-xl',
                                      'flex items-center justify-center transition-all',
                                      isDragTarget   ? 'border-primary bg-primary/10 scale-105'
                                        : isAssignTarget ? 'border-primary/50 bg-primary/5'
                                        : 'border-slate-200 group-hover:border-primary/30 group-hover:bg-primary/5',
                                    ].join(' ')}
                                  >
                                    <span
                                      className={[
                                        'material-symbols-outlined text-lg transition-opacity',
                                        isDragTarget || isAssignTarget
                                          ? 'text-primary opacity-70'
                                          : 'text-slate-300 opacity-0 group-hover:opacity-50',
                                      ].join(' ')}
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
              {/* Right-edge scroll hint (mobile) */}
              <div className="absolute top-0 right-0 bottom-0 w-5 bg-gradient-to-l from-white/80 to-transparent pointer-events-none sm:hidden rounded-r-2xl" />
            </div>
          </div>

          {/* ══════════════════ DASHBOARD ══════════════════ */}
          <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

            {/* Progression */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm sm:text-base font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">trending_up</span>
                Progression de la tribu
              </h3>

              {/* Global bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 font-medium">Tâches accomplies</span>
                  <span className="font-bold text-primary">
                    {completedCount} / {totalAssigned || CHORES.length * DAYS.length}
                  </span>
                </div>
                <div className="w-full h-3 sm:h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-right text-sm font-bold text-primary mt-1">{progressPct}%</p>
              </div>

              {/* Per-member cards — 2 cols on mobile, up to 4 on sm+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {members.map(member => {
                  const memberTasks = Object.keys(assignments).filter(k => assignments[k] === member.id).length;
                  const memberDone  = scores[member.id];
                  const pct         = memberTasks === 0 ? 0 : Math.round((memberDone / memberTasks) * 100);
                  const colors      = COLOR_MAP[member.colorKey];
                  return (
                    <div key={member.id} className={`p-2.5 sm:p-3 rounded-xl ${colors.cardBg}`}>
                      <div className={`size-8 sm:size-9 rounded-full ${colors.bg} text-white font-bold text-sm flex items-center justify-center mx-auto mb-1.5`}>
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
            <div className="bg-primary/5 p-4 sm:p-6 rounded-2xl border border-primary/20 flex flex-col gap-4 relative overflow-hidden">
              {/* Decorative */}
              <div className="absolute -right-8 -top-8 text-primary/10 rotate-12 pointer-events-none select-none">
                <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>celebration</span>
              </div>

              {/* Tip */}
              <div className="flex items-start gap-3 relative z-10">
                <span className="material-symbols-outlined text-primary shrink-0">tips_and_updates</span>
                <div>
                  <h4 className="font-bold text-primary mb-1">Astuce</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {isLocked
                      ? 'Touchez vos tâches pour les valider et gagner des points ! Seuls les jours passés comptent. 🎯'
                      : selectedMemberId
                      ? `${selectedMember?.name} est sélectionné·e — touchez maintenant les cases du tableau pour assigner.`
                      : 'Sur mobile : touchez un membre ici puis une case. Sur ordinateur : glissez-déposez. 👆'}
                  </p>
                </div>
              </div>

              {/* Reward card */}
              <div className="flex items-center gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-primary/10 shadow-sm relative z-10">
                <div className="size-10 sm:size-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl sm:text-2xl">workspace_premium</span>
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingReward ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={rewardPeriod}
                        onChange={e => setRewardPeriod(e.target.value as 'semaine' | 'mois')}
                        className="text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-primary"
                      >
                        <option value="semaine">Récompense de la semaine</option>
                        <option value="mois">Récompense du mois</option>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={rewardDescription}
                          onChange={e => setRewardDescription(e.target.value)}
                          className="text-sm font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-2 flex-1 outline-none focus:border-primary"
                          placeholder="Ex: Soirée Pizza"
                        />
                        <button
                          onClick={() => setIsEditingReward(false)}
                          className="bg-primary hover:bg-primary/90 text-white min-w-[40px] h-[40px] rounded-lg flex items-center justify-center transition-colors shrink-0"
                          aria-label="Valider"
                        >
                          <span className="material-symbols-outlined text-base">check</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                          Récompense {rewardPeriod === 'semaine' ? 'de la semaine' : 'du mois'}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 truncate">
                          {rewardDescription}
                        </p>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={() => setIsEditingReward(true)}
                          className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/10 shrink-0"
                          aria-label="Modifier la récompense"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Winner banner */}
              {winners.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl relative z-10">
                  <span className="text-2xl shrink-0">🏆</span>
                  <div>
                    <p className="text-xs text-yellow-700 font-medium">En tête cette semaine</p>
                    <p className="font-bold text-yellow-800 text-sm">
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
