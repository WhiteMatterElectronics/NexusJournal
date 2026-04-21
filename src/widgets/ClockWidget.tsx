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

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const date = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className={cn(
      "w-full h-full flex flex-col items-center justify-center p-4 group/widget relative overflow-hidden"
    )}>
      <div className="font-bold tracking-tighter flex items-baseline gap-1" style={{ fontSize: 'max(16px, 25cqmin)' }}>
        <span>{hours}</span>
        <span className="animate-pulse opacity-40">:</span>
        <span>{minutes}</span>
        <span className="opacity-40 ml-1" style={{ fontSize: 'max(10px, 10cqmin)' }}>{seconds}</span>
      </div>
      
      <div className="mt-2 font-bold uppercase tracking-[0.3em]  opacity-60" style={{ color: 'var(--theme-main)', fontSize: 'max(8px, 6cqmin)' }}>
        {date}
      </div>

      {/* Analog style decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-[var(--theme-main)] rounded-full" style={{ width: '80cqmin', height: '80cqmin' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-[var(--theme-main)]/50 rounded-full" style={{ width: '60cqmin', height: '60cqmin' }} />
      </div>
    </div>
  );
};
