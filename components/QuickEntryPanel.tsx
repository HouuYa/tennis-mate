import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { adminLogin, verifyAdminToken } from '../services/adminAuthService';
import { useToast } from '../context/ToastContext';
import { Shield, Trophy, Plus, Save, Loader2, Clock, X, ArrowLeft } from 'lucide-react';
import { LocationPicker } from './LocationPicker';

interface QuickEntryPanelProps {
    onClose: () => void;
}

interface QePlayer {
    id: string;
    name: string;
}

interface QeSession {
    id: string;
    played_at: string;
    location: string | null;
}

type SlotKey = 'A1' | 'A2' | 'B1' | 'B2';

export const QuickEntryPanel: React.FC<QuickEntryPanelProps> = ({ onClose }) => {
    const { showToast } = useToast();

    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminId, setAdminId] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);

    // Data
    const [players, setPlayers] = useState<QePlayer[]>([]);
    const [sessions, setSessions] = useState<QeSession[]>([]);
    const [loading, setLoading] = useState(false);

    // Quick Entry form state
    const [qeSessionId, setQeSessionId] = useState('');
    const [qeNewLocation, setQeNewLocation] = useState('');
    const [qeNewDate, setQeNewDate] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });
    const [qeTeamA1, setQeTeamA1] = useState('');
    const [qeTeamA2, setQeTeamA2] = useState('');
    const [qeTeamB1, setQeTeamB1] = useState('');
    const [qeTeamB2, setQeTeamB2] = useState('');
    const [qeScoreA, setQeScoreA] = useState(0);
    const [qeScoreB, setQeScoreB] = useState(0);
    const [qeUseNewSession, setQeUseNewSession] = useState(false);
    const [qeSaving, setQeSaving] = useState(false);
    const [qeShowPlayerPicker, setQeShowPlayerPicker] = useState(false);
    const [qeNewPlayerName, setQeNewPlayerName] = useState('');
    const [qeAddingPlayer, setQeAddingPlayer] = useState(false);
    const [qeTargetTeam, setQeTargetTeam] = useState<'A' | 'B' | null>(null);

    // Drag & Drop
    const [qeDragPlayerId, setQeDragPlayerId] = useState<string | null>(null);
    const [qeDragFromSlot, setQeDragFromSlot] = useState<SlotKey | null>(null);
    const [qeDragOverSlot, setQeDragOverSlot] = useState<SlotKey | null>(null);

    // Check existing token on mount
    useEffect(() => {
        const checkAuth = async () => {
            const valid = await verifyAdminToken();
            if (valid) setIsAuthenticated(true);
            setAuthChecking(false);
        };
        checkAuth();
    }, []);

    // Load data when authenticated
    useEffect(() => {
        if (isAuthenticated) loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        setLoading(true);
        const [playersRes, sessionsRes] = await Promise.all([
            supabase.from('players').select('id, name').order('name'),
            supabase.from('sessions').select('id, played_at, location').order('played_at', { ascending: false })
        ]);
        if (playersRes.data) setPlayers(playersRes.data);
        if (sessionsRes.data) setSessions(sessionsRes.data);
        setLoading(false);
    };

    const handleLogin = async () => {
        if (!adminId.trim() || !adminPassword.trim()) {
            setAuthError('ID와 비밀번호를 입력하세요');
            return;
        }
        setLoginLoading(true);
        setAuthError('');
        const result = await adminLogin(adminId, adminPassword);
        if (result.success) {
            setIsAuthenticated(true);
        } else {
            setAuthError(result.error || 'Invalid credentials');
        }
        setLoginLoading(false);
    };

    // Slot helpers
    const getQeSlotId = (slot: SlotKey): string => {
        if (slot === 'A1') return qeTeamA1;
        if (slot === 'A2') return qeTeamA2;
        if (slot === 'B1') return qeTeamB1;
        return qeTeamB2;
    };
    const setQeSlotId = (slot: SlotKey, id: string) => {
        if (slot === 'A1') setQeTeamA1(id);
        else if (slot === 'A2') setQeTeamA2(id);
        else if (slot === 'B1') setQeTeamB1(id);
        else setQeTeamB2(id);
    };
    const handleQeSlotDrop = (targetSlot: SlotKey) => {
        if (!qeDragPlayerId) return;
        const targetCurrent = getQeSlotId(targetSlot);
        if (qeDragFromSlot) {
            setQeSlotId(qeDragFromSlot, targetCurrent);
            setQeSlotId(targetSlot, qeDragPlayerId);
        } else {
            const allSlotKeys: SlotKey[] = ['A1', 'A2', 'B1', 'B2'];
            const sourceSlot = allSlotKeys.find(s => getQeSlotId(s) === qeDragPlayerId) ?? null;
            if (sourceSlot) setQeSlotId(sourceSlot, targetCurrent);
            setQeSlotId(targetSlot, qeDragPlayerId);
        }
        setQeDragPlayerId(null);
        setQeDragFromSlot(null);
        setQeDragOverSlot(null);
    };

    const handleQePlayerPillClick = (playerId: string) => {
        const allSlots = [qeTeamA1, qeTeamA2, qeTeamB1, qeTeamB2];
        const allSetters = [setQeTeamA1, setQeTeamA2, setQeTeamB1, setQeTeamB2];
        const idx = allSlots.indexOf(playerId);
        if (idx !== -1) { allSetters[idx](''); return; }
        if (qeTargetTeam === 'A') {
            if (!qeTeamA1) { setQeTeamA1(playerId); if (qeTeamA2) setQeTargetTeam(null); return; }
            if (!qeTeamA2) { setQeTeamA2(playerId); setQeTargetTeam(null); return; }
            showToast('Team A is full (2/2)', 'warning');
        } else if (qeTargetTeam === 'B') {
            if (!qeTeamB1) { setQeTeamB1(playerId); if (qeTeamB2) setQeTargetTeam(null); return; }
            if (!qeTeamB2) { setQeTeamB2(playerId); setQeTargetTeam(null); return; }
            showToast('Team B is full (2/2)', 'warning');
        } else {
            showToast('TEAM A 또는 B를 먼저 선택하세요', 'warning');
        }
    };

    const handleQeAddNewPlayer = async () => {
        if (!qeNewPlayerName.trim()) return;
        setQeAddingPlayer(true);
        try {
            const { data, error } = await supabase
                .from('players')
                .insert({ name: qeNewPlayerName.trim() })
                .select()
                .single();
            if (error) throw error;
            showToast(`${qeNewPlayerName.trim()} 추가됨`, 'success');
            setQeNewPlayerName('');
            const { data: refreshed } = await supabase.from('players').select('id, name').order('name');
            if (refreshed) setPlayers(refreshed);
            if (data?.id) {
                if (qeTargetTeam === 'A') {
                    if (!qeTeamA1) { setQeTeamA1(data.id); if (qeTeamA2) setQeTargetTeam(null); }
                    else if (!qeTeamA2) { setQeTeamA2(data.id); setQeTargetTeam(null); }
                } else if (qeTargetTeam === 'B') {
                    if (!qeTeamB1) { setQeTeamB1(data.id); if (qeTeamB2) setQeTargetTeam(null); }
                    else if (!qeTeamB2) { setQeTeamB2(data.id); setQeTargetTeam(null); }
                }
            }
        } catch {
            showToast('선수 추가 실패', 'error');
        } finally {
            setQeAddingPlayer(false);
        }
    };

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
            if (qeUseNewSession || !sessionId) {
                const sessionPayload: { location?: string; status: string; played_at?: string } = { status: 'completed' };
                if (qeNewLocation.trim()) sessionPayload.location = qeNewLocation.trim();
                if (qeNewDate) sessionPayload.played_at = new Date(qeNewDate).toISOString();
                const { data, error } = await supabase.from('sessions').insert(sessionPayload).select('id').single();
                if (error) throw error;
                sessionId = data.id;
                const sessionPlayers = selectedIds.map(pid => ({ session_id: sessionId, player_id: pid }));
                await supabase.from('session_players').upsert(sessionPlayers, { onConflict: 'session_id,player_id' });
            }
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
            setQeScoreA(0); setQeScoreB(0);
            setQeTeamA1(''); setQeTeamA2(''); setQeTeamB1(''); setQeTeamB2('');
            setQeTargetTeam(null);
            loadData();
        } catch (error) {
            console.error('Failed to save match:', error);
            showToast('Failed to save match', 'error');
        } finally {
            setQeSaving(false);
        }
    };

    // Split qeNewDate into date and time parts for separate inputs
    const qeDatePart = qeNewDate.split('T')[0] || '';
    const qeTimePart = qeNewDate.split('T')[1] || '00:00';
    const handleDateChange = (date: string) => setQeNewDate(date + 'T' + qeTimePart);
    const handleTimeChange = (time: string) => setQeNewDate(qeDatePart + 'T' + time);

    // ─── Auth check spinner ───────────────────────────────────────────────────
    if (authChecking) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 size={24} className="animate-spin text-tennis-green" />
            </div>
        );
    }

    // ─── Login screen ─────────────────────────────────────────────────────────
    if (!isAuthenticated) {
        return (
            <div className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <Trophy size={18} className="text-tennis-green" />
                    <h2 className="text-white font-bold">Quick Entry</h2>
                </div>

                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                    <div className="text-center mb-2">
                        <div className="w-14 h-14 bg-tennis-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Shield size={28} className="text-tennis-green" />
                        </div>
                        <h3 className="text-white font-bold">Admin Login</h3>
                        <p className="text-slate-400 text-xs mt-1">Quick Entry requires admin access</p>
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

                    {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}

                    <button
                        onClick={handleLogin}
                        disabled={loginLoading}
                        className="w-full py-3 bg-tennis-green text-slate-900 font-bold rounded-xl hover:bg-[#c0ce4e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loginLoading && <Loader2 size={16} className="animate-spin" />}
                        {loginLoading ? 'Authenticating...' : 'Login'}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Quick Entry UI ───────────────────────────────────────────────────────
    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <Trophy size={18} className="text-tennis-green" />
                    <h2 className="text-white font-bold">Quick Entry</h2>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-tennis-green" size={24} />
                </div>
            ) : (
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
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
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Date & Time</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500">Date</label>
                                            <input
                                                type="date"
                                                value={qeDatePart}
                                                onChange={e => handleDateChange(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-tennis-green outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500">Time</label>
                                            <input
                                                type="time"
                                                value={qeTimePart}
                                                onChange={e => handleTimeChange(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-tennis-green outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <LocationPicker
                                    value={qeNewLocation}
                                    onChange={setQeNewLocation}
                                    loadHistory={true}
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

                    {/* Players */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-slate-400 font-bold uppercase">Players</label>
                            <button
                                type="button"
                                onClick={() => setQeShowPlayerPicker(!qeShowPlayerPicker)}
                                className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 hover:text-white transition-colors"
                            >
                                {qeShowPlayerPicker ? 'Close List' : 'From Global List'}
                            </button>
                        </div>

                        {/* Team A / B selector */}
                        {(() => {
                            const teamAFull = !!(qeTeamA1 && qeTeamA2);
                            const teamBFull = !!(qeTeamB1 && qeTeamB2);
                            const currentTeamFull = (qeTargetTeam === 'A' && teamAFull) || (qeTargetTeam === 'B' && teamBFull);
                            return (
                                <>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => !teamAFull && setQeTargetTeam(qeTargetTeam === 'A' ? null : 'A')}
                                            disabled={teamAFull}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                                                teamAFull
                                                    ? 'bg-tennis-green/10 border-tennis-green/40 text-tennis-green/60 cursor-default'
                                                    : qeTargetTeam === 'A'
                                                    ? 'bg-tennis-green/20 border-tennis-green text-tennis-green'
                                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-tennis-green hover:text-tennis-green'
                                            }`}
                                        >
                                            {teamAFull ? '✓ TEAM A (완료)' : qeTargetTeam === 'A' ? '✓ TEAM A 선택중' : 'TEAM A 선택'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !teamBFull && setQeTargetTeam(qeTargetTeam === 'B' ? null : 'B')}
                                            disabled={teamBFull}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                                                teamBFull
                                                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-400/60 cursor-default'
                                                    : qeTargetTeam === 'B'
                                                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-orange-500 hover:text-orange-400'
                                            }`}
                                        >
                                            {teamBFull ? '✓ TEAM B (완료)' : qeTargetTeam === 'B' ? '✓ TEAM B 선택중' : 'TEAM B 선택'}
                                        </button>
                                    </div>
                                    {!qeTargetTeam && !teamAFull && !teamBFull && (
                                        <p className="text-[10px] text-slate-500 text-center">팀을 선택한 후 선수를 추가할 수 있습니다</p>
                                    )}
                                    {currentTeamFull && (
                                        <p className="text-[10px] text-tennis-green/70 text-center">이 팀은 가득 찼습니다. 다른 팀을 선택하세요.</p>
                                    )}
                                </>
                            );
                        })()}

                        {/* Global list pills */}
                        {qeShowPlayerPicker && (
                            <div className="bg-slate-900 rounded-lg p-2 max-h-36 overflow-y-auto border border-slate-700">
                                <p className="text-[10px] text-slate-500 mb-2 px-1">
                                    {qeTargetTeam ? `탭하여 ${qeTargetTeam === 'A' ? 'Team A' : 'Team B'}에 배정 · 🟢 A팀 · 🟠 B팀` : '팀을 먼저 선택하세요'}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {players.map(p => {
                                        const isTeamA = [qeTeamA1, qeTeamA2].includes(p.id);
                                        const isTeamB = [qeTeamB1, qeTeamB2].includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                draggable={true}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    setQeDragPlayerId(p.id);
                                                    setQeDragFromSlot(null);
                                                }}
                                                onDragEnd={() => { setQeDragPlayerId(null); setQeDragFromSlot(null); setQeDragOverSlot(null); }}
                                                onClick={() => handleQePlayerPillClick(p.id)}
                                                className={`text-xs px-2 py-1 rounded border transition-colors cursor-grab active:cursor-grabbing ${
                                                    isTeamA
                                                        ? 'bg-tennis-green/20 text-tennis-green border-tennis-green'
                                                        : isTeamB
                                                        ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                                                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-tennis-green hover:text-tennis-green'
                                                } ${qeDragPlayerId === p.id ? 'opacity-50' : ''}`}
                                            >
                                                {isTeamA ? 'A· ' : isTeamB ? 'B· ' : '+ '}{p.name}
                                            </button>
                                        );
                                    })}
                                    {players.length === 0 && (
                                        <span className="text-xs text-slate-500 pl-1">선수가 없습니다</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Add new player inline */}
                        {(() => {
                            const teamAFull = !!(qeTeamA1 && qeTeamA2);
                            const teamBFull = !!(qeTeamB1 && qeTeamB2);
                            const currentTeamFull = (qeTargetTeam === 'A' && teamAFull) || (qeTargetTeam === 'B' && teamBFull);
                            const inputDisabled = !qeTargetTeam || currentTeamFull;
                            return (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={qeNewPlayerName}
                                        onChange={e => setQeNewPlayerName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQeAddNewPlayer(); } }}
                                        placeholder={
                                            currentTeamFull ? `Team ${qeTargetTeam} 완료 (2/2)` :
                                            qeTargetTeam ? `Team ${qeTargetTeam} 선수 이름...` : '팀 선택 후 입력'
                                        }
                                        disabled={inputDisabled}
                                        className="flex-1 bg-slate-900 text-white p-2 rounded-lg border border-slate-600 text-sm focus:border-tennis-green outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleQeAddNewPlayer}
                                        disabled={qeAddingPlayer || !qeNewPlayerName.trim() || inputDisabled}
                                        className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 flex items-center gap-1 text-sm"
                                    >
                                        {qeAddingPlayer ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                        Add
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Team assignment display — draggable slots */}
                        <div className="grid grid-cols-2 gap-2">
                            {(['A', 'B'] as const).map(team => (
                                <div key={team}>
                                    <p className={`text-xs font-bold mb-1 uppercase ${team === 'A' ? 'text-tennis-green' : 'text-orange-400'}`}>
                                        Team {team}
                                    </p>
                                    {(['1', '2'] as const).map(pos => {
                                        const slotKey = `${team}${pos}` as SlotKey;
                                        const slotId = getQeSlotId(slotKey);
                                        const isOver = qeDragOverSlot === slotKey;
                                        const isDragging = qeDragPlayerId === slotId && !!slotId;
                                        return (
                                            <div
                                                key={slotKey}
                                                draggable={!!slotId}
                                                onDragStart={slotId ? (e) => {
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    setQeDragPlayerId(slotId);
                                                    setQeDragFromSlot(slotKey);
                                                } : undefined}
                                                onDragEnd={() => { setQeDragPlayerId(null); setQeDragFromSlot(null); setQeDragOverSlot(null); }}
                                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setQeDragOverSlot(slotKey); }}
                                                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setQeDragOverSlot(null); }}
                                                onDrop={(e) => { e.preventDefault(); handleQeSlotDrop(slotKey); }}
                                                className={`text-xs rounded px-2 py-1.5 mb-1 flex items-center justify-between border transition-all ${
                                                    isDragging ? 'opacity-40' :
                                                    slotId
                                                        ? team === 'A'
                                                            ? 'border-tennis-green/40 bg-tennis-green/10 cursor-grab active:cursor-grabbing'
                                                            : 'border-orange-500/40 bg-orange-500/10 cursor-grab active:cursor-grabbing'
                                                        : isOver
                                                            ? team === 'A'
                                                                ? 'border-tennis-green border-dashed bg-tennis-green/5'
                                                                : 'border-orange-500 border-dashed bg-orange-500/5'
                                                            : 'border-slate-700 border-dashed bg-slate-900/50'
                                                } ${isOver && !slotId ? 'scale-[1.02]' : ''}`}
                                            >
                                                <span className={slotId ? 'text-white' : `text-[10px] ${isOver ? (team === 'A' ? 'text-tennis-green' : 'text-orange-400') : 'text-slate-600'}`}>
                                                    {slotId
                                                        ? players.find(p => p.id === slotId)?.name ?? slotId.substring(0, 8)
                                                        : `P${pos} — 드래그`}
                                                </span>
                                                {slotId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setQeSlotId(slotKey, '')}
                                                        className="text-red-400 ml-1 hover:text-red-300 leading-none"
                                                    >×</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-bold uppercase">Score</label>
                        <div className="flex items-center justify-center gap-4">
                            <div className="text-center">
                                <span className="text-xs text-tennis-green">Team A</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <button onClick={() => setQeScoreA(Math.max(0, qeScoreA - 1))} className="w-8 h-8 rounded-full bg-slate-700 text-white">-</button>
                                    <span className="text-2xl font-bold text-white font-mono w-8 text-center">{qeScoreA}</span>
                                    <button onClick={() => setQeScoreA(qeScoreA + 1)} className="w-8 h-8 rounded-full bg-slate-700 text-white">+</button>
                                </div>
                            </div>
                            <span className="text-slate-500 font-bold text-lg mt-4">-</span>
                            <div className="text-center">
                                <span className="text-xs text-orange-400">Team B</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <button onClick={() => setQeScoreB(Math.max(0, qeScoreB - 1))} className="w-8 h-8 rounded-full bg-slate-700 text-white">-</button>
                                    <span className="text-2xl font-bold text-white font-mono w-8 text-center">{qeScoreB}</span>
                                    <button onClick={() => setQeScoreB(qeScoreB + 1)} className="w-8 h-8 rounded-full bg-slate-700 text-white">+</button>
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
            )}
        </div>
    );
};
