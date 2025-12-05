import React from 'react';
import { useApp } from '../context/AppContext';
import { Trash2 } from 'lucide-react';

export const MatchHistory: React.FC = () => {
  const { matches, players, deleteMatch } = useApp();
  const finishedMatches = matches.filter(m => m.isFinished);

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name.substring(0, 10) || 'Unknown';

  return (
    <div className="pb-20">
      <h2 className="text-xl font-bold text-white mb-4 px-2">Match History</h2>
      {finishedMatches.length === 0 ? (
        <p className="text-slate-500 text-center mt-10">No finished matches yet.</p>
      ) : (
        <div className="space-y-3">
          {finishedMatches.map(match => (
            <div key={match.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 relative group">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-xs text-slate-500 font-mono">
                   {new Date(match.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
                 <button 
                  onClick={() => deleteMatch(match.id)}
                  className="text-slate-600 hover:text-red-400"
                 >
                   <Trash2 size={14} />
                 </button>
               </div>
               
               <div className="flex justify-between items-center">
                 {/* Team A */}
                 <div className={`flex-1 text-right ${match.scoreA > match.scoreB ? 'text-tennis-green font-bold' : 'text-slate-400'}`}>
                    <div className="text-sm">{getPlayerName(match.teamA.player1Id)}</div>
                    <div className="text-sm">{getPlayerName(match.teamA.player2Id)}</div>
                 </div>

                 {/* Score */}
                 <div className="px-4 flex items-center gap-2 font-mono text-xl font-bold text-white">
                    <span>{match.scoreA}</span>
                    <span className="text-slate-600">-</span>
                    <span>{match.scoreB}</span>
                 </div>

                 {/* Team B */}
                 <div className={`flex-1 text-left ${match.scoreB > match.scoreA ? 'text-tennis-green font-bold' : 'text-slate-400'}`}>
                    <div className="text-sm">{getPlayerName(match.teamB.player1Id)}</div>
                    <div className="text-sm">{getPlayerName(match.teamB.player2Id)}</div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};