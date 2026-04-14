import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Database, Network, ExternalLink } from 'lucide-react';
import { WidgetProps } from '../types/widgets';
import { cn } from '../lib/utils';

export const SystemMonitorWidget: React.FC<WidgetProps> = ({ instanceId, mainColor, isDarkMode, globalTheme }) => {
  const [stats, setStats] = useState({ cpu: 12, ram: 45, net: 2.4 });
  const isGlassy = globalTheme === 'glassy';

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 20) + 5,
        ram: 40 + Math.floor(Math.random() * 10),
        net: parseFloat((Math.random() * 5).toFixed(1))
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const openApp = () => {
    window.dispatchEvent(new CustomEvent('hw_os_open_app', { 
      detail: { appId: 'sys_monitor', morphFromId: instanceId } 
    }));
  };

  return (
    <div className={cn(
      "w-full h-full flex flex-col p-4 group/widget relative overflow-hidden",
      isGlassy ? "bg-white/5 backdrop-blur-md" : "bg-hw-blue/5"
    )}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-hw-blue" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-hw-blue">System Monitor</span>
        </div>
        <button onClick={openApp} className="p-1 hover:bg-hw-blue/20 rounded opacity-0 group-hover/widget:opacity-100 transition-opacity">
          <ExternalLink size={10} className="text-hw-blue" />
        </button>
      </div>

      <div className="space-y-4 flex-1 justify-center flex flex-col">
        {/* CPU */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-1"><Cpu size={8} /> CPU</div>
            <span>{stats.cpu}%</span>
          </div>
          <div className="h-1 bg-hw-blue/10 rounded-full overflow-hidden">
            <div className="h-full bg-hw-blue transition-all duration-500" style={{ width: `${stats.cpu}%` }} />
          </div>
        </div>

        {/* RAM */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-1"><Database size={8} /> RAM</div>
            <span>{stats.ram}%</span>
          </div>
          <div className="h-1 bg-hw-blue/10 rounded-full overflow-hidden">
            <div className="h-full bg-hw-blue transition-all duration-500" style={{ width: `${stats.ram}%` }} />
          </div>
        </div>

        {/* Network */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-1"><Network size={8} /> NET</div>
            <span>{stats.net} MB/S</span>
          </div>
          <div className="h-1 bg-hw-blue/10 rounded-full overflow-hidden">
            <div className="h-full bg-hw-blue transition-all duration-500" style={{ width: `${(stats.net / 10) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
