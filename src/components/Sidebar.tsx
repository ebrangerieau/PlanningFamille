import React from 'react';
import type { Member, Role } from '../types';
import { COLOR_MAP } from '../constants';
import { getWeekRange } from '../utils/date';
import { MemberCard } from './MemberCard';

interface SidebarProps {
  isOpen:            boolean;
  onClose:           () => void;
  isLocked:          boolean;
  members:           Member[];
  sortedMembers:     Member[];
  selectedMemberId:  string | null;
  selectedMember:    Member | null | undefined;
  editingMemberId:   string | null;
  editName:          string;
  scores:            Record<string, number>;
  memberRanks:       Record<string, number>;
  winners:           Member[];
  role:              Role | null;
  currentUser:       Member | null;
  deviceLabel:       string;
  familyName:        string;
  onOpenSettings:    () => void;
  onChangeIdentity:  () => void;
  onLockToggle:      () => void;
  onMemberTap:       (id: string) => void;
  onStartEdit:       (id: string) => void;
  onRename:          (id: string) => void;
  onDelete:          (id: string) => void;
  onAddMember:       () => void;
  onEditNameChange:  (v: string) => void;
  onCancelEdit:      () => void;
  onDragStart:       (e: React.DragEvent, id: string) => void;
}

export function Sidebar({
  isOpen, onClose, isLocked, members, sortedMembers, selectedMemberId,
  selectedMember, editingMemberId, editName, scores, memberRanks, winners,
  role, currentUser, deviceLabel, familyName, onOpenSettings, onChangeIdentity,
  onLockToggle, onMemberTap, onStartEdit, onRename, onDelete, onAddMember,
  onEditNameChange, onCancelEdit, onDragStart,
}: SidebarProps) {
  const isParent = role === 'parent';
  return (
    <aside
      className={[
        'fixed md:sticky top-0 left-0 h-screen z-50 md:z-auto',
        'bg-white border-r border-slate-200 flex flex-col',
        'transition-all duration-300 ease-in-out',
        isOpen
          ? 'translate-x-0 w-72'
          : '-translate-x-full w-72 md:translate-x-0 md:w-0 md:overflow-hidden',
      ].join(' ')}
    >
      <div className="w-72 flex flex-col h-full overflow-hidden">

        {/* Brand header */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined">family_history</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{familyName}</h1>
            <p className="text-xs text-slate-500 truncate">{getWeekRange()}</p>
          </div>
          <button
            className="md:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Identity banner */}
        <div className="px-4 pt-3 pb-1 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            {currentUser ? (
              <div className={`size-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${COLOR_MAP[currentUser.colorKey].bg}`}>
                {currentUser.initial}
              </div>
            ) : (
              <div className="size-7 rounded-full flex items-center justify-center bg-slate-300 text-white shrink-0">
                <span className="material-symbols-outlined text-base">
                  {role === 'parent' ? 'shield_person' : 'tablet'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">Vous êtes</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {role === 'parent' && `Adulte${deviceLabel ? ` — ${deviceLabel}` : ''}`}
                {role === 'shared' && `Écran familial${deviceLabel ? ` — ${deviceLabel}` : ''}`}
              </p>
            </div>
            <button
              onClick={onChangeIdentity}
              className="text-xs font-medium text-primary hover:underline shrink-0"
            >
              Dissocier
            </button>
          </div>
        </div>

        {/* Members / Leaderboard */}
        <div className="flex-1 px-4 py-4 overflow-y-auto overscroll-contain">

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isLocked ? '🏆 Classement' : '👥 Membres'}
            </h2>
            {!isLocked && isParent && (
              <span className="text-[10px] text-slate-400 italic">
                {selectedMemberId ? 'Toucher une case →' : 'Glisser ou toucher'}
              </span>
            )}
          </div>

          {!isLocked && isParent && (
            <p className={`text-xs mb-3 rounded-lg px-3 py-2 transition-all ${
              selectedMember
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-400 bg-slate-50'
            }`}>
              {selectedMember
                ? `${selectedMember.name} sélectionné·e — touchez une case`
                : "Touchez un membre puis une case pour l'assigner"}
            </p>
          )}

          <div className="space-y-2.5">
            {(isLocked ? sortedMembers : members).map(member => (
              <MemberCard
                key={member.id}
                member={member}
                isLocked={isLocked}
                isSelected={selectedMemberId === member.id}
                isEditing={editingMemberId === member.id}
                editName={editName}
                rank={memberRanks[member.id]}
                scores={scores}
                winners={winners}
                membersCount={members.length}
                editingMemberId={editingMemberId}
                canEdit={isParent}
                canConfigure={false}
                onTap={onMemberTap}
                onStartEdit={onStartEdit}
                onRename={onRename}
                onDelete={onDelete}
                onEditNameChange={onEditNameChange}
                onCancelEdit={onCancelEdit}
                onDragStart={onDragStart}
              />
            ))}
          </div>

          {isParent && (
            <button onClick={onOpenSettings} className="w-full mt-3 py-2.5 border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-slate-500 hover:text-primary rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
              <span className="material-symbols-outlined text-base">manage_accounts</span>
              Gérer les membres et les tâches
            </button>
          )}

          {isParent && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={onLockToggle}
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
          )}
        </div>
      </div>
    </aside>
  );
}
