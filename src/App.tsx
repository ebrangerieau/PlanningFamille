import React, { useState, useMemo } from 'react';

// --- Types & Constants ---
type Member = { id: string; name: string; initial: string; colorKey: 'blue' | 'purple' | 'pink' | 'orange' };
type Chore = { id: string; name: string; icon: string; iconColor: string };
type Day = { id: string; name: string };

const MEMBERS: Member[] = [
  { id: 'tom', name: 'Tom', initial: 'T', colorKey: 'blue' },
  { id: 'jules', name: 'Jules', initial: 'J', colorKey: 'purple' },
  { id: 'karine', name: 'Karine', initial: 'K', colorKey: 'pink' },
  { id: 'eric', name: 'Eric', initial: 'E', colorKey: 'orange' },
];

const CHORES: Chore[] = [
  { id: 'c1', name: 'Mettre la table', icon: 'restaurant', iconColor: 'text-orange-400' },
  { id: 'c2', name: 'Débarrasser', icon: 'cleaning_services', iconColor: 'text-green-400' },
  { id: 'c3', name: 'Lave-vaisselle', icon: 'flatware', iconColor: 'text-blue-400' },
  { id: 'c4', name: 'Chauffer repas', icon: 'microwave', iconColor: 'text-red-400' },
  { id: 'c5', name: 'Nettoyer plan', icon: 'countertops', iconColor: 'text-cyan-400' },
  { id: 'c6', name: "Passer l'aspiro", icon: 'vacuum', iconColor: 'text-purple-400' },
];

const DAYS: Day[] = [
  { id: 'mon', name: 'Lun' }, { id: 'tue', name: 'Mar' }, { id: 'wed', name: 'Mer' },
  { id: 'thu', name: 'Jeu' }, { id: 'fri', name: 'Ven' }, { id: 'sat', name: 'Sam' }, { id: 'sun', name: 'Dim' },
];

const COLOR_MAP = {
  blue: { bg: 'bg-blue-500', lightBg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-100', cardBg: 'bg-blue-50' },
  purple: { bg: 'bg-purple-500', lightBg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-100', cardBg: 'bg-purple-50' },
  pink: { bg: 'bg-pink-500', lightBg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-100', cardBg: 'bg-pink-50' },
  orange: { bg: 'bg-orange-500', lightBg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-100', cardBg: 'bg-orange-50' },
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  // assignments: key is `${choreId}-${dayId}`, value is memberId
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  // completed: key is `${choreId}-${dayId}`, value is boolean
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  
  // Reward state
  const [rewardPeriod, setRewardPeriod] = useState<'semaine' | 'mois'>('semaine');
  const [rewardDescription, setRewardDescription] = useState('Soirée Cinéma + Pizza 🍕');
  const [isEditingReward, setIsEditingReward] = useState(false);

  // Calculate scores
  const scores = useMemo(() => {
    const newScores: Record<string, number> = {};
    MEMBERS.forEach(m => newScores[m.id] = 0);
    Object.entries(completed).forEach(([key, isDone]) => {
      if (isDone && assignments[key]) {
        newScores[assignments[key]]++;
      }
    });
    return newScores;
  }, [assignments, completed]);

  const maxScore = Math.max(...Object.values(scores), 0);
  const winners = MEMBERS.filter(m => scores[m.id] === maxScore && maxScore > 0);

  const totalTasks = Object.keys(assignments).length;
  const completedTasksCount = Object.values(completed).filter(Boolean).length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasksCount / totalTasks) * 100);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('memberId', memberId);
  };

  const handleDrop = (e: React.DragEvent, choreId: string, dayId: string) => {
    if (isLocked) return;
    e.preventDefault();
    const memberId = e.dataTransfer.getData('memberId');
    if (memberId) {
      const key = `${choreId}-${dayId}`;
      setAssignments(prev => ({ ...prev, [key]: memberId }));
      // Reset completion status if reassigned
      setCompleted(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isLocked) e.preventDefault();
  };

  // Cell Click Handler
  const handleCellClick = (choreId: string, dayId: string) => {
    const key = `${choreId}-${dayId}`;
    if (!isLocked) {
      // In edit mode, clicking an assigned cell removes the assignment
      if (assignments[key]) {
        setAssignments(prev => {
          const newAss = { ...prev };
          delete newAss[key];
          return newAss;
        });
        setCompleted(prev => {
          const newComp = { ...prev };
          delete newComp[key];
          return newComp;
        });
      }
    } else {
      // In locked mode, clicking toggles completion
      if (assignments[key]) {
        setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
      }
    }
  };

  return (
    <div className="bg-background-light text-slate-900 flex min-h-screen font-display overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-6 flex items-center gap-3 w-72">
          <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined">family_history</span>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-slate-900">La Tribu</h1>
            <p className="text-xs text-slate-500">Gestion familiale</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-6 overflow-y-auto w-72">
          <div className="space-y-1">
            <a className="flex items-center gap-3 px-4 py-2 text-primary bg-primary/10 rounded-xl font-medium" href="#">
              <span className="material-symbols-outlined">grid_view</span>
              Tableau de bord
            </a>
          </div>

          <div>
            <h2 className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Membres</h2>
            <div className="space-y-3">
              {MEMBERS.map(member => {
                const colors = COLOR_MAP[member.colorKey];
                const isWinner = winners.some(w => w.id === member.id);
                return (
                  <div
                    key={member.id}
                    draggable={!isLocked}
                    onDragStart={(e) => handleDragStart(e, member.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-transform ${
                      !isLocked ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : 'cursor-default opacity-80'
                    } ${colors.cardBg} ${colors.border} ${isWinner ? 'ring-2 ring-yellow-400 shadow-md bg-yellow-50' : ''}`}
                  >
                    <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold ${colors.bg}`}>
                      {member.initial}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold flex items-center gap-2">
                        {member.name}
                        {isWinner && <span className="material-symbols-outlined text-yellow-500 text-sm" title="En tête !">star</span>}
                      </p>
                      <p className={`text-xs ${colors.text}`}>{scores[member.id]} pts</p>
                    </div>
                    {!isLocked && <span className="material-symbols-outlined text-slate-300 text-sm">drag_indicator</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title={isSidebarOpen ? "Masquer le volet" : "Afficher le volet"}
            >
              <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <span className="material-symbols-outlined text-primary text-3xl">calendar_month</span>
            <h2 className="text-2xl font-bold tracking-tight">Planning de la Semaine</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isLocked
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{isLocked ? 'lock' : 'edit'}</span>
              {isLocked ? 'Verrouillé' : 'Modifier'}
            </button>
          </div>
        </header>

        <div className="p-8 flex-1 max-w-7xl mx-auto w-full">
          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 text-left font-semibold text-slate-500 border-b border-slate-200 w-48">Tâches</th>
                    {DAYS.map(day => (
                      <th key={day.id} className="p-4 text-center font-semibold text-slate-900 border-b border-slate-200 min-w-[100px]">
                        {day.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CHORES.map(chore => (
                    <tr key={chore.id}>
                      <td className="p-4 bg-slate-50/30">
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined ${chore.iconColor}`}>{chore.icon}</span>
                          <span className="font-medium text-sm">{chore.name}</span>
                        </div>
                      </td>
                      {DAYS.map(day => {
                        const key = `${chore.id}-${day.id}`;
                        const assignedMemberId = assignments[key];
                        const member = assignedMemberId ? MEMBERS.find(m => m.id === assignedMemberId) : null;
                        const isDone = completed[key];
                        const colors = member ? COLOR_MAP[member.colorKey] : null;

                        return (
                          <td
                            key={day.id}
                            className={`p-2 border-l border-slate-100 h-20 relative transition-colors ${
                              !isLocked ? 'hover:bg-slate-50' : ''
                            }`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, chore.id, day.id)}
                            onClick={() => handleCellClick(chore.id, day.id)}
                          >
                            {member && colors && (
                              <div
                                className={`w-full h-full flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all ${
                                  isLocked ? 'cursor-pointer hover:scale-105' : 'cursor-pointer hover:opacity-80'
                                } ${colors.lightBg} ${colors.text} ${isDone ? 'ring-2 ring-green-500 bg-green-50 text-green-700' : ''}`}
                                title={!isLocked ? "Cliquer pour retirer" : (isDone ? "Marquer comme non fait" : "Marquer comme fait")}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span>{member.name}</span>
                                  {isDone && <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>}
                                </div>
                              </div>
                            )}
                            {!member && !isLocked && (
                              <div className="w-full h-full border-2 border-dashed border-transparent hover:border-slate-300 rounded-lg flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-xl opacity-0 hover:opacity-100">add</span>
                              </div>
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

          {/* Bottom Dashboard */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">trending_up</span>
                Progression de la tribu
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">Tâches accomplies</span>
                    <span className="font-bold text-primary">{completedTasksCount} / {totalTasks || 60}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {MEMBERS.map(member => {
                    const memberTasks = Object.keys(assignments).filter(k => assignments[k] === member.id).length;
                    const memberCompleted = scores[member.id];
                    const memberProgress = memberTasks === 0 ? 0 : Math.round((memberCompleted / memberTasks) * 100);
                    return (
                      <div key={member.id} className="p-2 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 uppercase font-semibold">{member.name}</p>
                        <p className="text-lg font-bold text-slate-800">{memberProgress}%</p>
                        <p className="text-[10px] text-slate-400">{memberCompleted}/{memberTasks}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 flex flex-col justify-center relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute -right-10 -top-10 text-primary/10 rotate-12 pointer-events-none">
                <span className="material-symbols-outlined" style={{ fontSize: '150px' }}>celebration</span>
              </div>

              <div className="flex items-start gap-3 relative z-10">
                <span className="material-symbols-outlined text-primary">tips_and_updates</span>
                <div>
                  <h4 className="font-bold text-primary mb-1">Astuce</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {isLocked
                      ? "Le tableau est verrouillé. Cliquez sur vos tâches pour les marquer comme terminées et gagner des points !"
                      : "Glissez les membres dans le tableau pour assigner les tâches, puis cliquez sur 'Modifier' pour verrouiller le tableau."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4 bg-white p-4 rounded-xl border border-primary/10 shadow-sm relative z-10">
                <div className="size-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-2xl">workspace_premium</span>
                </div>
                <div className="flex-1">
                  {isEditingReward ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={rewardPeriod}
                        onChange={(e) => setRewardPeriod(e.target.value as 'semaine' | 'mois')}
                        className="text-xs text-slate-600 font-medium uppercase tracking-wide bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-primary"
                      >
                        <option value="semaine">Récompense de la semaine</option>
                        <option value="mois">Récompense du mois</option>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={rewardDescription}
                          onChange={(e) => setRewardDescription(e.target.value)}
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
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                          Récompense {rewardPeriod === 'semaine' ? 'de la semaine' : 'du mois'}
                        </p>
                        <p className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                          {rewardDescription}
                        </p>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={() => setIsEditingReward(true)}
                          className="text-slate-400 hover:text-primary transition-colors p-1"
                          title="Modifier la récompense"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
