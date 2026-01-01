import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { MapPin, Play, Clock, ChevronRight, Loader2, Locate } from 'lucide-react';
import { SessionSummary, SessionRecord, SessionLocationRecord } from '../types';
import { supabase } from '../services/supabaseClient';
import { API_ENDPOINTS } from '../constants';

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
    const [gettingLocation, setGettingLocation] = useState(false);
    const [previousLocations, setPreviousLocations] = useState<string[]>([]);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    useEffect(() => {
        if (activeTab === 'LOAD') {
            fetchSessions();
        } else if (activeTab === 'NEW') {
            fetchPreviousLocations();
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

    const fetchPreviousLocations = async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select('location')
            .not('location', 'is', null)
            .order('played_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            const locations = (data as SessionLocationRecord[])
                .map(s => s.location)
                .filter((loc): loc is string => loc !== null);
            const uniqueLocations = Array.from(new Set(locations));
            setPreviousLocations(uniqueLocations);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    // TODO: Replace with Kakao or Naver API for Korean address support
                    // See TODO.md for implementation guide
                    // Current: OpenStreetMap Nominatim (returns English addresses)
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `${API_ENDPOINTS.NOMINATIM_REVERSE}?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();
                    const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    setLocation(address);
                    showToast('Location detected', 'success');
                } catch (error) {
                    // Fallback to coordinates
                    const { latitude, longitude } = position.coords;
                    setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    showToast('Location detected (coordinates)', 'success');
                }
                setGettingLocation(false);
            },
            (error) => {
                showToast('Failed to get location', 'error');
                setGettingLocation(false);
            }
        );
    };

    const handleStartClick = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmStart = async () => {
        setShowConfirmDialog(false);
        setLoading(true);
        try {
            await startCloudSession(location || 'Unknown Location');
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
                                <button
                                    onClick={handleGetLocation}
                                    disabled={gettingLocation}
                                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
                                    title="Use my location"
                                >
                                    {gettingLocation ? <Loader2 size={16} className="animate-spin text-tennis-green" /> : <Locate size={16} className="text-tennis-green" />}
                                </button>
                            </div>

                            {previousLocations.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500">Recent locations:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {previousLocations.slice(0, 5).map((loc, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setLocation(loc)}
                                                className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-tennis-green rounded border border-slate-700 hover:border-tennis-green transition-colors"
                                            >
                                                {loc}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
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

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full space-y-4">
                        <h3 className="text-xl font-bold text-tennis-green">Confirm Session Start</h3>
                        <div className="space-y-2 text-sm text-slate-300">
                            <p><span className="text-slate-500">Date:</span> {new Date().toLocaleString()}</p>
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
