import React from 'react';
import type { Member, Chore, Day, Role } from '../types';
import { COLOR_MAP, TODAY_INDEX } from '../constants';

interface ChoreGridProps {
  chores:            Chore[];
  days:              Day[];
  members:           Member[];
  assignments:       Record<string, string>;
  completed:         Record<string, boolean>;
  isLocked:          boolean;
  role:              Role | null;
  viewerMemberId:    string | null;
  selectedMemberId:  string | null;
  dragOverKey:       string | null;
  onCellClick:       (choreId: string, dayId: string) => void;
  onDragOver:        (e: React.DragEvent, key: string) => void;
  onDragLeave:       () => void;
  onDrop:            (e: React.DragEvent, choreId: string, dayId: string) => void;
}

export function ChoreGrid({
  chores, days, members, assignments, completed, isLocked,
  role, viewerMemberId,
  selectedMemberId, dragOverKey, onCellClick, onDragOver, onDragLeave, onDrop,
}: ChoreGridProps) {
  const isParent = role === 'parent';
  const isChild  = role === 'child';
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="relative">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 sm:p-4 text-left bg-slate-50 border-b border-slate-200 sticky left-0 z-20 w-28 sm:w-52 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs sm:text-sm">
                    <span className="material-symbols-outlined text-slate-400 text-base sm:text-lg">checklist</span>
                    <span className="hidden sm:inline">Tâches</span>
                  </div>
                </th>
                {days.map((day, idx) => {
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
              {chores.map(chore => (
                <tr key={chore.id} className="group">
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

                  {days.map((day, dayIdx) => {
                    const key            = `${chore.id}-${day.id}`;
                    const assignedId     = assignments[key];
                    const member         = assignedId ? members.find(m => m.id === assignedId) : null;
                    const isDone         = !!completed[key];
                    const colors         = member ? COLOR_MAP[member.colorKey] : null;
                    const isToday        = dayIdx === TODAY_INDEX;
                    const isFuture       = dayIdx > TODAY_INDEX;
                    const countsForScore = !isFuture;
                    const isDragTarget   = isParent && dragOverKey === key && !isLocked;
                    const isAssignTarget = isParent && !!selectedMemberId && !isLocked;
                    const canCompleteCell = (isParent && isLocked) ||
                      (isChild && !!assignedId && assignedId === viewerMemberId);
                    const canAssignCell   = isParent && !isLocked;
                    const cellClickable   = countsForScore && (canCompleteCell || canAssignCell);

                    return (
                      <td
                        key={day.id}
                        className={[
                          'p-1 sm:p-1.5 border-l transition-colors',
                          'h-[60px] sm:h-20',
                          isToday ? 'bg-primary/5 border-primary/20' : 'border-slate-100',
                          isDragTarget ? 'bg-primary/10' : '',
                        ].join(' ')}
                        onDragOver={e => onDragOver(e, key)}
                        onDragLeave={onDragLeave}
                        onDrop={e => onDrop(e, chore.id, day.id)}
                        onClick={() => onCellClick(chore.id, day.id)}
                      >
                        {member && colors ? (
                          <div
                            className={[
                              'w-full h-full flex flex-col items-center justify-center rounded-lg sm:rounded-xl',
                              'text-[10px] sm:text-xs font-bold transition-all select-none',
                              cellClickable ? 'cursor-pointer active:scale-95'
                                : isFuture   ? 'cursor-default opacity-55'
                                : 'cursor-default',
                              isDone && countsForScore
                                ? 'bg-green-100 text-green-800 ring-2 ring-green-400'
                                : isDone && isFuture
                                ? 'bg-slate-100 text-slate-400 ring-2 ring-slate-300'
                                : selectedMemberId === assignedId && canAssignCell
                                ? `${colors.lightBg} ${colors.text} ring-2 ring-primary/60`
                                : `${colors.lightBg} ${colors.text}`,
                            ].join(' ')}
                            title={
                              canAssignCell ? 'Toucher pour retirer'
                                : isFuture ? 'Jour à venir'
                                : !canCompleteCell ? 'Pas ta tâche'
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
                                {canCompleteCell && countsForScore && (
                                  <span className="text-[8px] opacity-50 mt-0.5 hidden sm:block">Toucher ✓</span>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          canAssignCell && (
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
        <div className="absolute top-0 right-0 bottom-0 w-5 bg-gradient-to-l from-white/80 to-transparent pointer-events-none sm:hidden rounded-r-2xl" />
      </div>
    </div>
  );
}
