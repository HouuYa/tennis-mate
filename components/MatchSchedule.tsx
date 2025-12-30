import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, CheckCircle, Trash2, Clock, CalendarDays, PlusCircle, PlayCircle, Edit3, RotateCcw } from 'lucide-react';
import { CloudSessionManager } from './CloudSessionManager';
import { generateNextMatch } from '../utils/matchmaking';
import { Match } from '../types';
import { getNameWithNumber, getRestingPlayerNames } from '../utils/playerUtils';

export const MatchSchedule: React.FC = () => {
  const { matches, activeMatch, players, finishMatch, undoFinishMatch, createNextMatch, generateSchedule, deleteMatch, updateMatchScore } = useApp();
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState(0);
  const [editScoreB, setEditScoreB] = useState(0);

  const finishedMatches = matches.filter(m => m.isFinished).sort((a, b) => (a.endTime || a.timestamp) - (b.endTime || b.timestamp));
  const queuedMatches = matches.filter(m => !m.isFinished && m.id !== activeMatch?.id);

  const activePlayers = players.filter(p => p.active);
  const activeCount = activePlayers.length;

  useEffect(() => {
    if (activeCount === 4) setPlanCount(3);
    else if (activeCount > 4) setPlanCount(activeCount);
    else setPlanCount(1);
  }, [activeCount]);

  const startEditMatch = (match: Match) => {
    setEditingMatch(match.id);
    setEditScoreA(match.scoreA);
    setEditScoreB(match.scoreB);
  };

  const saveEditMatch = () => {
    if (editingMatch) {
      updateMatchScore(editingMatch, editScoreA, editScoreB);
      setEditingMatch(null);
    }
  };

  const handleFinish = () => {
    if (activeMatch) {
      finishMatch(activeMatch.id, scoreA, scoreB);
      setScoreA(0);
      setScoreB(0);
    }
  };

  const handleGenerate = () => {
    if (planCount > 0) {
      generateSchedule(planCount);
    }
  };

  return (
    <div className="pb-24 space-y-6">

      {/* 0. Cloud Session Manager Empty State */}
      {players.length === 0 && matches.length === 0 && (
        <CloudSessionManager />
      )}

      {/* 1. Timeline Header */}
      <div className="flex items-center gap-2 text-tennis-green font-bold text-lg px-2">
        <CalendarDays size={20} />
        <h2>Match Schedule</h2>
      </div>

      {/* 2. Match History (Past) */}
      <div className="space-y-3 relative">
        {finishedMatches.length > 0 && <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-800 -z-10" />}

        {finishedMatches.map((match, idx) => (
          <div key={match.id} className="flex gap-4 items-start animate-in fade-in slide-in-from-left-4">
            <div className="flex flex-col items-center min-w-[32px]">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-mono text-slate-300 border border-slate-600">
                {idx + 1}
              </div>
            </div>

            <div className="flex-1 bg-slate-800/80 rounded-lg p-3 border border-slate-700 group">
              {editingMatch === match.id ? (
                // Edit Mode
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white">{getNameWithNumber(match.teamA.player1Id, players, activePlayers)} & {getNameWithNumber(match.teamA.player2Id, players, activePlayers)}</span>
                    <input type="number" value={editScoreA} onChange={e => setEditScoreA(parseInt(e.target.value) || 0)} className="w-12 bg-slate-900 text-white text-center rounded border border-slate-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white">{getNameWithNumber(match.teamB.player1Id, players, activePlayers)} & {getNameWithNumber(match.teamB.player2Id, players, activePlayers)}</span>
                    <input type="number" value={editScoreB} onChange={e => setEditScoreB(parseInt(e.target.value) || 0)} className="w-12 bg-slate-900 text-white text-center rounded border border-slate-600" />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={saveEditMatch} className="flex-1 text-xs bg-tennis-green text-slate-900 py-1 rounded font-bold">Save</button>
                    <button onClick={() => setEditingMatch(null)} className="flex-1 text-xs bg-slate-700 text-white py-1 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className={`flex justify-between items-center ${match.scoreA > match.scoreB ? 'text-white font-bold' : 'text-slate-400'}`}>
                      <span className="text-sm">{getNameWithNumber(match.teamA.player1Id, players, activePlayers)} & {getNameWithNumber(match.teamA.player2Id, players, activePlayers)}</span>
                      <span className="text-lg font-mono">{match.scoreA}</span>
                    </div>
                    <div className={`flex justify-between items-center ${match.scoreB > match.scoreA ? 'text-white font-bold' : 'text-slate-400'}`}>
                      <span className="text-sm">{getNameWithNumber(match.teamB.player1Id, players, activePlayers)} & {getNameWithNumber(match.teamB.player2Id, players, activePlayers)}</span>
                      <span className="text-lg font-mono">{match.scoreB}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditMatch(match)} className="text-slate-500 hover:text-tennis-green p-1">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => undoFinishMatch(match.id)} className="text-slate-500 hover:text-blue-400 p-1" title="Undo Match Finish">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={() => deleteMatch(match.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Current Match (Active) */}
      <div className="flex gap-4 items-start">
        <div className="flex flex-col items-center min-w-[32px]">
          <div className="w-8 h-8 rounded-full bg-tennis-green flex items-center justify-center text-xs font-bold text-slate-900 shadow-[0_0_10px_rgba(212,225,87,0.5)]">
            {finishedMatches.length + 1}
          </div>
        </div>

        {activeMatch ? (
          <div className="flex-1">
            <div className="bg-tennis-court p-1 rounded-2xl shadow-xl">
              <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center">
                <div className="mb-2 text-tennis-green font-mono text-xs tracking-widest uppercase">Currently Playing</div>

                <div className="grid grid-cols-3 items-center mb-6">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold text-tennis-green font-mono mb-2">{scoreA}</div>
                    <div className="text-sm font-bold text-white leading-tight">
                      {getNameWithNumber(activeMatch.teamA.player1Id, players, activePlayers)}<br />
                      {getNameWithNumber(activeMatch.teamA.player2Id, players, activePlayers)}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setScoreA(Math.max(0, scoreA - 1))} className="w-8 h-8 rounded-full bg-slate-700 text-white">-</button>
                      <button onClick={() => setScoreA(scoreA + 1)} className="w-8 h-8 rounded-full bg-slate-700 text-white">+</button>
                    </div>
                  </div>

                  <div className="text-slate-500 font-bold text-lg">VS</div>

                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold text-tennis-clay font-mono mb-2">{scoreB}</div>
                    <div className="text-sm font-bold text-white leading-tight">
                      {getNameWithNumber(activeMatch.teamB.player1Id, players, activePlayers)}<br />
                      {getNameWithNumber(activeMatch.teamB.player2Id, players, activePlayers)}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setScoreB(Math.max(0, scoreB - 1))} className="w-8 h-8 rounded-full bg-slate-700 text-white">-</button>
                      <button onClick={() => setScoreB(scoreB + 1)} className="w-8 h-8 rounded-full bg-slate-700 text-white">+</button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleFinish}
                  className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-95 transition-transform"
                >
                  <CheckCircle size={20} /> Finish Set
                </button>
              </div>
            </div>

            <div className="mt-2 text-center">
              <span className="text-xs text-slate-500">Resting now: </span>
              {getRestingPlayerNames(activeMatch, activePlayers).map((name) => (
                <span key={name} className="inline-block bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded ml-1 border border-slate-700">
                  {name}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 py-10 text-center border-2 border-dashed border-slate-700 rounded-xl">
            <Trophy className="mx-auto text-slate-600 mb-2" size={32} />
            <p className="text-slate-400 text-sm mb-4">No match active.</p>
            <button
              onClick={() => createNextMatch()}
              className="bg-tennis-green text-slate-900 font-bold py-2 px-6 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              Start Next Set
            </button>
          </div>
        )}
      </div>

      {/* 4. Queued / Planned Matches */}
      {queuedMatches.length > 0 && (
        <div className="space-y-3 opacity-80">
          <h3 className="text-xs font-bold text-slate-500 uppercase px-2 mt-4 flex items-center gap-2">
            <Clock size={12} /> Upcoming Queue
          </h3>
          {queuedMatches.map((match, idx) => {
            const restingNames = getRestingPlayerNames(match, activePlayers);
            return (
              <div key={match.id} className="flex gap-4 items-start">
                <div className="flex flex-col items-center min-w-[32px]">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-mono text-slate-500 border border-slate-700 border-dashed">
                    {finishedMatches.length + (activeMatch ? 2 : 1) + idx}
                  </div>
                </div>
                <div className="flex-1 bg-slate-900 rounded-lg p-3 border border-slate-800 border-dashed relative group">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
                    <div className="text-slate-300">
                      <div>{getNameWithNumber(match.teamA.player1Id, players, activePlayers)}</div>
                      <div>{getNameWithNumber(match.teamA.player2Id, players, activePlayers)}</div>
                    </div>
                    <span className="text-xs font-bold text-slate-600">VS</span>
                    <div className="text-slate-300 text-right">
                      <div>{getNameWithNumber(match.teamB.player1Id, players, activePlayers)}</div>
                      <div>{getNameWithNumber(match.teamB.player2Id, players, activePlayers)}</div>
                    </div>
                  </div>
                  {restingNames.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      Rest: {restingNames.join(', ')}
                    </div>
                  )}
                  <button onClick={() => deleteMatch(match.id)} className="absolute -right-2 -top-2 bg-slate-800 p-1 rounded-full text-slate-600 hover:text-red-400 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Session Planner */}
      <div className="mt-8 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <PlusCircle size={16} className="text-tennis-green" /> Session Planner
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Pre-generate a schedule where everyone plays everyone exactly once (Round Robin).
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-500 font-bold uppercase">Total Sets:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={planCount}
              onChange={(e) => setPlanCount(parseInt(e.target.value) || 0)}
              className="w-12 bg-transparent text-white font-bold text-center focus:outline-none"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={activeCount < 4}
            className="flex-1 bg-slate-700 hover:bg-tennis-green hover:text-slate-900 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 text-sm flex justify-center items-center gap-2"
          >
            <PlayCircle size={16} /> Generate Schedule
          </button>
        </div>
        {activeCount === 4 && <p className="text-[10px] text-tennis-green mt-2">* 4 Players: 3 Sets is perfect rotation.</p>}
        {activeCount === 5 && <p className="text-[10px] text-tennis-green mt-2">* 5 Players: 5 Sets (Rest: P5→P4→P3→P2→P1)</p>}
        {activeCount >= 6 && <p className="text-[10px] text-tennis-green mt-2">* {activeCount} Players: {activeCount} Sets (Rest: P{activeCount}→...→P1)</p>}
      </div>

    </div>
  );
};