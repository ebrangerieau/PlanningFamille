import React from 'react';
import type { Member } from '../types';
import { COLOR_MAP, RANK_EMOJI } from '../constants';

interface MemberCardProps {
  member:              Member;
  isLocked:            boolean;
  isSelected:          boolean;
  isEditing:           boolean;
  editName:            string;
  rank:                number;
  scores:              Record<string, number>;
  winners:             Member[];
  membersCount:        number;
  editingMemberId:     string | null;
  canEdit:             boolean;
  canConfigure:        boolean;
  onTap:               (id: string) => void;
  onStartEdit:         (id: string) => void;
  onRename:            (id: string) => void;
  onDelete:            (id: string) => void;
  onEditNameChange:    (v: string) => void;
  onCancelEdit:        () => void;
  onDragStart:         (e: React.DragEvent, id: string) => void;
}

export function MemberCard({
  member, isLocked, isSelected, isEditing, editName, rank, scores, winners,
  membersCount, editingMemberId, canEdit, canConfigure, onTap, onStartEdit, onRename, onDelete,
  onEditNameChange, onCancelEdit, onDragStart,
}: MemberCardProps) {
  const colors    = COLOR_MAP[member.colorKey];
  const isWinner  = winners.some(w => w.id === member.id);
  const scorePct  = Math.round((scores[member.id] / Math.max(...(Object.values(scores) as number[]), 1)) * 100);

  if (isEditing) {
    return (
      <div className="p-3 rounded-xl border-2 border-primary/50 bg-primary/5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className={`size-9 rounded-full flex items-center justify-center font-bold text-base text-white shrink-0 ${colors.bg}`}>
            {editName.trim()[0]?.toUpperCase() || '?'}
          </div>
          <input
            autoFocus
            value={editName}
            onChange={e => onEditNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRename(member.id);
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="flex-1 text-sm font-bold border border-primary/40 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary bg-white"
            placeholder="Prénom…"
            maxLength={20}
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onRename(member.id)}
            disabled={!editName.trim()}
            className="flex-1 py-1.5 bg-primary disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Enregistrer
          </button>
          <button
            onClick={onCancelEdit}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
            aria-label="Annuler"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
          {membersCount > 1 && (
            <button
              onClick={() => onDelete(member.id)}
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

  const canInteract = canEdit && !isLocked && !editingMemberId;
  return (
    <div
      draggable={canInteract}
      onDragStart={e => onDragStart(e, member.id)}
      onClick={() => canInteract && onTap(member.id)}
      className={[
        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all select-none',
        canInteract ? 'cursor-pointer active:scale-95' : 'cursor-default',
        isSelected
          ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
          : isWinner
          ? 'border-yellow-400 bg-yellow-50 shadow-sm'
          : `${colors.border} ${colors.cardBg}`,
      ].join(' ')}
    >
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
        ) : canEdit ? (
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isSelected ? '→ Touchez une case du tableau' : 'Glisser ou toucher'}
          </p>
        ) : null}
      </div>

      {isSelected ? (
        <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
      ) : !isLocked && canConfigure ? (
        <button
          onClick={e => { e.stopPropagation(); onStartEdit(member.id); }}
          className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
          aria-label={`Modifier ${member.name}`}
        >
          <span className="material-symbols-outlined text-base">edit</span>
        </button>
      ) : null}
    </div>
  );
}
