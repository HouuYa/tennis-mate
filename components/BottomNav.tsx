import React from 'react';
import { Tab } from '../types';
import { Users, Activity, BarChart2, MessageCircle } from 'lucide-react';

interface Props {
  activeTab: Tab;
  setTab: (t: Tab) => void;
}

export const BottomNav: React.FC<Props> = ({ activeTab, setTab }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 safe-area-pb z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => setTab(Tab.PLAYERS)}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === Tab.PLAYERS ? 'text-tennis-green' : 'text-slate-500'}`}
        >
          <Users size={24} />
          <span className="text-[10px] font-bold mt-1">Players</span>
        </button>
        
        <button
          onClick={() => setTab(Tab.MATCHES)}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === Tab.MATCHES ? 'text-tennis-green' : 'text-slate-500'}`}
        >
          <Activity size={24} />
          <span className="text-[10px] font-bold mt-1">Match</span>
        </button>

        <button
          onClick={() => setTab(Tab.FEED)}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === Tab.FEED ? 'text-tennis-green' : 'text-slate-500'}`}
        >
          <MessageCircle size={24} />
          <span className="text-[10px] font-bold mt-1">Chat</span>
        </button>

        <button
          onClick={() => setTab(Tab.STATS)}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === Tab.STATS ? 'text-tennis-green' : 'text-slate-500'}`}
        >
          <BarChart2 size={24} />
          <span className="text-[10px] font-bold mt-1">Stats</span>
        </button>
      </div>
    </div>
  );
};
