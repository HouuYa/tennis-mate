import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { MapPin, Play, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { SessionSummary } from '../types';
import { supabase } from '../services/supabaseClient';

interface CloudSessionManagerProps {
    onSessionReady?: () => void;
}

export const CloudSessionManager: React.FC<CloudSessionManagerProps> = ({ onSessionReady }) => {
    const { startCloudSession, loadCloudSession } = useApp();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<'NEW' | 'LOAD'>('NEW');
    const [location, setLocation] = useState('');
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'LOAD') {
            fetchSessions();
        }
    }, [activeTab]);

    const fetchSessions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sessions')
            .select('id, played_at, location, status')
            .order('played_at', { ascending: false });

        if (error) {
            showToast("Failed to load sessions", "error");
        } else {
            const mapped = data.map((s: any) => ({
                id: s.id,
                playedAt: new Date(s.played_at).getTime(),
                location: s.location,
                status: s.status
            }));
            setSessions(mapped);
        }
        setLoading(false);
    };

    const handleStart = async () => {
        setLoading(true);
        try {
            await startCloudSession(location || 'Unknown Location');
            onSessionReady?.(); // Notify parent that session is ready
        } catch (error) {
            console.error('Failed to start session:', error);
        }
        setLoading(false);
    };

    const handleLoad = async (id: string) => {
        setLoading(true);
        try {
            await loadCloudSession(id);
            onSessionReady?.(); // Notify parent that session is ready
        } catch (error) {
            console.error('Failed to load session:', error);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6 max-w-sm mx-auto">
            <h2 className="text-2xl font-black text-tennis-green italic">SESSION MANAGER</h2>

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
                            <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-lg border border-slate-700 text-slate-300">
                                <Clock size={16} className="text-tennis-green" />
                                <span>{new Date().toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">* Defaults to current time</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Location (Optional)</label>
                            <div className="flex items-center gap-2 bg-slate-800 px-3 rounded-lg border border-slate-700 focus-within:border-tennis-green transition-colors">
                                <MapPin size={16} className="text-tennis-green" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. Center Court"
                                    className="bg-transparent py-3 text-white placeholder-slate-500 text-sm w-full outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
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
        </div>
    );
};
