import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { BottomNav } from './components/BottomNav';
import { PlayerList } from './components/PlayerList';
import { MatchSchedule } from './components/MatchSchedule';
import { StatsView } from './components/StatsView';
import { LiveFeed } from './components/LiveFeed';
import { Tab } from './types';

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.MATCHES);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-tennis-green selection:text-slate-900">
      <header className="p-4 flex items-center justify-center bg-slate-900 shadow-md border-b border-slate-800 sticky top-0 z-10">
        <h1 className="text-xl font-black italic tracking-tighter text-tennis-green flex items-center gap-2">
          <span className="w-3 h-3 bg-tennis-green rounded-full animate-pulse"></span>
          TENNIS MATE
        </h1>
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
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;