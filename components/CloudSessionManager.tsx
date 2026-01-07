import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Play, Clock, ChevronRight, Loader2, MapPin, Home, AlertTriangle, RefreshCw } from 'lucide-react';
import { LocationPicker } from './LocationPicker';
import { SessionSummary, SessionRecord, SessionLocationRecord } from '../types';
import { supabase } from '../services/supabaseClient';

interface CloudSessionManagerProps {
    onSessionReady?: () => void;
}

const CLOUD_SESSION_ID_KEY = 'tennis-mate-current-session-id';

export const CloudSessionManager: React.FC<CloudSessionManagerProps> = ({ onSessionReady }) => {
    const { startCloudSession, loadCloudSession, sessionDate, setSessionDate, exitMode } = useApp();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<'NEW' | 'LOAD'>('NEW');
    const [location, setLocation] = useState('');
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Check for saved session on mount
    useEffect(() => {
        const saved = localStorage.getItem(CLOUD_SESSION_ID_KEY);
        if (saved) {
            setSavedSessionId(saved);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'LOAD') {
            fetchSessions();
        } else if (activeTab === 'NEW') {
            // Initialize Date if empty
            if (!sessionDate) {
                // Correct local time for datetime-local
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                setSessionDate(now.toISOString().slice(0, 16));
            }
        }
    }, [activeTab, sessionDate, setSessionDate]);

    const fetchSessions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sessions')
            .select('id, played_at, location, status')
            .order('played_at', { ascending: false });

        if (error) {
            showToast("Failed to load sessions", "error");
        } else {
            const mapped: SessionSummary[] = (data as SessionRecord[]).map(s => ({
                id: s.id,
                playedAt: new Date(s.played_at).getTime(),
                location: s.location ?? undefined,
                status: s.status
            }));
            setSessions(mapped);
        }
        setLoading(false);
    };





    const handleStartClick = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmStart = async () => {
        setShowConfirmDialog(false);
        setLoading(true);
        try {
            await startCloudSession(location || 'Unknown Location', sessionDate);
            onSessionReady?.(); // Notify parent that session is ready
        } catch (error) {
            console.error('Failed to start session:', error);
            showToast('Failed to start a new session. Please try again.', 'error');
            setLoading(false);
        }
    };

    const handleLoad = async (id: string) => {
        setLoading(true);
        try {
            await loadCloudSession(id);
            onSessionReady?.(); // Notify parent that session is ready
        } catch (error) {
            console.error('Failed to load session:', error);
            showToast('Failed to load the session. Please try again.', 'error');
            setLoading(false);
        }
    };

    const handleContinueSavedSession = async () => {
        if (!savedSessionId) return;
        setLoading(true);
        try {
            await loadCloudSession(savedSessionId);
            showToast('이전 세션을 불러왔습니다.', 'success');
            onSessionReady?.();
        } catch (error) {
            console.error('Failed to load saved session:', error);
            showToast('이전 세션을 불러오는데 실패했습니다.', 'error');
            // Clear invalid session ID
            localStorage.removeItem(CLOUD_SESSION_ID_KEY);
            setSavedSessionId(null);
            setLoading(false);
        }
    };

    const handleBackToModeSelection = () => {
        if (confirm("모드 선택 화면으로 돌아가시겠습니까?")) {
            exitMode();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6 max-w-sm mx-auto">
            <h2 className="text-2xl font-black text-tennis-green italic">SESSION MANAGER</h2>

            {/* Saved Session Banner */}
            {savedSessionId && (
                <div className="w-full bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-blue-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="text-blue-300 font-medium text-sm">이전 세션이 저장되어 있습니다.</p>
                            <p className="text-blue-400/80 text-xs mt-1">이전 세션을 이어서 진행하거나, 새 세션을 시작할 수 있습니다.</p>
                            <button
                                onClick={handleContinueSavedSession}
                                disabled={loading}
                                className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                이전 세션 계속하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab navigation */}
            <div className="flex bg-slate-800 p-1 rounded-lg w-full">
                <button
                    onClick={() => setActiveTab('NEW')}
                    className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'NEW' ? 'bg-tennis-green text-slate-900' : 'text-slate-400 hover:text-white'}`}
                >
                    Start New
                </button>
                <button
                    onClick={() => setActiveTab('LOAD')}
                    className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'LOAD' ? 'bg-tennis-green text-slate-900' : 'text-slate-400 hover:text-white'}`}
                >
                    Load Existing
                </button>
            </div>

            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                {activeTab === 'NEW' ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Date & Time</label>
                            <div className="relative">
                                <input
                                    type="datetime-local"
                                    value={sessionDate}
                                    onChange={(e) => setSessionDate(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-tennis-green outline-none font-mono"
                                />
                                <Clock size={16} className="absolute right-3 top-3.5 text-tennis-green pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <LocationPicker
                                value={location}
                                onChange={setLocation}
                                loadHistory={true}
                            />
                        </div>

                        <button
                            onClick={handleStartClick}
                            disabled={loading}
                            className="w-full py-3 mt-4 bg-tennis-green text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#d4e157] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                            Start Session
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {loading && sessions.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 flex justify-center"><Loader2 className="animate-spin" /></div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">No recent sessions found.</div>
                            ) : (
                                sessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => handleLoad(session.id)}
                                        disabled={loading}
                                        className="w-full text-left p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-tennis-green hover:bg-slate-750 transition-all group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-white text-sm">
                                                    {new Date(session.playedAt).toLocaleDateString()}
                                                    <span className="ml-2 font-normal text-slate-400 text-xs">{new Date(session.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                {session.location && <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={10} /> {session.location}</div>}
                                            </div>
                                            <ChevronRight size={16} className="text-slate-600 group-hover:text-tennis-green" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Back to Mode Selection */}
            <button
                onClick={handleBackToModeSelection}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm"
            >
                <Home size={16} />
                <span>Back to Mode Selection</span>
            </button>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full space-y-4">
                        <h3 className="text-xl font-bold text-tennis-green">Confirm Session Start</h3>
                        <div className="space-y-2 text-sm text-slate-300">
                            <p><span className="text-slate-500">Date:</span> {sessionDate ? new Date(sessionDate).toLocaleString() : new Date().toLocaleString()}</p>
                            <p><span className="text-slate-500">Location:</span> {location || 'Unknown Location'}</p>
                        </div>
                        <p className="text-sm text-slate-400">Do you want to start this session?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className="flex-1 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmStart}
                                className="flex-1 py-2 bg-tennis-green text-slate-900 font-bold rounded-lg hover:bg-[#d4e157] transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
