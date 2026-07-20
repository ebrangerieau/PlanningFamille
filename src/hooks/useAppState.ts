import React, { useState, useMemo } from 'react';
import type { Chore, Identity, Member, WeekHistory } from '../types';
import { CHORES, COLOR_KEYS, DEFAULT_MEMBERS, DAYS, TODAY_INDEX } from '../constants';
import { getISOWeekId } from '../utils/date';

export function useAppState(identity: Identity | null) {
  const role     = identity?.role ?? null;
  const isParent = role === 'parent';
  const isShared = role === 'shared';
  const [isSidebarOpen,      setIsSidebarOpen]      = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  );
  const [isLocked,           setIsLocked]           = useState(false);
  const [assignments,        setAssignments]        = useState<Record<string, string>>({});
  const [completed,          setCompleted]          = useState<Record<string, boolean>>({});
  const [rewardPeriod,       setRewardPeriod]       = useState<'semaine' | 'mois'>('semaine');
  const [rewardDescription,  setRewardDescription]  = useState('Soirée Cinéma + Pizza 🍕');
  const [isEditingReward,    setIsEditingReward]    = useState(false);
  const [dragOverKey,        setDragOverKey]        = useState<string | null>(null);
  const [selectedMemberId,   setSelectedMemberId]   = useState<string | null>(null);
  const [members,            setMembers]            = useState<Member[]>(DEFAULT_MEMBERS);
  const [chores,             setChores]             = useState<Chore[]>(CHORES);
  const [editingMemberId,    setEditingMemberId]    = useState<string | null>(null);
  const [editName,           setEditName]           = useState('');
  const [currentWeek,        setCurrentWeek]        = useState(getISOWeekId());
  const [history,            setHistory]            = useState<WeekHistory[]>([]);
  const [statsPeriod,        setStatsPeriod]        = useState<'week' | 'lastWeek' | 'month' | 'all'>('week');
  const [isLoading,          setIsLoading]          = useState(true);

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

  const maxScore      = Math.max(...(Object.values(scores) as number[]), 0);
  const winners       = members.filter(m => scores[m.id] === maxScore && maxScore > 0);
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => scores[b.id] - scores[a.id]),
    [scores, members],
  );
  const memberRanks = useMemo(() => {
    const unique = [...new Set(Object.values(scores) as number[])].sort((a, b) => b - a);
    const ranks: Record<string, number> = {};
    members.forEach(m => { ranks[m.id] = unique.indexOf(scores[m.id]); });
    return ranks;
  }, [scores, members]);

  const selectedMember = selectedMemberId ? members.find(m => m.id === selectedMemberId) : null;

  // --- Actions (gated by role) ---
  const handleLockToggle = () => {
    if (!isParent) return;
    setIsLocked(v => !v);
    setSelectedMemberId(null);
    setEditingMemberId(null);
  };

  const handleMemberTap = (memberId: string) => {
    if (!isParent || isLocked || editingMemberId) return;
    setSelectedMemberId(prev => (prev === memberId ? null : memberId));
  };

  const handleStartEdit = (memberId: string) => {
    if (!isParent) return;
    const m = members.find(x => x.id === memberId);
    if (!m) return;
    setEditingMemberId(memberId);
    setEditName(m.name);
    setSelectedMemberId(null);
  };

  const handleRename = (memberId: string) => {
    if (!isParent) return;
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
    if (!isParent) return;
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setAssignments(prev => {
      const n = { ...prev };
      Object.keys(n).forEach(k => { if (n[k] === memberId) delete n[k]; });
      return n;
    });
    if (selectedMemberId === memberId) setSelectedMemberId(null);
    setEditingMemberId(null);
  };

  const handleAddMember = () => {
    if (!isParent) return;
    const id       = `m_${Date.now()}`;
    const colorKey = COLOR_KEYS[members.length % COLOR_KEYS.length];
    setMembers(prev => [...prev, { id, name: 'Nouveau', initial: 'N', colorKey }]);
    setEditingMemberId(id);
    setEditName('Nouveau');
    setSelectedMemberId(null);
  };

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    if (!isParent || isLocked) { e.preventDefault(); return; }
    e.dataTransfer.setData('memberId', memberId);
    e.dataTransfer.effectAllowed = 'copy';
    setSelectedMemberId(null);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    if (!isParent || isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverKey(key);
  };

  const handleDragLeave = () => setDragOverKey(null);

  const handleDrop = (e: React.DragEvent, choreId: string, dayId: string) => {
    if (!isParent || isLocked) return;
    e.preventDefault();
    const memberId = e.dataTransfer.getData('memberId');
    if (memberId) {
      const key = `${choreId}-${dayId}`;
      setAssignments(prev => ({ ...prev, [key]: memberId }));
      setCompleted(prev => ({ ...prev, [key]: false }));
    }
    setDragOverKey(null);
  };

  const handleCellClick = (choreId: string, dayId: string) => {
    const key      = `${choreId}-${dayId}`;
    const dayIndex = DAYS.findIndex(d => d.id === dayId);

    // Parent non verrouillé : assignation / désassignation.
    if (isParent && !isLocked) {
      if (selectedMemberId) {
        if (assignments[key] === selectedMemberId) {
          setAssignments(prev => { const n = { ...prev }; delete n[key]; return n; });
          setCompleted(prev =>   { const n = { ...prev }; delete n[key]; return n; });
        } else {
          setAssignments(prev => ({ ...prev, [key]: selectedMemberId }));
          setCompleted(prev =>   ({ ...prev, [key]: false }));
        }
      } else if (assignments[key]) {
        setAssignments(prev => { const n = { ...prev }; delete n[key]; return n; });
        setCompleted(prev =>   { const n = { ...prev }; delete n[key]; return n; });
      }
      return;
    }

    // Validation d'une tâche (case cochée) : le jour doit être passé ou aujourd'hui.
    if (dayIndex > TODAY_INDEX || !assignments[key]) return;

    // Parent verrouillé : peut cocher n'importe quelle tâche.
    if (isParent && isLocked) {
      setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
      return;
    }

    // Écran familial partagé : peut valider toute tâche assignée.
    if (isShared) {
      setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  return {
    // Identity (derived)
    role, isParent, isShared,
    // UI state
    isSidebarOpen, setIsSidebarOpen,
    // App state
    isLocked, setIsLocked, isLoading, setIsLoading,
    assignments, setAssignments,
    completed, setCompleted,
    members, setMembers,
    chores, setChores,
    currentWeek, setCurrentWeek,
    history, setHistory,
    rewardPeriod, setRewardPeriod,
    rewardDescription, setRewardDescription,
    isEditingReward, setIsEditingReward,
    dragOverKey,
    selectedMemberId, setSelectedMemberId,
    editingMemberId, setEditingMemberId,
    editName, setEditName,
    statsPeriod, setStatsPeriod,
    // Derived
    scores, maxScore, winners, sortedMembers, memberRanks, selectedMember,
    // Actions
    handleLockToggle, handleMemberTap,
    handleStartEdit, handleRename, handleDeleteMember, handleAddMember,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    handleCellClick,
  };
}
