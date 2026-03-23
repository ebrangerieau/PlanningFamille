import React from 'react';
import { getWeekRange } from '../utils/date';

interface AppHeaderProps {
  isSidebarOpen:    boolean;
  onToggleSidebar:  () => void;
  isLocked:         boolean;
  onLockToggle:     () => void;
}

export function AppHeader({ isSidebarOpen, onToggleSidebar, isLocked, onLockToggle }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 gap-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          aria-label="Menu"
        >
          <span className="material-symbols-outlined text-xl">
            {isSidebarOpen ? 'menu_open' : 'menu'}
          </span>
        </button>
        <span className="material-symbols-outlined text-primary text-2xl sm:text-3xl shrink-0">
          calendar_month
        </span>
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold leading-tight truncate">
            Planning Semaine
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">{getWeekRange()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isLocked && (
          <span className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1.5 rounded-lg text-xs font-medium">
            <span className="material-symbols-outlined text-sm">lock</span>
            Mode suivi
          </span>
        )}
        <button
          onClick={onLockToggle}
          className={[
            'px-3 sm:px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-sm',
            isLocked
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90',
          ].join(' ')}
        >
          <span className="material-symbols-outlined text-base">
            {isLocked ? 'lock_open' : 'lock'}
          </span>
          <span className="hidden sm:inline">{isLocked ? 'Modifier' : 'Verrouiller'}</span>
        </button>
      </div>
    </header>
  );
}
