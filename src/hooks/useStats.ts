import { useMemo } from 'react';
import type { Member, WeekHistory } from '../types';
import { DAYS, TODAY_INDEX } from '../constants';
import { weekInMonth } from '../utils/date';

type StatsPeriod = 'week' | 'lastWeek' | 'month' | 'all';

interface UseStatsParams {
  statsPeriod:  StatsPeriod;
  members:      Member[];
  assignments:  Record<string, string>;
  completed:    Record<string, boolean>;
  history:      WeekHistory[];
  currentWeek:  string;
}

export interface PeriodData {
  scores:         Record<string, number>;
  taskCounts:     Record<string, number>;
  totalAssigned:  number;
  totalCompleted: number;
  progressPct:    number;
  weekCount:      number;
}

export function useStats({ statsPeriod, members, assignments, completed, history, currentWeek }: UseStatsParams): PeriodData {
  return useMemo(() => {
    type WE = { a: Record<string, string>; c: Record<string, boolean>; isCurrent: boolean };
    const weeks: WE[] = [];

    switch (statsPeriod) {
      case 'week':
        weeks.push({ a: assignments, c: completed, isCurrent: true });
        break;
      case 'lastWeek': {
        const last = history[history.length - 1];
        if (last) weeks.push({ a: last.assignments, c: last.completed, isCurrent: false });
        break;
      }
      case 'month': {
        const now = new Date();
        const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (weekInMonth(currentWeek, ym))
          weeks.push({ a: assignments, c: completed, isCurrent: true });
        history.forEach(h => {
          if (weekInMonth(h.week, ym))
            weeks.push({ a: h.assignments, c: h.completed, isCurrent: false });
        });
        break;
      }
      case 'all':
        weeks.push({ a: assignments, c: completed, isCurrent: true });
        history.forEach(h => weeks.push({ a: h.assignments, c: h.completed, isCurrent: false }));
        break;
    }

    const pScores: Record<string, number>    = {};
    const taskCounts: Record<string, number> = {};
    members.forEach(m => { pScores[m.id] = 0; taskCounts[m.id] = 0; });
    let totalAssigned = 0, totalCompleted = 0;

    weeks.forEach(({ a, c, isCurrent }) => {
      Object.entries(a).forEach(([key, memberId]) => {
        if (isCurrent) {
          const dayId  = key.split('-').pop()!;
          const dayIdx = DAYS.findIndex(d => d.id === dayId);
          if (dayIdx > TODAY_INDEX) return;
        }
        totalAssigned++;
        if (taskCounts[memberId] !== undefined) taskCounts[memberId]++;
        if (c[key]) {
          totalCompleted++;
          if (pScores[memberId] !== undefined) pScores[memberId]++;
        }
      });
    });

    const progressPct = totalAssigned === 0 ? 0 : Math.round((totalCompleted / totalAssigned) * 100);
    return { scores: pScores, taskCounts, totalAssigned, totalCompleted, progressPct, weekCount: weeks.length };
  }, [statsPeriod, members, assignments, completed, history, currentWeek]);
}
