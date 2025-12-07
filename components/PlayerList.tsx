import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { UserPlus, UserCheck, UserX, ArrowUp, ArrowDown, GripVertical, Check, PlayCircle, Shuffle, RotateCcw } from 'lucide-react';
import { Tab } from '../types';

interface Props {
  setTab: (t: Tab) => void;
}

export const PlayerList: React.FC<Props> = ({ setTab }) => {
  const { players, matches, addPlayer, togglePlayerActive, reorderPlayers, shufflePlayers, updatePlayerName, generateSchedule, resetData } = useApp();
  const { showToast } = useToast();
  const [newName, setNewName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Refs for Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  
  // Ref to track current dragging index during Touch events (to handle closure staleness)
  const activeDragIndex = useRef<number | null>(null);

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

  const handleConfirmAndSchedule = () => {
    const activeCount = players.filter(p => p.active).length;
    if (activeCount < 4) {
      showToast("Need at least 4 active players to generate a schedule.", "warning");
      return;
    }

    // Check if there are already unfinished matches (schedule exists)
    const hasExistingSchedule = matches.some(m => !m.isFinished);

    if (!hasExistingSchedule) {
      // Only generate schedule if none exists
      const sets = activeCount === 4 ? 3 : activeCount;
      generateSchedule(sets);
    } else {
      showToast("Schedule already exists. Going to Match tab. Use Session Planner there to add more sets.", "info");
    }

    setIsEditMode(false);
    setTab(Tab.MATCHES);
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

  return (
    <div className="space-y-4 pb-24">
      {/* Add Player Box */}
      {!isEditMode && (
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
          <h2 className="text-xl font-bold text-tennis-green mb-4 flex items-center">
            <UserPlus className="mr-2" size={24} /> Add Player
          </h2>
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
          className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            isEditMode 
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
            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
              player.active 
                ? 'bg-slate-800 border-tennis-green/30' 
                : 'bg-slate-900 border-slate-800 opacity-60'
            } ${isEditMode ? 'cursor-move' : ''}`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-mono font-bold text-sm ${isEditMode ? 'bg-slate-700' : 'bg-slate-700'}`}>
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
            ) : (
              <button
                onClick={() => togglePlayerActive(player.id)}
                className={`p-2 rounded-full ${player.active ? 'bg-tennis-green text-slate-900' : 'bg-slate-700 text-slate-400'}`}
              >
                {player.active ? <UserCheck size={18} /> : <UserX size={18} />}
              </button>
            )}
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
            Active Players: {players.filter(p => p.active).length} / {players.length}
            <br/>
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
        </>
      )}
    </div>
  );
};