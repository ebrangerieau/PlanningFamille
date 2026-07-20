import { useEffect, useRef } from 'react';
import type { Chore, Member, WeekHistory } from '../types';
import { getISOWeekId } from '../utils/date';

interface PersistenceState {
  isLoading:          boolean;
  setIsLoading:       (v: boolean) => void;
  members:            Member[];
  setMembers:         (v: Member[]) => void;
  chores:             Chore[];
  setChores:          (v: Chore[]) => void;
  assignments:        Record<string, string>;
  setAssignments:     (v: Record<string, string>) => void;
  completed:          Record<string, boolean>;
  setCompleted:       (v: Record<string, boolean>) => void;
  currentWeek:        string;
  setCurrentWeek:     (v: string) => void;
  history:            WeekHistory[];
  setHistory:         (v: WeekHistory[]) => void;
  rewardPeriod:       'semaine' | 'mois';
  setRewardPeriod:    (v: 'semaine' | 'mois') => void;
  rewardDescription:  string;
  setRewardDescription:(v: string) => void;
  isLocked:           boolean;
  setIsLocked:        (v: boolean) => void;
}

export function usePersistence(state: PersistenceState) {
  const {
    isLoading, setIsLoading,
    members, setMembers,
    chores, setChores,
    assignments, setAssignments,
    completed, setCompleted,
    currentWeek, setCurrentWeek,
    history, setHistory,
    rewardPeriod, setRewardPeriod,
    rewardDescription, setRewardDescription,
    isLocked, setIsLocked,
  } = state;

  const skipNextSave = useRef(true);
  const latestState  = useRef<object>({});
  latestState.current = { members, assignments, completed, currentWeek, history, rewardPeriod, rewardDescription, isLocked };

  // Chargement initial + archivage automatique de semaine
  useEffect(() => {
    fetch('/api/state')
      .then(r => r.json())
      .then((data: Record<string, unknown>) => {
        if (Array.isArray(data.members))
          setMembers(data.members as Member[]);
        if (Array.isArray(data.chores))
          setChores(data.chores as Chore[]);
        if (data.assignments && typeof data.assignments === 'object')
          setAssignments(data.assignments as Record<string, string>);
        if (data.rewardPeriod === 'semaine' || data.rewardPeriod === 'mois')
          setRewardPeriod(data.rewardPeriod);
        if (typeof data.rewardDescription === 'string')
          setRewardDescription(data.rewardDescription);
        if (typeof data.isLocked === 'boolean')
          setIsLocked(data.isLocked);

        const thisWeek      = getISOWeekId();
        const savedWeek     = typeof data.currentWeek === 'string' ? data.currentWeek : null;
        const loadedHistory = Array.isArray(data.history) ? data.history as WeekHistory[] : [];
        const oldCompleted  = (data.completed && typeof data.completed === 'object')
          ? data.completed as Record<string, boolean> : {};
        const oldAssign     = (data.assignments && typeof data.assignments === 'object')
          ? data.assignments as Record<string, string> : {};

        if (savedWeek && savedWeek !== thisWeek) {
          // Nouvelle semaine → archiver l'ancienne, repartir à zéro
          const archived: WeekHistory = { week: savedWeek, assignments: oldAssign, completed: oldCompleted };
          setHistory([...loadedHistory, archived]);
          setCompleted({});
        } else {
          setCompleted(oldCompleted);
          setHistory(loadedHistory);
        }
        setCurrentWeek(thisWeek);
      })
      .catch(() => { /* serveur indisponible → état par défaut */ })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde immédiate après chaque modification
  useEffect(() => {
    if (isLoading) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members, assignments, completed, currentWeek, history, rewardPeriod, rewardDescription, isLocked }),
    }).catch(() => {});
  }, [members, chores, assignments, completed, currentWeek, history, rewardPeriod, rewardDescription, isLocked, isLoading]);

  // sendBeacon sur fermeture de page
  useEffect(() => {
    const onUnload = () => {
      navigator.sendBeacon(
        '/api/state',
        new Blob([JSON.stringify(latestState.current)], { type: 'application/json' }),
      );
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);
}
