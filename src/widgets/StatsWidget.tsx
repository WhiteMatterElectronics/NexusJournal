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
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-center text-[8px] uppercase tracking-widest opacity-60">
        <div className="flex items-center gap-1.5">
          <Icon className="w-2.5 h-2.5" style={{ color: mainColor }} />
          <span>{label}</span>
        </div>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
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
        "w-full h-full flex flex-col justify-center p-4 space-y-4 cursor-pointer group",
        isGlassy ? "bg-white/5 backdrop-blur-md" : "bg-hw-blue/5"
      )}
      onClick={() => window.dispatchEvent(new CustomEvent('hw_os_open_app', { detail: 'monitor' }))}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-hw-blue animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-hw-blue">Sys_Pulse</span>
        </div>
        <div className="text-[7px] opacity-30 font-mono">RT_MONITOR</div>
      </div>
      
      <StatBar label="CPU" value={stats.cpu} icon={Cpu} />
      <StatBar label="RAM" value={stats.ram} icon={Database} />
      <StatBar label="GPU" value={stats.gpu} icon={Zap} />
      
      <div className="pt-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[7px] uppercase tracking-widest text-hw-blue/60 font-bold">Launch System Monitor</span>
      </div>
    </div>
  );
};
