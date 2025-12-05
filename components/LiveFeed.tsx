import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Send, MessageSquare, Copy, Share2, User } from 'lucide-react';
import { FeedMessage } from '../types';

export const LiveFeed: React.FC = () => {
  const { feed, postAnnouncement, activeMatch, players } = useApp();
  const [inputText, setInputText] = useState('');
  
  // Author selection state
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const [customAuthorName, setCustomAuthorName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  // Set default author
  useEffect(() => {
    if (!selectedAuthorId && !isCustomMode && players.length > 0) {
      setSelectedAuthorId(players[0].id);
    }
  }, [players, selectedAuthorId, isCustomMode]);

  const handleAuthorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomMode(true);
      setSelectedAuthorId('');
    } else {
      setIsCustomMode(false);
      setSelectedAuthorId(val);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      let authorName = 'Guest';
      
      if (isCustomMode) {
        authorName = customAuthorName.trim() || 'Guest';
      } else {
        authorName = players.find(p => p.id === selectedAuthorId)?.name || 'Guest';
      }

      postAnnouncement(inputText.trim(), authorName);
      setInputText('');
    }
  };

  const copyStatusToClipboard = () => {
    const active = activeMatch 
      ? `Current Match:\n${players.find(p => p.id === activeMatch.teamA.player1Id)?.name} & ${players.find(p => p.id === activeMatch.teamA.player2Id)?.name} VS ${players.find(p => p.id === activeMatch.teamB.player1Id)?.name} & ${players.find(p => p.id === activeMatch.teamB.player2Id)?.name}`
      : "No match in progress.";

    const lastMsg = feed.length > 0 ? `\n\nLatest: ${feed[feed.length - 1].content}` : "";
    
    const text = `[Tennis Mate Status]\n${active}${lastMsg}`;
    
    navigator.clipboard.writeText(text);
    alert("Status copied! You can paste it into your group chat.");
  };

  const getMessageStyle = (type: FeedMessage['type']) => {
    switch (type) {
      case 'MATCH_START':
        return 'bg-tennis-green/20 border-tennis-green text-green-100';
      case 'MATCH_END':
        return 'bg-blue-900/40 border-blue-500 text-blue-100';
      case 'ANNOUNCEMENT':
        return 'bg-slate-700 border-slate-600 text-white';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400 text-xs italic text-center';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] relative">
      <div className="flex-1 overflow-y-auto space-y-3 p-2 pb-4 no-scrollbar">
        <div className="text-center py-4 text-slate-600 text-sm">
          Today's Activity Feed
        </div>
        
        {feed.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.type === 'SYSTEM' ? 'items-center' : 'items-start'}`}>
            <div 
              className={`max-w-[85%] rounded-xl px-4 py-3 border ${getMessageStyle(msg.type)} shadow-sm backdrop-blur-sm`}
            >
              {msg.type === 'ANNOUNCEMENT' && (
                <div className="text-xs font-bold text-tennis-green mb-1 flex items-center gap-1">
                   <MessageSquare size={10} /> {msg.author || 'User'}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-[10px] opacity-60 text-right mt-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Floating Action for Sharing */}
      <div className="absolute top-2 right-2 z-10">
        <button 
          onClick={copyStatusToClipboard}
          className="bg-slate-800/80 backdrop-blur text-tennis-green p-2 rounded-full shadow-lg border border-slate-700 hover:bg-slate-700"
          title="Copy Status for Group Chat"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
        
        {/* Author Selection */}
        <div className="flex flex-wrap items-center gap-2">
          <User size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">Talking as:</span>
          
          <select 
            value={isCustomMode ? 'custom' : selectedAuthorId}
            onChange={handleAuthorChange}
            className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 outline-none focus:border-tennis-green"
          >
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="custom">✎ Direct Input / Guest</option>
          </select>

          {isCustomMode && (
            <input 
              type="text"
              placeholder="Your Name"
              value={customAuthorName}
              onChange={(e) => setCustomAuthorName(e.target.value)}
              className="flex-1 min-w-[100px] bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 outline-none focus:border-tennis-green"
              autoFocus
            />
          )}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type an announcement..."
            className="flex-1 bg-slate-800 text-white pl-4 pr-10 py-3 rounded-full border border-slate-700 focus:outline-none focus:border-tennis-green placeholder:text-slate-500"
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1.5 p-1.5 bg-tennis-green text-slate-900 rounded-full hover:scale-105 transition-transform"
            disabled={!inputText.trim()}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};