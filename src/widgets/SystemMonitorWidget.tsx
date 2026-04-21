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

  return (
    <div className={cn(
      "w-full h-full flex flex-col group/widget relative overflow-hidden"
    )} style={{ padding: 'max(8px, 5cqmin)' }}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <Activity className="" style={{ color: 'var(--theme-main)', width: 'max(10px, 8cqmin)', height: 'max(10px, 8cqmin)' }} />
          <span className="font-bold uppercase tracking-widest " style={{ color: 'var(--theme-main)', fontSize: 'max(6px, 6cqmin)' }}>System Monitor</span>
        </div>
      </div>

      <div className="flex-1 justify-center flex flex-col" style={{ gap: 'max(4px, 3cqmin)' }}>
        {/* CPU */}
        <div className="space-y-1">
          <div className="flex justify-between font-bold uppercase tracking-widest opacity-60" style={{ fontSize: 'max(6px, 5cqmin)' }}>
            <div className="flex items-center gap-1"><Cpu style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} /> CPU</div>
            <span>{stats.cpu}%</span>
          </div>
          <div className="bg-theme-main-10 rounded-full overflow-hidden" style={{ height: 'max(2px, 1.5cqmin)' }}>
            <div className="h-full bg-theme-main transition-all duration-500" style={{ width: `${stats.cpu}%` }} />
          </div>
        </div>

        {/* RAM */}
        <div className="space-y-1">
          <div className="flex justify-between font-bold uppercase tracking-widest opacity-60" style={{ fontSize: 'max(6px, 5cqmin)' }}>
            <div className="flex items-center gap-1"><Database style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} /> RAM</div>
            <span>{stats.ram}%</span>
          </div>
          <div className="bg-theme-main-10 rounded-full overflow-hidden" style={{ height: 'max(2px, 1.5cqmin)' }}>
            <div className="h-full bg-theme-main transition-all duration-500" style={{ width: `${stats.ram}%` }} />
          </div>
        </div>

        {/* Network */}
        <div className="space-y-1">
          <div className="flex justify-between font-bold uppercase tracking-widest opacity-60" style={{ fontSize: 'max(6px, 5cqmin)' }}>
            <div className="flex items-center gap-1"><Network style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} /> NET</div>
            <span>{stats.net} MB/S</span>
          </div>
          <div className="bg-theme-main-10 rounded-full overflow-hidden" style={{ height: 'max(2px, 1.5cqmin)' }}>
            <div className="h-full bg-theme-main transition-all duration-500" style={{ width: `${(stats.net / 10) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
