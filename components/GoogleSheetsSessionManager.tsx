import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Play, BookOpen, AlertCircle, Settings, Clock, Loader2, Home, AlertTriangle, RefreshCw } from 'lucide-react';
import { GoogleSheetsGuide } from './GoogleSheetsGuide';
import { LocationPicker } from './LocationPicker';

interface Props {
    onSessionReady: () => void;
}

export const GoogleSheetsSessionManager = ({ onSessionReady }: Props) => {
    // 1. AppContext
    const {
        setGoogleSheetsUrl,
        testGoogleSheetsConnection,
        loadGoogleSheetsData,
        getGoogleSheetsUrl,
        addPlayer,
        getAllPlayers,
        resetData,
        sessionLocation,
        setSessionLocation,
        getRecentLocations,
        sessionDate,
        setSessionDate,
        exitMode
    } = useApp();
    const { showToast } = useToast();

    // 2. State
    const [url, setUrl] = useState('');
    const [savedUrl, setSavedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [mode, setMode] = useState<'LANDING' | 'SETUP'>('LANDING'); // Internal mode
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        const saved = getGoogleSheetsUrl();
        if (saved) {
            setSavedUrl(saved);
            setMode('LANDING');
            // Fetch recent locations for suggestions, removing duplicates
            getRecentLocations().then(locs => {
                const uniqueLocs = Array.from(new Set(locs));
                setSuggestions(uniqueLocs);
            });
            // Initialize Date if empty
            if (!sessionDate) {
                // Correct local time for datetime-local
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                setSessionDate(now.toISOString().slice(0, 16));
            }
        } else {
            setMode('SETUP');
        }
    }, [getGoogleSheetsUrl, getRecentLocations, sessionDate, setSessionDate]);

    // 3. Handlers

    const handleConnect = async () => {
        if (!url.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            // Validation
            if (!url.includes('script.google.com')) {
                throw new Error('Invalid URL. Must be a Google Apps Script Web App URL.');
            }

            // Save URL first
            await setGoogleSheetsUrl(url.trim());

            // Test connection
            await testGoogleSheetsConnection(); // This usually verifies Get request

            // If success
            showToast('Connected to Google Sheets!', 'success');

            // Auto-load data and setup defaults
            await loadGoogleSheetsData();
            await ensurePlayersExist();

            // Setup complete
            onSessionReady();
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Connection failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUseCurrent = async () => {
        setIsLoading(true);
        try {
            // User requested: Start FRESH session but keep connection.
            // Do NOT load past matches into active session.
            // resetData() will clear matches and restore default players.
            // BUG FIX: resetData() clears sessionLocation and sessionDate, so we preserve them.
            const savedLocation = sessionLocation;
            const savedDate = sessionDate;

            resetData();

            // Restore session metadata
            if (savedLocation) setSessionLocation(savedLocation);
            if (savedDate) setSessionDate(savedDate);

            showToast('Started new session', 'success');
            onSessionReady();
        } catch (e) {
            setError('Failed to start session.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToModeSelection = () => {
        if (confirm("모드 선택 화면으로 돌아가시겠습니까?")) {
            exitMode();
        }
    };

    // Helper to ensure we have players (Deadlock prevention)
    const ensurePlayersExist = async () => {
        const currentPlayers = await getAllPlayers();
        if (currentPlayers.length === 0) {
            showToast('Sheet is empty. Adding default players...', 'info');
            const defaultNames = ['Nadal', 'Federer', 'Djokovic', 'Murray', 'Alcaraz'];
            for (const name of defaultNames) {
                await addPlayer(name);
            }
        }
    };

    const navToSetup = () => {
        setMode('SETUP');
        setUrl('');
    };

    if (showGuide) return <GoogleSheetsGuide onClose={() => setShowGuide(false)} />;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden">

                {/* Mode: LANDING (Choice) */}
                {mode === 'LANDING' && (
                    <div className="p-6 space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-100">Google Sheets Connected</h2>
                        </div>
                        <p className="text-sm text-slate-400 -mt-4">Ready to sync with your spreadsheet.</p>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500">Location</label>
                                <LocationPicker
                                    value={sessionLocation}
                                    onChange={setSessionLocation}
                                    suggestions={suggestions}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500">Date & Time</label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        value={sessionDate}
                                        onChange={(e) => setSessionDate(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-tennis-green outline-none font-mono"
                                    />
                                    <Clock size={16} className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleUseCurrent}
                                disabled={isLoading}
                                className="w-full bg-tennis-green hover:bg-[#d4e157] text-slate-900 font-bold p-4 rounded-xl text-left transition-all group relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between z-10 relative">
                                    <span className="flex items-center gap-2">
                                        {isLoading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                                        Start New Session
                                    </span>
                                </div>
                                <p className="text-xs text-slate-800/80 font-mono mt-1 font-medium truncate z-10 relative">
                                    Link: {savedUrl}
                                </p>
                            </button>

                            <button
                                onClick={navToSetup}
                                disabled={isLoading}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-400 p-4 rounded-xl text-left transition-all group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">Connect New Sheet</span>
                                    <Settings size={16} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-xs text-slate-500">Enter a different URL</p>
                            </button>
                        </div>
                    </div>
                )}

                {/* Mode: SETUP */}
                {mode === 'SETUP' && (
                    <div className="p-6 space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-100">Connect Sheet</h2>
                            {savedUrl && (
                                <button onClick={() => setMode('LANDING')} className="text-xs text-slate-500 hover:text-white">
                                    Cancel
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Web App URL</label>
                            <input
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder="https://script.google.com/..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-tennis-green outline-none font-mono"
                            />
                            <button onClick={() => setShowGuide(true)} className="text-xs text-blue-400 font-medium flex items-center gap-1 hover:underline">
                                <BookOpen size={14} /> View Setup Guide
                            </button>
                        </div>

                        {error && (
                            <div className="flex bg-red-500/10 p-3 rounded-lg gap-2 text-red-400 text-xs items-start">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleConnect}
                            disabled={isLoading || !url}
                            className="w-full bg-tennis-green text-slate-900 font-bold py-3 rounded-xl disabled:opacity-50 hover:bg-[#d4e157] transition-colors flex justify-center"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Connect & Load'}
                        </button>
                    </div>
                )}

                {/* Back to Mode Selection */}
                <button
                    onClick={handleBackToModeSelection}
                    className="w-full py-4 flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-colors text-sm border-t border-slate-800"
                >
                    <Home size={16} />
                    <span>Back to Mode Selection</span>
                </button>
            </div>
        </div>
    );
};
