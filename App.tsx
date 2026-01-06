import React, { useState, useEffect } from 'react';
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
import { CloudSessionManager } from './components/CloudSessionManager';
import { GoogleSheetsSessionManager } from './components/GoogleSheetsSessionManager';
import { GuestSessionManager } from './components/GuestSessionManager';

const GUEST_SESSION_READY_KEY = 'tennis-mate-guest-session-ready';

const MainLayout = () => {
  const { mode, players, matches, exitMode } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.PLAYERS);
  const [guestSessionReady, setGuestSessionReady] = useState<boolean>(() => {
    // Check if guest session was already configured
    return localStorage.getItem(GUEST_SESSION_READY_KEY) === 'true';
  });

  // Show Session Manager modal when in Cloud mode with no session
  const showCloudSessionManager = mode === 'CLOUD' && players.length === 0;
  const showGoogleSheetsSessionManager = mode === 'GOOGLE_SHEETS' && players.length === 0;
  const showGuestSessionManager = mode === 'LOCAL' && !guestSessionReady;

  // Check if there's existing data in Guest mode
  const hasExistingGuestData = mode === 'LOCAL' && (matches.length > 0 || players.some(p => p.stats.matchesPlayed > 0));

  // Check if there are unfinished matches (warn before leaving)
  const hasUnfinishedMatches = matches.some(m => !m.isFinished);

  // Add beforeunload warning for unsaved data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if there are unfinished matches in Google Sheets or Cloud mode
      if ((mode === 'GOOGLE_SHEETS' || mode === 'CLOUD') && hasUnfinishedMatches) {
        e.preventDefault();
        e.returnValue = '저장되지 않은 매치 데이터가 있습니다. 페이지를 떠나시겠습니까?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode, hasUnfinishedMatches]);

  if (!mode) {
    return <ModeSelection />;
  }

  const handleSessionReady = () => {
    // Navigate to Player tab after session is created
    setActiveTab(Tab.PLAYERS);
  };

  const handleGuestSessionReady = () => {
    localStorage.setItem(GUEST_SESSION_READY_KEY, 'true');
    setGuestSessionReady(true);
    setActiveTab(Tab.PLAYERS);
  };

  const handleSwitchMode = () => {
    // Clear guest session ready flag when switching modes
    localStorage.removeItem(GUEST_SESSION_READY_KEY);
    setGuestSessionReady(false);
    exitMode();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-tennis-green selection:text-slate-900">
      <header className="p-4 flex items-center justify-center bg-slate-900 shadow-md border-b border-slate-800 sticky top-0 z-10">
        <h1 className="text-xl font-black italic tracking-tighter text-tennis-green flex items-center gap-2">
          <span className="w-3 h-3 bg-tennis-green rounded-full animate-pulse"></span>
          TENNIS MATE
        </h1>
        {mode && (
          <button
            onClick={handleSwitchMode}
            className="absolute right-4 text-[10px] uppercase font-bold text-slate-500 hover:text-white border border-slate-700 rounded px-2 py-1"
          >
            {mode === 'LOCAL' ? 'Guest' : mode === 'GOOGLE_SHEETS' ? 'Sheets' : 'Cloud'} Mode
          </button>
        )}
      </header>

      <main className="max-w-md mx-auto p-4 h-full">
        {activeTab === Tab.PLAYERS && <PlayerList setTab={setActiveTab} />}
        {activeTab === Tab.MATCHES && <MatchSchedule setTab={setActiveTab} />}
        {activeTab === Tab.FEED && <LiveFeed />}
        {activeTab === Tab.STATS && <StatsView />}
      </main>

      <BottomNav activeTab={activeTab} setTab={setActiveTab} />

      {/* Cloud Session Manager Modal */}
      {showCloudSessionManager && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-800 animate-in zoom-in-95 duration-200">
            <CloudSessionManager onSessionReady={handleSessionReady} />
          </div>
        </div>
      )}

      {/* Google Sheets Session Manager Modal */}
      {showGoogleSheetsSessionManager && <GoogleSheetsSessionManager onSessionReady={handleSessionReady} />}

      {/* Guest Session Manager Modal */}
      {showGuestSessionManager && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-800 animate-in zoom-in-95 duration-200">
            <GuestSessionManager
              onSessionReady={handleGuestSessionReady}
              isExistingSession={hasExistingGuestData}
            />
          </div>
        </div>
      )}
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