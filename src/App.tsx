import React from 'react';
import { CHORES, DAYS, COLOR_MAP } from './constants';
import { useAppState } from './hooks/useAppState';
import { usePersistence } from './hooks/usePersistence';
import { useStats } from './hooks/useStats';
import { Sidebar } from './components/Sidebar';
import { AppHeader } from './components/AppHeader';
import { ChoreGrid } from './components/ChoreGrid';
import { StatsPanel } from './components/StatsPanel';
import { RewardCard } from './components/RewardCard';

export default function App() {
  const state = useAppState();
  usePersistence(state);
  const periodData = useStats(state);

  const {
    isSidebarOpen, setIsSidebarOpen,
    isLocked, isLoading,
    assignments, completed, members,
    history,
    rewardPeriod, setRewardPeriod,
    rewardDescription, setRewardDescription,
    isEditingReward, setIsEditingReward,
    dragOverKey, selectedMemberId, setSelectedMemberId,
    editingMemberId, setEditingMemberId, editName, setEditName,
    statsPeriod, setStatsPeriod,
    scores, maxScore, winners, sortedMembers, memberRanks, selectedMember,
    handleLockToggle, handleMemberTap,
    handleStartEdit, handleRename, handleDeleteMember, handleAddMember,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    handleCellClick,
  } = state;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center font-display">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <span className="material-symbols-outlined text-5xl text-primary animate-spin" style={{ animationDuration: '1.2s' }}>
            progress_activity
          </span>
          <p className="text-sm font-medium">Chargement du planning…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light text-slate-900 flex min-h-screen font-display overflow-hidden">

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isLocked={isLocked}
        members={members}
        sortedMembers={sortedMembers}
        selectedMemberId={selectedMemberId}
        selectedMember={selectedMember}
        editingMemberId={editingMemberId}
        editName={editName}
        scores={scores}
        memberRanks={memberRanks}
        winners={winners}
        onLockToggle={handleLockToggle}
        onMemberTap={handleMemberTap}
        onStartEdit={handleStartEdit}
        onRename={handleRename}
        onDelete={handleDeleteMember}
        onAddMember={handleAddMember}
        onEditNameChange={setEditName}
        onCancelEdit={() => setEditingMemberId(null)}
        onDragStart={handleDragStart}
      />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">

        <AppHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(v => !v)}
          isLocked={isLocked}
          onLockToggle={handleLockToggle}
        />

        <div className="p-3 sm:p-6 flex-1 max-w-[1400px] mx-auto w-full">

          {/* Selected-member banner */}
          {selectedMember && !isLocked && (
            <div className="mb-3 flex items-center gap-3 rounded-xl px-4 py-2.5 border-2 border-primary bg-primary/10">
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

          <ChoreGrid
            chores={CHORES}
            days={DAYS}
            members={members}
            assignments={assignments}
            completed={completed}
            isLocked={isLocked}
            selectedMemberId={selectedMemberId}
            dragOverKey={dragOverKey}
            onCellClick={handleCellClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

          <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <StatsPanel
              periodData={periodData}
              statsPeriod={statsPeriod}
              onPeriodChange={setStatsPeriod}
              members={members}
              history={history}
            />
            <RewardCard
              isLocked={isLocked}
              rewardPeriod={rewardPeriod}
              rewardDescription={rewardDescription}
              isEditingReward={isEditingReward}
              winners={winners}
              maxScore={maxScore}
              selectedMember={selectedMember}
              onEdit={() => setIsEditingReward(true)}
              onSave={() => setIsEditingReward(false)}
              onPeriodChange={setRewardPeriod}
              onDescriptionChange={setRewardDescription}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
