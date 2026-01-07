import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { UserPlus, Trash2, ArrowUp, ArrowDown, GripVertical, Check, PlayCircle, Shuffle, RotateCcw, AlertTriangle } from 'lucide-react';
import { Tab } from '../types';

interface Props {
  setTab: (t: Tab) => void;
}

export const PlayerList: React.FC<Props> = ({ setTab }) => {
  const { players, matches, mode, getAllPlayers, addPlayer, deletePlayer, reorderPlayers, shufflePlayers, updatePlayerName, generateSchedule, resetData } = useApp();
  const { showToast } = useToast();
  const [newName, setNewName] = useState('');
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);
  const [showDbPicker, setShowDbPicker] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false); // New confirmation state
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);

  // Refs for Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Ref to track current dragging index during Touch events (to handle closure staleness)
  const activeDragIndex = useRef<number | null>(null);

  React.useEffect(() => {
    if ((mode === 'CLOUD' || mode === 'GOOGLE_SHEETS') && showDbPicker) {
      getAllPlayers()
        .then(p => setDbPlayers(p))
        .catch(err => console.error("Failed to load players", err));
    }
  }, [mode, showDbPicker, getAllPlayers]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      addPlayer(newName.trim());
      setNewName('');
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderPlayers(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < players.length - 1) {
      reorderPlayers(index, index + 1);
    }
  };

  // Logic to determine sets based on player count
  const getSetsCount = (activeCount: number) => {
    const setCountMap: Record<number, number> = {
      4: 3,   // 3 games
      5: 5,   // 5 games
      6: 9,   // 9 games
      7: 7,   // 7 rounds (1 match per round)
      8: 14   // 7 rounds x 2 courts
    };
    return setCountMap[activeCount] || activeCount;
  };

  const handleConfirmAndSchedule = () => {
    const playerCount = players.length;
    if (playerCount < 4) {
      showToast("Need at least 4 players to generate a schedule.", "warning");
      return;
    }

    // Check if there are already unfinished matches (schedule exists)
    const hasUnfinishedMatches = matches.some(m => !m.isFinished);

    if (hasUnfinishedMatches) {
      setShowScheduleConfirm(true); // Show confirmation dialog
    } else {
      // No existing matches, proceed normally (overwrite=true/false doesn't matter, but false is safe)
      const sets = getSetsCount(playerCount);
      generateSchedule(sets, false);
      setIsEditMode(false);
      setTab(Tab.MATCHES);
    }
  };

  const handleKeepSchedule = () => {
    setShowScheduleConfirm(false);
    setTab(Tab.MATCHES);
    showToast("Keeping current schedule", "success");
  };

  const handleOverwriteSchedule = () => {
    const playerCount = players.length;
    const sets = getSetsCount(playerCount);

    generateSchedule(sets, true); // Overwrite existing unfinished matches

    setShowScheduleConfirm(false);
    setIsEditMode(false);
    setTab(Tab.MATCHES);
    showToast("New schedule generated!", "success");
  };

  const handleDeleteClick = (playerId: string) => {
    setPlayerToDelete(playerId);
  };

  const handleConfirmDelete = () => {
    if (playerToDelete) {
      const success = deletePlayer(playerToDelete);
      setPlayerToDelete(null);
      if (success) {
        showToast("Player deleted successfully", "success");
      } else {
        showToast("Cannot delete player - in active/queued matches", "error");
      }
    }
  };

  const handleReset = () => {
    resetData();
    setShowResetConfirm(false);
  };

  // --- Desktop Drag & Drop Handlers ---
  const onDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragEnter = (e: React.DragEvent, index: number) => {
    if (dragItem.current === null) return;
    if (dragItem.current !== index) {
      reorderPlayers(dragItem.current, index);
      dragItem.current = index;
    }
    e.preventDefault();
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // --- Mobile Touch Handlers ---
  const handleTouchStart = (index: number) => {
    activeDragIndex.current = index;
    document.body.style.overflow = 'hidden'; // Lock scroll while dragging
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = target?.closest('div[data-index]');

    if (row && activeDragIndex.current !== null) {
      const targetIndex = parseInt(row.getAttribute('data-index') || '-1');
      if (targetIndex !== -1 && targetIndex !== activeDragIndex.current) {
        reorderPlayers(activeDragIndex.current, targetIndex);
        activeDragIndex.current = targetIndex;
      }
    }
  };

  const handleTouchEnd = () => {
    activeDragIndex.current = null;
    document.body.style.overflow = ''; // Unlock scroll
  };

  // Check if there's existing match data (finished matches)
  const hasFinishedMatches = matches.some(m => m.isFinished);

  return (
    <div className="space-y-4 pb-24">
      {/* Saved Session Info Banner */}
      {hasFinishedMatches && !isEditMode && (
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium">이전 매치 기록이 저장되어 있습니다.</p>
              <p className="text-blue-400/80 text-xs mt-1">
                새로운 세션을 시작하려면 아래의 <span className="text-red-400 font-medium">Reset All Data</span> 버튼을 클릭하세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Box */}
      {!isEditMode && (
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 space-y-3">
          <h2 className="text-xl font-bold text-tennis-green mb-4 flex items-center justify-between">
            <span className="flex items-center"><UserPlus className="mr-2" size={24} /> Add Player</span>
            {(mode === 'CLOUD' || mode === 'GOOGLE_SHEETS') && (
              <button
                onClick={() => setShowDbPicker(!showDbPicker)}
                className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 hover:text-white"
              >
                {showDbPicker ? 'Close List' : (mode === 'CLOUD' ? 'From Global List' : 'From Sheet History')}
              </button>
            )}
          </h2>

          {/* Global DB Picker */}
          {(mode === 'CLOUD' || mode === 'GOOGLE_SHEETS') && showDbPicker && (
            <div className="bg-slate-900 rounded-lg p-2 max-h-40 overflow-y-auto mb-2 border border-slate-700">
              <p className="text-xs text-slate-500 mb-2 px-1">Select from history:</p>
              <div className="flex flex-wrap gap-2">
                {dbPlayers
                  .filter(dp => !players.some(p => p.id === dp.id || p.name.toLowerCase() === dp.name.toLowerCase()))
                  .map(dp => (
                    <button
                      key={dp.id}
                      onClick={async () => {
                        try {
                          await addPlayer(dp.name, dp);
                          showToast(`${dp.name} added`, "success");
                        } catch (error) {
                          // Error already logged and shown in Feed by AppContext
                          // No need to show additional toast here
                        }
                      }}
                      className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded hover:border-tennis-green hover:text-tennis-green transition-colors"
                    >
                      + {dp.name}
                    </button>
                  ))}
                {dbPlayers.length === 0 && <span className="text-xs text-slate-500 pl-1">No history found or loading...</span>}
              </div>
            </div>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. John)"
              className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:outline-none focus:border-tennis-green"
            />
            <button type="submit" className="bg-tennis-green text-slate-900 font-bold px-4 rounded-lg">
              Add
            </button>
          </form>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex justify-between items-center px-2">
        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
          {isEditMode ? 'Drag to Reorder & Rename' : 'Active Players & Rotation'}
        </p>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isEditMode
            ? 'bg-tennis-green text-slate-900 shadow-[0_0_10px_rgba(212,225,87,0.4)]'
            : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
        >
          {isEditMode ? <Check size={14} /> : <GripVertical size={14} />}
          {isEditMode ? 'Done' : 'Edit Order or Name'}
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={player.id}
            data-index={index}
            draggable={isEditMode}
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all bg-slate-800 border-tennis-green/30 ${isEditMode ? 'cursor-move' : ''}`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-mono font-bold text-sm bg-slate-700`}>
                {index + 1}
              </span>
              <div className="flex-1">
                {isEditMode ? (
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(player.id, e.target.value)}
                    className="bg-slate-900 text-white p-1 rounded border border-slate-600 w-full"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <h3 className="font-bold text-white">{player.name}</h3>
                    <div className="flex gap-2 text-xs text-slate-400">
                      <span>P: {player.stats.matchesPlayed}</span>
                      <span className="text-slate-600">|</span>
                      <span>W: {player.stats.wins}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isEditMode ? (
              <div className="flex items-center gap-2 ml-2">
                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteClick(player.id)}
                  className="p-2 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                  title="Delete player"
                >
                  <Trash2 size={18} />
                </button>

                {/* Drag Grip for Mobile */}
                <div
                  className="p-2 text-slate-500 touch-none"
                  onTouchStart={() => handleTouchStart(index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <GripVertical size={20} />
                </div>

                {/* Arrows for Precise Control */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded bg-slate-700 text-white hover:bg-tennis-green hover:text-slate-900 disabled:opacity-20"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === players.length - 1}
                    className="p-1 rounded bg-slate-700 text-white hover:bg-tennis-green hover:text-slate-900 disabled:opacity-20"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!isEditMode && (
        <>
          <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
            <button
              onClick={shufflePlayers}
              disabled={players.length < 2}
              className="w-full py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Shuffle size={20} /> Shuffle Order
            </button>
            <button
              onClick={handleConfirmAndSchedule}
              className="w-full py-4 bg-tennis-green text-slate-900 font-black text-lg rounded-xl shadow-lg hover:bg-[#c0ce4e] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle size={24} /> Confirm Roster & Schedule
            </button>
            <p className="text-center text-xs text-slate-500">
              Generates optimal sets based on current list order
            </p>
          </div>

          <div className="p-4 text-center text-slate-500 text-sm bg-slate-900/50 rounded-lg mt-4">
            Total Players: {players.length}
            <br />
            <span className="text-xs opacity-70">Rotation proceeds in reverse order</span>
          </div>

          {/* Reset Button */}
          <div className="mt-4">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 bg-red-900/30 text-red-400 font-bold rounded-xl border border-red-900/50 hover:bg-red-900/50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> Reset All Data
              </button>
            ) : (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                <p className="text-red-300 text-sm text-center mb-4">
                  ⚠️ This will delete ALL players, matches, and statistics. This action cannot be undone!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete Player Confirmation Modal */}
          {playerToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-800 border border-red-500 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-2">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Delete Player?</h3>
                  <p className="text-sm text-slate-300">
                    Are you sure you want to delete <span className="text-tennis-green font-bold">{players.find(p => p.id === playerToDelete)?.name}</span>?
                  </p>
                  <p className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded">
                    This action cannot be undone.
                  </p>

                  <div className="flex gap-3 w-full mt-4">
                    <button
                      onClick={() => setPlayerToDelete(null)}
                      className="flex-1 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Overwrite Confirmation Modal (Absolute Centered) */}
          {showScheduleConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-800 border border-tennis-green rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 mb-2">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Match Schedule Already Exists</h3>
                  <p className="text-sm text-slate-300">
                    A match schedule is already in progress. What would you like to do?
                  </p>

                  <div className="w-full space-y-2 mt-4">
                    <button
                      onClick={handleKeepSchedule}
                      className="w-full py-3 bg-tennis-green text-slate-900 font-bold rounded-xl hover:bg-[#c0ce4e] transition-colors"
                    >
                      Keep Current Schedule
                    </button>
                    <p className="text-xs text-slate-500">Continue with existing matches</p>
                  </div>

                  <div className="w-full border-t border-slate-700 my-2"></div>

                  <div className="w-full space-y-2">
                    <button
                      onClick={handleOverwriteSchedule}
                      className="w-full py-3 bg-red-900/30 text-red-400 font-bold rounded-xl hover:bg-red-900/50 border border-red-900/50 transition-colors"
                    >
                      Delete & Create New Schedule
                    </button>
                    <p className="text-xs text-slate-500">
                      <span className="text-red-400 font-bold">⚠️ Warning:</span> This will delete all unfinished matches
                    </p>
                  </div>

                  <button
                    onClick={() => setShowScheduleConfirm(false)}
                    className="mt-2 text-sm text-slate-500 hover:text-slate-300 underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
};