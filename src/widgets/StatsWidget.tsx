import React, { useState, useEffect } from 'react';
import { WidgetProps } from '../types/widgets';
import { cn } from '../lib/utils';
import { Activity, Cpu, Database, Zap } from 'lucide-react';

export const StatsWidget: React.FC<WidgetProps> = ({ mainColor, isDarkMode, globalTheme }) => {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, gpu: 0 });
  const isGlassy = globalTheme === 'glassy';

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 30) + 10,
        ram: Math.floor(Math.random() * 20) + 40,
        gpu: Math.floor(Math.random() * 15) + 5
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const StatBar = ({ label, value, icon: Icon }: { label: string, value: number, icon: any }) => (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center uppercase tracking-widest opacity-60" style={{ fontSize: 'max(6px, 5cqmin)' }}>
        <div className="flex items-center gap-1">
          <Icon style={{ color: 'var(--theme-main)', width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} />
          <span>{label}</span>
        </div>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="w-full bg-black/40 rounded-full overflow-hidden border border-white/5" style={{ height: 'max(2px, 1.5cqmin)' }}>
        <div 
          className="h-full transition-all duration-1000 relative"
          style={{ 
            width: `${value}%`,
            backgroundColor: mainColor
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className={cn(
        "w-full h-full flex flex-col justify-center group",
        isGlassy ? "bg-white/5 backdrop-blur-md" : "bg-theme-main-5"
      )}
      style={{ padding: 'max(8px, 5cqmin)', gap: 'max(4px, 3cqmin)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Activity className=" animate-pulse" style={{ color: 'var(--theme-main)', width: 'max(8px, 6cqmin)', height: 'max(8px, 6cqmin)' }} />
          <span className="font-bold uppercase tracking-[0.2em] " style={{ color: 'var(--theme-main)', fontSize: 'max(6px, 6cqmin)' }}>Sys_Pulse</span>
        </div>
        <div className="opacity-30 font-mono" style={{ fontSize: 'max(5px, 4cqmin)' }}>RT_MONITOR</div>
      </div>
      
      <StatBar label="CPU" value={stats.cpu} icon={Cpu} />
      <StatBar label="RAM" value={stats.ram} icon={Database} />
      <StatBar label="GPU" value={stats.gpu} icon={Zap} />
    </div>
  );
};
