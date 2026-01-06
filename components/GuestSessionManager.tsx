import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Play, Clock, Home, AlertTriangle, RefreshCw } from 'lucide-react';
import { LocationPicker } from './LocationPicker';

const GUEST_LOCATIONS_KEY = 'tennis-mate-guest-locations';
const MAX_RECENT_LOCATIONS = 10;

interface GuestSessionManagerProps {
    onSessionReady: () => void;
    isExistingSession?: boolean;
}

export const GuestSessionManager: React.FC<GuestSessionManagerProps> = ({
    onSessionReady,
    isExistingSession = false
}) => {
    const {
        sessionLocation,
        setSessionLocation,
        sessionDate,
        setSessionDate,
        exitMode,
        resetData
    } = useApp();
    const { showToast } = useToast();

    const [recentLocations, setRecentLocations] = useState<string[]>([]);

    useEffect(() => {
        // Load recent locations from localStorage
        loadRecentLocations();

        // Initialize date if empty
        if (!sessionDate) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setSessionDate(now.toISOString().slice(0, 16));
        }
    }, [sessionDate, setSessionDate]);

    const loadRecentLocations = () => {
        try {
            const saved = localStorage.getItem(GUEST_LOCATIONS_KEY);
            if (saved) {
                const locations = JSON.parse(saved);
                // Remove duplicates
                const unique = Array.from(new Set(locations as string[]));
                setRecentLocations(unique.slice(0, MAX_RECENT_LOCATIONS));
            }
        } catch (e) {
            console.error('Failed to load recent locations:', e);
        }
    };

    const saveLocationToHistory = (location: string) => {
        if (!location.trim()) return;

        try {
            const saved = localStorage.getItem(GUEST_LOCATIONS_KEY);
            let locations: string[] = saved ? JSON.parse(saved) : [];

            // Add to beginning, remove duplicates
            locations = [location, ...locations.filter(loc => loc !== location)];
            locations = locations.slice(0, MAX_RECENT_LOCATIONS);

            localStorage.setItem(GUEST_LOCATIONS_KEY, JSON.stringify(locations));
            setRecentLocations(locations);
        } catch (e) {
            console.error('Failed to save location:', e);
        }
    };

    const handleStart = () => {
        if (sessionLocation) {
            saveLocationToHistory(sessionLocation);
        }
        showToast('Session started!', 'success');
        onSessionReady();
    };

    const handleBackToModeSelection = () => {
        if (confirm("모드 선택 화면으로 돌아가시겠습니까? 현재 세션 데이터는 유지됩니다.")) {
            exitMode();
        }
    };

    const handleResetData = () => {
        if (confirm("모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            resetData();
            showToast('데이터가 초기화되었습니다.', 'success');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6 max-w-sm mx-auto">
            <h2 className="text-2xl font-black text-tennis-green italic">SESSION MANAGER</h2>

            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                {/* Existing Session Warning */}
                {isExistingSession && (
                    <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <p className="text-amber-300 font-medium">이전 세션 데이터가 저장되어 있습니다.</p>
                                <p className="text-amber-400/80 text-xs mt-1">
                                    새로운 매치를 시작하려면 아래의 "Reset All Data" 버튼을 클릭하세요.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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

                    <LocationPicker
                        value={sessionLocation}
                        onChange={setSessionLocation}
                        suggestions={recentLocations}
                    />

                    <button
                        onClick={handleStart}
                        className="w-full py-3 mt-4 bg-tennis-green text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#d4e157] active:scale-95 transition-all"
                    >
                        <Play size={20} />
                        {isExistingSession ? 'Continue Session' : 'Start Session'}
                    </button>

                    {isExistingSession && (
                        <button
                            onClick={handleResetData}
                            className="w-full py-2 bg-red-900/30 text-red-400 font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-red-900/50 border border-red-900/50 transition-all text-sm"
                        >
                            <RefreshCw size={16} />
                            Reset All Data
                        </button>
                    )}
                </div>
            </div>

            {/* Back to Mode Selection */}
            <button
                onClick={handleBackToModeSelection}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm"
            >
                <Home size={16} />
                <span>Back to Mode Selection</span>
            </button>
        </div>
    );
};
