import React from 'react';
import type { Member } from '../types';

interface RewardCardProps {
  isLocked:             boolean;
  rewardPeriod:         'semaine' | 'mois';
  rewardDescription:    string;
  isEditingReward:      boolean;
  winners:              Member[];
  maxScore:             number;
  selectedMember:       Member | null | undefined;
  onEdit:               () => void;
  onSave:               () => void;
  onPeriodChange:       (v: 'semaine' | 'mois') => void;
  onDescriptionChange:  (v: string) => void;
}

export function RewardCard({
  isLocked, rewardPeriod, rewardDescription, isEditingReward,
  winners, maxScore, selectedMember, onEdit, onSave,
  onPeriodChange, onDescriptionChange,
}: RewardCardProps) {
  return (
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
              : selectedMember
              ? `${selectedMember.name} est sélectionné·e — touchez maintenant les cases du tableau pour assigner.`
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
                onChange={e => onPeriodChange(e.target.value as 'semaine' | 'mois')}
                className="text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-primary"
              >
                <option value="semaine">Récompense de la semaine</option>
                <option value="mois">Récompense du mois</option>
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rewardDescription}
                  onChange={e => onDescriptionChange(e.target.value)}
                  className="text-sm font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-2 flex-1 outline-none focus:border-primary"
                  placeholder="Ex: Soirée Pizza"
                />
                <button
                  onClick={onSave}
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
                  onClick={onEdit}
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
  );
}
