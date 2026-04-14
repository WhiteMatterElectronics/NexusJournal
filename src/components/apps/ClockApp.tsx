import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Calendar, Globe, Bell, Timer, Watch } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ClockApp: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'clock' | 'world' | 'alarm' | 'stopwatch' | 'timer'>('clock');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
  };

  return (
    <div className="h-full flex flex-col bg-hw-black text-hw-blue font-mono overflow-hidden">
      {/* Sidebar / Tabs */}
      <div className="flex border-b border-hw-blue/20 bg-hw-blue/5">
        {[
          { id: 'clock', icon: ClockIcon, label: 'Clock' },
          { id: 'world', icon: Globe, label: 'World' },
          { id: 'alarm', icon: Bell, label: 'Alarms' },
          { id: 'stopwatch', icon: Watch, label: 'Stopwatch' },
          { id: 'timer', icon: Timer, label: 'Timer' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 transition-all border-r border-hw-blue/10",
              activeTab === tab.id ? "bg-hw-blue/20 border-b-2 border-b-hw-blue" : "hover:bg-hw-blue/10"
            )}
          >
            <tab.icon size={16} className={activeTab === tab.id ? "text-hw-blue" : "opacity-40"} />
            <span className="text-[8px] font-bold uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
        {activeTab === 'clock' && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative inline-block">
              <div className="text-8xl font-bold tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(0,242,255,0.3)]">
                {formatTime(time)}
              </div>
              <div className="absolute -top-4 -right-4 w-4 h-4 bg-hw-blue rounded-full animate-ping opacity-20" />
            </div>
            <div className="flex items-center justify-center gap-4 text-sm font-bold tracking-[0.4em] opacity-60">
              <Calendar size={16} />
              {formatDate(time)}
            </div>
            
            {/* Decorative Analog Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-hw-blue/5 rounded-full pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-hw-blue/20" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-hw-blue/20" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-4 bg-hw-blue/20" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1 w-4 bg-hw-blue/20" />
            </div>
          </div>
        )}

        {activeTab !== 'clock' && (
          <div className="flex flex-col items-center justify-center opacity-30">
            <ClockIcon size={48} className="mb-4" />
            <span className="text-xs uppercase tracking-[0.3em]">Module Under Construction</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-hw-blue/5 border-t border-hw-blue/10 flex justify-between items-center text-[9px] uppercase tracking-widest font-bold opacity-60">
        <span>Timezone: UTC+2 (EET)</span>
        <span>Uptime: 04:12:44</span>
      </div>
    </div>
  );
};
