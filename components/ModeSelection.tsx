import React from 'react';
import { useApp } from '../context/AppContext';
import { Database, User, Sheet, Github, Heart } from 'lucide-react';

const GITHUB_URL = 'https://github.com/HouuYa/tennis-mate';

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
                        <p className="text-xs text-slate-500 mt-1">백엔드 불필요. 이 기기에만 데이터 저장.</p>
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
                        <p className="text-xs text-slate-500 mt-1">내 구글 시트 연동. 무료, 데이터 직접 관리.</p>
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
                        <p className="text-xs text-slate-500 mt-1">클라우드 동기화. 기록과 통계 영구 보관.</p>
                    </div>
                </button>
            </div>

            {/* Footer with GitHub link */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-3">
                <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm"
                >
                    <Github size={18} />
                    <span>View on GitHub</span>
                </a>
                <p className="text-[10px] text-slate-600 flex items-center gap-1">
                    <Heart size={10} className="text-red-500" />
                    Made with love for tennis enthusiasts
                </p>
            </div>
        </div>
    );
};
