import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, ExternalLink } from 'lucide-react';
import { WidgetProps } from '../types/widgets';
import { cn } from '../lib/utils';

export const ClockWidget: React.FC<WidgetProps> = ({ instanceId, mainColor, isDarkMode, globalTheme }) => {
  const [time, setTime] = useState(new Date());
  const isGlassy = globalTheme === 'glassy';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openApp = () => {
    // Clock app doesn't exist yet, but we can open a placeholder or just morph to a "Clock" app if we create it.
    // For now, let's just show the morphing intent.
    window.dispatchEvent(new CustomEvent('hw_os_open_app', { 
      detail: { appId: 'clock', morphFromId: instanceId } 
    }));
  };

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const date = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className={cn(
      "w-full h-full flex flex-col items-center justify-center p-4 group/widget relative overflow-hidden",
      isGlassy ? "bg-white/5 backdrop-blur-md" : "bg-hw-blue/5"
    )}>
      <div className="absolute top-2 right-2 opacity-0 group-hover/widget:opacity-100 transition-opacity">
        <button onClick={openApp} className="p-1 hover:bg-hw-blue/20 rounded">
          <ExternalLink size={10} className="text-hw-blue" />
        </button>
      </div>

      <div className="text-4xl font-bold tracking-tighter flex items-baseline gap-1">
        <span>{hours}</span>
        <span className="animate-pulse opacity-40">:</span>
        <span>{minutes}</span>
        <span className="text-sm opacity-40 ml-1">{seconds}</span>
      </div>
      
      <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.3em] text-hw-blue opacity-60">
        {date}
      </div>

      {/* Analog style decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-hw-blue rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-hw-blue/50 rounded-full" />
      </div>
    </div>
  );
};
