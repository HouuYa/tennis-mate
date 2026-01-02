import React from 'react';
import { useApp } from '../context/AppContext';
import { Database, User, Sheet } from 'lucide-react';

export const ModeSelection = () => {
    const { switchMode } = useApp();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8 bg-slate-950 text-slate-100">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black italic tracking-tighter text-tennis-green">
                    TENNIS MATE
                </h1>
                <p className="text-slate-400">Choose how you want to play</p>
            </div>

            <div className="grid gap-4 w-full max-w-sm">
                <button
                    onClick={() => switchMode('LOCAL')}
                    className="flex items-center p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-tennis-green hover:bg-slate-800 transition-all group"
                >
                    <div className="p-3 mr-4 rounded-full bg-slate-800 text-tennis-green group-hover:bg-tennis-green group-hover:text-slate-900 transition-colors">
                        <User size={24} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-lg">Guest Mode</h3>
                        <p className="text-sm text-slate-400">No backend required. Data is saved on this device only.</p>
                    </div>
                </button>

                <button
                    onClick={() => switchMode('GOOGLE_SHEETS')}
                    className="flex items-center p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-tennis-green hover:bg-slate-800 transition-all group"
                >
                    <div className="p-3 mr-4 rounded-full bg-slate-800 text-emerald-400 group-hover:bg-emerald-400 group-hover:text-slate-900 transition-colors">
                        <Sheet size={24} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-lg">Google Sheets Mode</h3>
                        <p className="text-sm text-slate-400">Use your own Google Sheets. Free and you own your data.</p>
                    </div>
                </button>

                <button
                    onClick={() => switchMode('CLOUD')}
                    className="flex items-center p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-tennis-green hover:bg-slate-800 transition-all group"
                >
                    <div className="p-3 mr-4 rounded-full bg-slate-800 text-blue-400 group-hover:bg-blue-400 group-hover:text-slate-900 transition-colors">
                        <Database size={24} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-lg">Cloud Mode</h3>
                        <p className="text-sm text-slate-400">Sync with Supabase. Save history and stats forever.</p>
                    </div>
                </button>
            </div>
        </div>
    );
};
