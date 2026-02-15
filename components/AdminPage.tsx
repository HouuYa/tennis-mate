import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { Shield, Users, Calendar, Trophy, Edit3, Trash2, Save, X, Plus, ChevronDown, ChevronUp, ArrowLeft, Loader2 } from 'lucide-react';
import { Tab } from '../types';

interface Props {
  setTab: (t: Tab) => void;
}

interface AdminPlayer {
  id: string;
  name: string;
  created_at: string;
}

interface AdminSession {
  id: string;
  played_at: string;
  location: string | null;
  status: string;
  created_at: string;
}

interface AdminMatch {
  id: string;
  session_id: string;
  played_at: string;
  end_time: string | null;
  team_a: { player1Id: string; player2Id: string };
  team_b: { player1Id: string; player2Id: string };
  score_a: number;
  score_b: number;
  is_finished: boolean;
  court_number: number;
}

const ADMIN_AUTH_KEY = 'tennis-mate-admin-auth';

export const AdminPage: React.FC<Props> = ({ setTab }) => {
  const { showToast } = useToast();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Tab state
  const [activeSection, setActiveSection] = useState<'players' | 'sessions' | 'quick-entry'>('players');

  // Data state
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editMatchScoreA, setEditMatchScoreA] = useState(0);
  const [editMatchScoreB, setEditMatchScoreB] = useState(0);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionLocation, setEditSessionLocation] = useState('');

  // Quick Entry state
  const [qeSessionId, setQeSessionId] = useState('');
  const [qeNewLocation, setQeNewLocation] = useState('');
  const [qeNewDate, setQeNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [qeTeamA1, setQeTeamA1] = useState('');
  const [qeTeamA2, setQeTeamA2] = useState('');
  const [qeTeamB1, setQeTeamB1] = useState('');
  const [qeTeamB2, setQeTeamB2] = useState('');
  const [qeScoreA, setQeScoreA] = useState(0);
  const [qeScoreB, setQeScoreB] = useState(0);
  const [qeUseNewSession, setQeUseNewSession] = useState(false);
  const [qeSaving, setQeSaving] = useState(false);

  // Check saved auth on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_AUTH_KEY);
    if (saved === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, activeSection]);

  const handleLogin = () => {
    const envId = import.meta.env.VITE_ADMIN_ID || 'admin';
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'tennis1234';

    if (adminId === envId && adminPassword === envPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [playersRes, sessionsRes] = await Promise.all([
        supabase.from('players').select('*').order('name'),
        supabase.from('sessions').select('*').order('played_at', { ascending: false })
      ]);

      if (playersRes.data) setPlayers(playersRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionMatches = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('session_id', sessionId)
        .order('played_at', { ascending: true });

      if (error) throw error;
      if (data) setMatches(data);
    } catch (error) {
      console.error('Failed to load matches:', error);
      showToast('Failed to load matches', 'error');
    }
  };

  // --- Player Operations ---
  const handleUpdatePlayerName = async (playerId: string) => {
    if (!editPlayerName.trim()) return;
    try {
      const { error } = await supabase
        .from('players')
        .update({ name: editPlayerName.trim() })
        .eq('id', playerId);
      if (error) throw error;

      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, name: editPlayerName.trim() } : p));
      setEditingPlayerId(null);
      showToast('Player name updated', 'success');
    } catch (error) {
      console.error('Failed to update player:', error);
      showToast('Failed to update player name', 'error');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!confirm(`Delete player "${player?.name}"? This will also remove them from all sessions.`)) return;

    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw error;

      setPlayers(prev => prev.filter(p => p.id !== playerId));
      showToast('Player deleted', 'success');
    } catch (error) {
      console.error('Failed to delete player:', error);
      showToast('Failed to delete player', 'error');
    }
  };

  // --- Session Operations ---
  const handleUpdateSessionLocation = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ location: editSessionLocation.trim() || null })
        .eq('id', sessionId);
      if (error) throw error;

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, location: editSessionLocation.trim() || null } : s));
      setEditingSessionId(null);
      showToast('Session location updated', 'success');
    } catch (error) {
      console.error('Failed to update session:', error);
      showToast('Failed to update session', 'error');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session and ALL its matches? This cannot be undone.')) return;

    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (expandedSessionId === sessionId) {
        setExpandedSessionId(null);
        setMatches([]);
      }
      showToast('Session deleted', 'success');
    } catch (error) {
      console.error('Failed to delete session:', error);
      showToast('Failed to delete session', 'error');
    }
  };

  // --- Match Operations ---
  const handleUpdateMatchScore = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ score_a: editMatchScoreA, score_b: editMatchScoreB })
        .eq('id', matchId);
      if (error) throw error;

      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, score_a: editMatchScoreA, score_b: editMatchScoreB } : m));
      setEditingMatchId(null);
      showToast('Match score updated', 'success');
    } catch (error) {
      console.error('Failed to update match:', error);
      showToast('Failed to update match score', 'error');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Delete this match record?')) return;

    try {
      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) throw error;

      setMatches(prev => prev.filter(m => m.id !== matchId));
      showToast('Match deleted', 'success');
    } catch (error) {
      console.error('Failed to delete match:', error);
      showToast('Failed to delete match', 'error');
    }
  };

  // --- Quick Entry ---
  const handleQuickEntry = async () => {
    if (!qeTeamA1 || !qeTeamA2 || !qeTeamB1 || !qeTeamB2) {
      showToast('Please select all 4 players', 'warning');
      return;
    }

    const selectedIds = [qeTeamA1, qeTeamA2, qeTeamB1, qeTeamB2];
    if (new Set(selectedIds).size !== 4) {
      showToast('All players must be different', 'warning');
      return;
    }

    setQeSaving(true);
    try {
      let sessionId = qeSessionId;

      // Create new session if needed
      if (qeUseNewSession || !sessionId) {
        const sessionPayload: { location?: string; status: string; played_at?: string } = {
          status: 'completed'
        };
        if (qeNewLocation.trim()) sessionPayload.location = qeNewLocation.trim();
        if (qeNewDate) sessionPayload.played_at = new Date(qeNewDate).toISOString();

        const { data, error } = await supabase
          .from('sessions')
          .insert(sessionPayload)
          .select('id')
          .single();
        if (error) throw error;
        sessionId = data.id;

        // Add players to session
        const sessionPlayers = selectedIds.map(pid => ({
          session_id: sessionId,
          player_id: pid
        }));
        await supabase.from('session_players').upsert(sessionPlayers, { onConflict: 'session_id,player_id' });
      }

      // Create match
      const matchPayload = {
        session_id: sessionId,
        played_at: qeNewDate ? new Date(qeNewDate).toISOString() : new Date().toISOString(),
        end_time: new Date().toISOString(),
        team_a: { player1Id: qeTeamA1, player2Id: qeTeamA2 },
        team_b: { player1Id: qeTeamB1, player2Id: qeTeamB2 },
        score_a: qeScoreA,
        score_b: qeScoreB,
        is_finished: true,
        court_number: 1
      };

      const { error: matchError } = await supabase.from('matches').insert(matchPayload);
      if (matchError) throw matchError;

      showToast('Match recorded successfully!', 'success');

      // Reset form
      setQeScoreA(0);
      setQeScoreB(0);
      setQeTeamA1('');
      setQeTeamA2('');
      setQeTeamB1('');
      setQeTeamB2('');

      // Reload sessions
      loadAllData();
    } catch (error) {
      console.error('Failed to save match:', error);
      showToast('Failed to save match', 'error');
    } finally {
      setQeSaving(false);
    }
  };

  const getPlayerName = (id: string) => {
    return players.find(p => p.id === id)?.name || id.substring(0, 8);
  };

  const toggleSessionExpand = (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setMatches([]);
    } else {
      setExpandedSessionId(sessionId);
      loadSessionMatches(sessionId);
    }
  };

  // --- Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="pb-24 space-y-6">
        <div className="flex items-center gap-2 px-2">
          <button onClick={() => setTab(Tab.STATS)} className="text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <Shield size={20} className="text-tennis-green" />
          <h2 className="text-tennis-green font-bold text-lg">Admin Access</h2>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4 max-w-sm mx-auto">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-tennis-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield size={32} className="text-tennis-green" />
            </div>
            <h3 className="text-white font-bold text-lg">Admin Login</h3>
            <p className="text-slate-400 text-xs mt-1">Enter credentials to manage data</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">ID</label>
              <input
                type="text"
                value={adminId}
                onChange={e => setAdminId(e.target.value)}
                placeholder="admin"
                className="w-full mt-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:outline-none focus:border-tennis-green"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="********"
                className="w-full mt-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:outline-none focus:border-tennis-green"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          {authError && (
            <p className="text-red-400 text-sm text-center">{authError}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full py-3 bg-tennis-green text-slate-900 font-bold rounded-xl hover:bg-[#c0ce4e] transition-colors"
          >
            Login
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            Set VITE_ADMIN_ID and VITE_ADMIN_PASSWORD in .env to customize
          </p>
        </div>
      </div>
    );
  }

  // --- Admin Dashboard ---
  return (
    <div className="pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setTab(Tab.STATS)} className="text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <Shield size={20} className="text-tennis-green" />
          <h2 className="text-tennis-green font-bold text-lg">Admin</h2>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-red-400 border border-slate-700 px-2 py-1 rounded"
        >
          Logout
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 px-2">
        {([
          { key: 'players' as const, label: 'Players', icon: <Users size={14} /> },
          { key: 'sessions' as const, label: 'Sessions', icon: <Calendar size={14} /> },
          { key: 'quick-entry' as const, label: 'Quick Entry', icon: <Plus size={14} /> }
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
              activeSection === tab.key
                ? 'bg-tennis-green text-slate-900'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-tennis-green" size={24} />
        </div>
      )}

      {/* Players Section */}
      {activeSection === 'players' && !loading && (
        <div className="space-y-2 px-2">
          <p className="text-xs text-slate-500">
            Total: {players.length} players in database
          </p>
          {players.map(player => (
            <div key={player.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
              {editingPlayerId === player.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editPlayerName}
                    onChange={e => setEditPlayerName(e.target.value)}
                    className="flex-1 bg-slate-900 text-white p-2 rounded border border-slate-600 text-sm"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleUpdatePlayerName(player.id)}
                  />
                  <button onClick={() => handleUpdatePlayerName(player.id)} className="p-1.5 bg-tennis-green text-slate-900 rounded">
                    <Save size={14} />
                  </button>
                  <button onClick={() => setEditingPlayerId(null)} className="p-1.5 bg-slate-700 text-white rounded">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-white text-sm font-medium">{player.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">{player.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingPlayerId(player.id); setEditPlayerName(player.name); }}
                      className="p-1.5 text-slate-500 hover:text-tennis-green"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sessions Section */}
      {activeSection === 'sessions' && !loading && (
        <div className="space-y-2 px-2">
          <p className="text-xs text-slate-500">
            Total: {sessions.length} sessions
          </p>
          {sessions.map(session => (
            <div key={session.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-750"
                onClick={() => toggleSessionExpand(session.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">
                      {new Date(session.played_at).toLocaleDateString('ko-KR')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      session.status === 'active' ? 'bg-tennis-green/20 text-tennis-green' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editSessionLocation}
                        onChange={e => setEditSessionLocation(e.target.value)}
                        placeholder="Location"
                        className="flex-1 bg-slate-900 text-white p-1 rounded border border-slate-600 text-xs"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleUpdateSessionLocation(session.id)}
                      />
                      <button onClick={() => handleUpdateSessionLocation(session.id)} className="p-1 bg-tennis-green text-slate-900 rounded">
                        <Save size={12} />
                      </button>
                      <button onClick={() => setEditingSessionId(null)} className="p-1 bg-slate-700 text-white rounded">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {session.location || 'No location'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditingSessionId(session.id); setEditSessionLocation(session.location || ''); }}
                    className="p-1.5 text-slate-500 hover:text-tennis-green"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedSessionId === session.id
                    ? <ChevronUp size={16} className="text-slate-400" />
                    : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded: Session Matches */}
              {expandedSessionId === session.id && (
                <div className="border-t border-slate-700 p-3 space-y-2 bg-slate-900/50">
                  {matches.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">No matches in this session</p>
                  ) : (
                    matches.map((match, idx) => (
                      <div key={match.id} className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                        {editingMatchId === match.id ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-white">
                                {getPlayerName(match.team_a.player1Id)} & {getPlayerName(match.team_a.player2Id)}
                              </span>
                              <input
                                type="number"
                                value={editMatchScoreA}
                                onChange={e => setEditMatchScoreA(parseInt(e.target.value) || 0)}
                                className="w-12 bg-slate-900 text-white text-center rounded border border-slate-600 text-sm"
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-white">
                                {getPlayerName(match.team_b.player1Id)} & {getPlayerName(match.team_b.player2Id)}
                              </span>
                              <input
                                type="number"
                                value={editMatchScoreB}
                                onChange={e => setEditMatchScoreB(parseInt(e.target.value) || 0)}
                                className="w-12 bg-slate-900 text-white text-center rounded border border-slate-600 text-sm"
                              />
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => handleUpdateMatchScore(match.id)} className="flex-1 text-xs bg-tennis-green text-slate-900 py-1 rounded font-bold">
                                Save
                              </button>
                              <button onClick={() => setEditingMatchId(null)} className="flex-1 text-xs bg-slate-700 text-white py-1 rounded">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500 w-4">{idx + 1}.</span>
                                <span className={match.score_a > match.score_b ? 'text-white font-bold' : 'text-slate-400'}>
                                  {getPlayerName(match.team_a.player1Id)} & {getPlayerName(match.team_a.player2Id)}
                                </span>
                                <span className="text-sm font-mono text-white">{match.score_a}</span>
                                <span className="text-slate-600">-</span>
                                <span className="text-sm font-mono text-white">{match.score_b}</span>
                                <span className={match.score_b > match.score_a ? 'text-white font-bold' : 'text-slate-400'}>
                                  {getPlayerName(match.team_b.player1Id)} & {getPlayerName(match.team_b.player2Id)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingMatchId(match.id); setEditMatchScoreA(match.score_a); setEditMatchScoreB(match.score_b); }}
                                className="p-1 text-slate-500 hover:text-tennis-green"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteMatch(match.id)}
                                className="p-1 text-slate-500 hover:text-red-400"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Entry Section */}
      {activeSection === 'quick-entry' && !loading && (
        <div className="space-y-4 px-2">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Trophy size={16} className="text-tennis-green" /> Quick Match Entry
            </h3>
            <p className="text-xs text-slate-400">
              Record a single match result directly to the database
            </p>

            {/* Session Selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase">Session</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={qeUseNewSession}
                    onChange={e => setQeUseNewSession(e.target.checked)}
                    className="rounded"
                  />
                  Create new session
                </label>
              </div>

              {qeUseNewSession ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={qeNewLocation}
                    onChange={e => setQeNewLocation(e.target.value)}
                    placeholder="Location (optional)"
                    className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm"
                  />
                  <input
                    type="date"
                    value={qeNewDate}
                    onChange={e => setQeNewDate(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm"
                  />
                </div>
              ) : (
                <select
                  value={qeSessionId}
                  onChange={e => setQeSessionId(e.target.value)}
                  className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm"
                >
                  <option value="">Select existing session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.played_at).toLocaleDateString('ko-KR')} - {s.location || 'No location'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Team A */}
            <div className="space-y-2">
              <label className="text-xs text-tennis-green font-bold uppercase">Team A (Winners if score higher)</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={qeTeamA1}
                  onChange={e => setQeTeamA1(e.target.value)}
                  className="bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm"
                >
                  <option value="">Player 1</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id} disabled={[qeTeamA2, qeTeamB1, qeTeamB2].includes(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={qeTeamA2}
                  onChange={e => setQeTeamA2(e.target.value)}
                  className="bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm"
                >
                  <option value="">Player 2</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id} disabled={[qeTeamA1, qeTeamB1, qeTeamB2].includes(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team B */}
            <div className="space-y-2">
              <label className="text-xs text-orange-400 font-bold uppercase">Team B</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={qeTeamB1}
                  onChange={e => setQeTeamB1(e.target.value)}
                  className="bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm"
                >
                  <option value="">Player 1</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id} disabled={[qeTeamA1, qeTeamA2, qeTeamB2].includes(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={qeTeamB2}
                  onChange={e => setQeTeamB2(e.target.value)}
                  className="bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm"
                >
                  <option value="">Player 2</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id} disabled={[qeTeamA1, qeTeamA2, qeTeamB1].includes(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scores */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase">Score</label>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <span className="text-xs text-tennis-green">Team A</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setQeScoreA(Math.max(0, qeScoreA - 1))}
                      className="w-8 h-8 rounded-full bg-slate-700 text-white"
                    >-</button>
                    <span className="text-2xl font-bold text-white font-mono w-8 text-center">{qeScoreA}</span>
                    <button
                      onClick={() => setQeScoreA(qeScoreA + 1)}
                      className="w-8 h-8 rounded-full bg-slate-700 text-white"
                    >+</button>
                  </div>
                </div>
                <span className="text-slate-500 font-bold text-lg mt-4">-</span>
                <div className="text-center">
                  <span className="text-xs text-orange-400">Team B</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setQeScoreB(Math.max(0, qeScoreB - 1))}
                      className="w-8 h-8 rounded-full bg-slate-700 text-white"
                    >-</button>
                    <span className="text-2xl font-bold text-white font-mono w-8 text-center">{qeScoreB}</span>
                    <button
                      onClick={() => setQeScoreB(qeScoreB + 1)}
                      className="w-8 h-8 rounded-full bg-slate-700 text-white"
                    >+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleQuickEntry}
              disabled={qeSaving}
              className="w-full py-3 bg-tennis-green text-slate-900 font-bold rounded-xl hover:bg-[#c0ce4e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {qeSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {qeSaving ? 'Saving...' : 'Save Match Result'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};