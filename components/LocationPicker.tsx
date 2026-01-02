import React, { useState, useEffect } from 'react';
import { MapPin, Locate, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { API_ENDPOINTS } from '../constants';
import { supabase } from '../services/supabaseClient';

interface LocationPickerProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    className?: string;
    loadHistory?: boolean; // Whether to load recent locations from Supabase (Cloud mode only)
    suggestions?: string[]; // External suggestions (e.g. from Google Sheets)
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onChange,
    className = "",
    loadHistory = false,
    suggestions = []
}) => {
    const { showToast } = useToast();
    const [gettingLocation, setGettingLocation] = useState(false);
    const [previousLocations, setPreviousLocations] = useState<string[]>([]);

    // Combine fetched history and external suggestions
    const allSuggestions = Array.from(new Set([...previousLocations, ...suggestions])).slice(0, 10);

    useEffect(() => {
        if (loadHistory) {
            fetchPreviousLocations();
        }
    }, [loadHistory]);

    const fetchPreviousLocations = async () => {
        // Only attempt if supabase is configured
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('location')
                .not('location', 'is', null)
                .order('played_at', { ascending: false })
                .limit(10);

            if (!error && data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const locations = (data as any[])
                    .map(s => s.location)
                    .filter((loc): loc is string => loc !== null);
                const uniqueLocations = Array.from(new Set(locations));
                setPreviousLocations(uniqueLocations);
            }
        } catch (e) {
            // Supabase might not be setup or relevant in local mode, ignore
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
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `${API_ENDPOINTS.NOMINATIM_REVERSE}?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();

                    let displayAddress = data.display_name;
                    // Prioritize specific address parts for shorter display
                    if (data.address) {
                        const { road, suburb, city, town, village } = data.address;
                        const area = suburb || village || town || city;
                        if (road && area) {
                            displayAddress = `${road}, ${area}`;
                        }
                    }

                    const detectedLocation = displayAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    onChange(detectedLocation);
                    showToast('Location detected', 'success');
                } catch (error) {
                    // Fallback to coordinates
                    const { latitude, longitude } = position.coords;
                    onChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    showToast('Location detected (coordinates)', 'success');
                }
                setGettingLocation(false);
            },
            (error) => {
                let errorMessage = 'Failed to get location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable it in settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }
                showToast(errorMessage, 'error');
                setGettingLocation(false);
            },
            {
                enableHighAccuracy: false, // Better for mobile/speed
                timeout: 10000, // 10s timeout
                maximumAge: 60000 // Accept cached position up to 1 min old
            }
        );
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
            <div className="flex items-center gap-2 bg-slate-800 px-3 rounded-lg border border-slate-700 focus-within:border-tennis-green transition-colors">
                <MapPin size={16} className="text-tennis-green" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Where are you playing?"
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

            {allSuggestions.length > 0 && (
                <div className="space-y-1">
                    <p className="text-[10px] text-slate-500">Recent:</p>
                    <div className="flex flex-wrap gap-1">
                        {allSuggestions.map((loc, idx) => (
                            <button
                                key={idx}
                                onClick={() => onChange(loc)}
                                className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-tennis-green rounded border border-slate-700 hover:border-tennis-green transition-colors"
                            >
                                {loc}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
