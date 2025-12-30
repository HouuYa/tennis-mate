import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { BottomNav } from './components/BottomNav';
import { PlayerList } from './components/PlayerList';
import { MatchSchedule } from './components/MatchSchedule';
import { StatsView } from './components/StatsView';
import { LiveFeed } from './components/LiveFeed';
import { ToastContainer } from './components/Toast';
import { Tab } from './types';
import { useApp } from './context/AppContext';
import { ModeSelection } from './components/ModeSelection';

const MainLayout = () => {
  const { mode, switchMode } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PLAYERS);

  if (!mode) {
    return <ModeSelection />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-tennis-green selection:text-slate-900">
      <header className="p-4 flex items-center justify-center bg-slate-900 shadow-md border-b border-slate-800 sticky top-0 z-10">
        <h1 className="text-xl font-black italic tracking-tighter text-tennis-green flex items-center gap-2">
          <span className="w-3 h-3 bg-tennis-green rounded-full animate-pulse"></span>
          TENNIS MATE
        </h1>
        {mode && (
          <button
            onClick={() => window.location.reload()}
            className="absolute right-4 text-[10px] uppercase font-bold text-slate-500 hover:text-white border border-slate-700 rounded px-2 py-1"
          >
            {mode === 'LOCAL' ? 'Guest' : 'Cloud'} Mode
          </button>
        )}
      </header>

      <main className="max-w-md mx-auto p-4 h-full">
        {activeTab === Tab.PLAYERS && <PlayerList setTab={setActiveTab} />}
        {activeTab === Tab.MATCHES && <MatchSchedule />}
        {activeTab === Tab.FEED && <LiveFeed />}
        {activeTab === Tab.STATS && <StatsView />}
      </main>

      <BottomNav activeTab={activeTab} setTab={setActiveTab} />
    </div>
  );
};

const App = () => {
  return (
    <ToastProvider>
      <AppProvider>
        <MainLayout />
        <ToastContainer />
      </AppProvider>
    </ToastProvider>
  );
};

export default App;