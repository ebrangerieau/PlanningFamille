import { useState } from 'react';
import { DAYS, COLOR_MAP } from './constants';
import { useAppState } from './hooks/useAppState';
import { usePersistence } from './hooks/usePersistence';
import { useStats } from './hooks/useStats';
import { useIdentity } from './hooks/useIdentity';
import { Sidebar } from './components/Sidebar';
import { AppHeader } from './components/AppHeader';
import { ChoreGrid } from './components/ChoreGrid';
import { StatsPanel } from './components/StatsPanel';
import { RewardCard } from './components/RewardCard';
import { PairingGate } from './components/PairingGate';
import { PilotAdmin } from './components/PilotAdmin';
import { SettingsPanel } from './components/SettingsPanel';

type IdentityController = ReturnType<typeof useIdentity>;

function LoadingScreen({ label = 'Chargement du planning…' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center font-display">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <span className="material-symbols-outlined text-5xl text-primary animate-spin" style={{ animationDuration: '1.2s' }}>progress_activity</span>
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

function FamilyPlanning({ ident }: { ident: IdentityController }) {
  const state = useAppState(ident.identity);
  usePersistence(state);
  const periodData = useStats(state);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    role, isParent,
    isSidebarOpen, setIsSidebarOpen,
    isLocked, isLoading,
    assignments, completed, members, chores,
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

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="bg-background-light text-slate-900 flex min-h-screen font-display overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

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
        role={role}
        currentUser={null}
        deviceLabel={ident.session.device?.label ?? ''}
        familyName={ident.session.family?.name ?? 'La Tribu'}
        onOpenSettings={() => setSettingsOpen(true)}
        onChangeIdentity={() => void ident.unpairDevice()}
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
          familyName={ident.session.family?.name ?? 'La Tribu'}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(value => !value)}
          isLocked={isLocked}
          canToggleLock={isParent}
          canOpenSettings={isParent}
          onOpenSettings={() => setSettingsOpen(true)}
          onLockToggle={handleLockToggle}
        />

        <div className="p-3 sm:p-6 flex-1 max-w-[1400px] mx-auto w-full">
          {selectedMember && !isLocked && isParent && (
            <div className="mb-3 flex items-center gap-3 rounded-xl px-4 py-2.5 border-2 border-primary bg-primary/10">
              <div className={`size-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${COLOR_MAP[selectedMember.colorKey].bg}`}>{selectedMember.initial}</div>
              <p className="text-sm font-medium text-primary flex-1 min-w-0"><span className="font-bold">{selectedMember.name}</span><span className="text-slate-600 font-normal"> — touchez une case pour assigner</span></p>
              <button onClick={() => setSelectedMemberId(null)} className="p-1.5 text-slate-400 hover:text-slate-700 shrink-0 rounded-lg hover:bg-white/60" aria-label="Désélectionner"><span className="material-symbols-outlined text-lg">close</span></button>
            </div>
          )}

          {role === 'shared' && (
            <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800">
              Écran familial — touchez une tâche du jour ou passée pour la valider.
            </div>
          )}

          <ChoreGrid
            chores={chores}
            days={DAYS}
            members={members}
            assignments={assignments}
            completed={completed}
            isLocked={isLocked}
            role={role}
            viewerMemberId={null}
            selectedMemberId={selectedMemberId}
            dragOverKey={dragOverKey}
            onCellClick={handleCellClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

          <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <StatsPanel periodData={periodData} statsPeriod={statsPeriod} onPeriodChange={setStatsPeriod} members={members} history={history} />
            <RewardCard isLocked={isLocked} canEdit={isParent} rewardPeriod={rewardPeriod} rewardDescription={rewardDescription} isEditingReward={isEditingReward} winners={winners} maxScore={maxScore} selectedMember={selectedMember} onEdit={() => setIsEditingReward(true)} onSave={() => setIsEditingReward(false)} onPeriodChange={setRewardPeriod} onDescriptionChange={setRewardDescription} />
          </div>
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        adminUnlocked={Boolean(ident.session.adminUnlocked)}
        currentDeviceId={ident.session.device?.id}
        onClose={() => setSettingsOpen(false)}
        onVerifyPin={ident.verifyParentPin}
      />
    </div>
  );
}

function PlanningEntry() {
  const ident = useIdentity();
  if (ident.isSessionLoading) return <LoadingScreen label="Vérification de cet appareil…" />;
  if (!ident.session.paired || !ident.identity) return <PairingGate onPair={ident.pairDevice} />;
  return <FamilyPlanning ident={ident} />;
}

export default function App() {
  if (window.location.pathname === '/pilot') return <PilotAdmin />;
  return <PlanningEntry />;
}
