import React from 'react';
import type { Member, WeekHistory } from '../types';
import { COLOR_MAP } from '../constants';
import type { PeriodData } from '../hooks/useStats';

type StatsPeriod = 'week' | 'lastWeek' | 'month' | 'all';

interface StatsPanelProps {
  periodData:       PeriodData;
  statsPeriod:      StatsPeriod;
  onPeriodChange:   (p: StatsPeriod) => void;
  members:          Member[];
  history:          WeekHistory[];
}

const PERIOD_BUTTONS: { key: StatsPeriod; label: string }[] = [
  { key: 'week',     label: 'Cette semaine' },
  { key: 'lastWeek', label: 'Sem. dernière' },
  { key: 'month',    label: 'Ce mois'       },
  { key: 'all',      label: 'Tout'          },
];

export function StatsPanel({ periodData, statsPeriod, onPeriodChange, members, history }: StatsPanelProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-sm sm:text-base font-bold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-xl">trending_up</span>
        Progression de la tribu
      </h3>

      {/* Sélecteur de période */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {PERIOD_BUTTONS.map(({ key, label }) => {
          const disabled = key === 'lastWeek' && history.length === 0;
          return (
            <button
              key={key}
              onClick={() => !disabled && onPeriodChange(key)}
              disabled={disabled}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                statsPeriod === key
                  ? 'bg-primary text-white shadow-sm'
                  : disabled
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {label}
              {key === 'all' && history.length > 0 && (
                <span className="ml-1 opacity-70">({history.length + 1})</span>
              )}
              {key === 'month' && periodData.weekCount > 1 && statsPeriod === 'month' && (
                <span className="ml-1 opacity-70">({periodData.weekCount} sem.)</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barre globale */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-slate-600 font-medium">Tâches accomplies</span>
          <span className="font-bold text-primary">
            {periodData.totalCompleted} / {periodData.totalAssigned || '—'}
          </span>
        </div>
        <div className="w-full h-3 sm:h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${periodData.progressPct}%` }}
          />
        </div>
        <p className="text-right text-sm font-bold text-primary mt-1">{periodData.progressPct}%</p>
      </div>

      {/* Cartes par membre */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {members.map(member => {
          const mTasks = periodData.taskCounts[member.id] || 0;
          const mDone  = periodData.scores[member.id] || 0;
          const pct    = mTasks === 0 ? 0 : Math.round((mDone / mTasks) * 100);
          const colors = COLOR_MAP[member.colorKey];
          return (
            <div key={member.id} className={`p-2.5 sm:p-3 rounded-xl ${colors.cardBg}`}>
              <div className={`size-8 sm:size-9 rounded-full ${colors.bg} text-white font-bold text-sm flex items-center justify-center mx-auto mb-1.5`}>
                {member.initial}
              </div>
              <p className="text-xs font-semibold text-slate-600">{member.name}</p>
              <p className={`text-xl font-bold ${colors.text}`}>{pct}%</p>
              <p className="text-[10px] text-slate-400">{mDone}/{mTasks} pts</p>
            </div>
          );
        })}
      </div>

      {periodData.totalAssigned === 0 && statsPeriod !== 'week' && (
        <p className="text-center text-sm text-slate-400 mt-3 italic">
          Aucune donnée pour cette période
        </p>
      )}
    </div>
  );
}
