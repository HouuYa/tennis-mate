import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, CheckCircle, RefreshCw } from 'lucide-react';

export const CurrentMatch: React.FC = () => {
  const { activeMatch, players, finishMatch, createNextMatch } = useApp();
  const [scoreA, setScoreA] = useState(6);
  const [scoreB, setScoreB] = useState(0);

  if (!activeMatch) {
    const activeCount = players.filter(p => p.active).length;
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <Trophy size={64} className="text-slate-600 mb-6" />
        <h2 className="text-2xl font-bold text-slate-300 mb-2">No Match in Progress</h2>
        {activeCount < 4 ? (
          <p className="text-red-400">Need at least 4 active players to start.</p>
        ) : (
          <button
            onClick={() => createNextMatch()}
            className="mt-6 bg-tennis-green text-slate-900 text-xl font-bold py-4 px-8 rounded-full shadow-lg shadow-tennis-green/20 animate-pulse"
          >
            Start New Match
          </button>
        )}
      </div>
    );
  }

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const handleFinish = () => {
    finishMatch(activeMatch.id, scoreA, scoreB);
    // Reset local state for next match defaults
    setScoreA(6);
    setScoreB(0);
  };

  return (
    <div className="pb-20">
      <div className="bg-tennis-court p-1 rounded-2xl shadow-2xl mb-6">
        <div className="bg-slate-900/90 backdrop-blur-sm p-6 rounded-xl border border-white/10 text-center">
          <div className="mb-2 text-tennis-green font-mono text-sm tracking-widest uppercase">Court 1</div>
          
          {/* Team A */}
          <div className="mb-6">
            <div className="flex justify-center gap-4 text-xl font-bold text-white mb-2">
              <span>{getPlayerName(activeMatch.teamA.player1Id)}</span>
              <span className="text-tennis-green">&</span>
              <span>{getPlayerName(activeMatch.teamA.player2Id)}</span>
            </div>
            <div className="flex justify-center items-center gap-4">
               <button onClick={() => setScoreA(Math.max(0, scoreA - 1))} className="w-10 h-10 rounded-full bg-slate-700 text-white">-</button>
               <span className="text-5xl font-bold text-tennis-green font-mono">{scoreA}</span>
               <button onClick={() => setScoreA(scoreA + 1)} className="w-10 h-10 rounded-full bg-slate-700 text-white">+</button>
            </div>
          </div>

          <div className="text-slate-400 font-bold text-lg my-2">VS</div>

          {/* Team B */}
          <div className="mb-8">
            <div className="flex justify-center gap-4 text-xl font-bold text-white mb-2">
              <span>{getPlayerName(activeMatch.teamB.player1Id)}</span>
              <span className="text-tennis-green">&</span>
              <span>{getPlayerName(activeMatch.teamB.player2Id)}</span>
            </div>
            <div className="flex justify-center items-center gap-4">
               <button onClick={() => setScoreB(Math.max(0, scoreB - 1))} className="w-10 h-10 rounded-full bg-slate-700 text-white">-</button>
               <span className="text-5xl font-bold text-tennis-clay font-mono">{scoreB}</span>
               <button onClick={() => setScoreB(scoreB + 1)} className="w-10 h-10 rounded-full bg-slate-700 text-white">+</button>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="w-full bg-white text-slate-900 font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-95 transition-transform"
          >
            <CheckCircle size={24} /> Finish Match
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-xl">
        <h3 className="text-slate-400 text-sm font-bold uppercase mb-2">Resting Players</h3>
        <div className="flex flex-wrap gap-2">
          {players.filter(p => p.active && 
            p.id !== activeMatch.teamA.player1Id && 
            p.id !== activeMatch.teamA.player2Id && 
            p.id !== activeMatch.teamB.player1Id && 
            p.id !== activeMatch.teamB.player2Id
          ).map(p => (
            <span key={p.id} className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm">
              {p.name}
            </span>
          ))}
          {players.filter(p => p.active).length <= 4 && <span className="text-slate-500 text-sm italic">No one is resting.</span>}
        </div>
      </div>
    </div>
  );
};