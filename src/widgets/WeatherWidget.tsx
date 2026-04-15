import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, MapPin, ExternalLink } from 'lucide-react';
import { WidgetProps } from '../types/widgets';
import { cn } from '../lib/utils';

export const WeatherWidget: React.FC<WidgetProps> = ({ instanceId, mainColor, isDarkMode, globalTheme }) => {
  const isGlassy = globalTheme === 'glassy';
  
  return (
    <div className={cn(
      "w-full h-full flex flex-col group/widget relative overflow-hidden"
    )} style={{ padding: 'max(8px, 5cqmin)' }}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="text-hw-blue opacity-60" style={{ width: 'max(10px, 8cqmin)', height: 'max(10px, 8cqmin)' }} />
          <span className="font-bold uppercase tracking-widest text-hw-blue" style={{ fontSize: 'max(6px, 6cqmin)' }}>Bucharest</span>
        </div>
      </div>

      <div className="flex-1 flex items-center gap-4">
        <div className="relative">
          <Sun className="text-yellow-400 animate-pulse" style={{ width: 'max(24px, 20cqmin)', height: 'max(24px, 20cqmin)' }} />
          <Cloud className="text-hw-blue/40 absolute -bottom-1 -right-1" style={{ width: 'max(14px, 12cqmin)', height: 'max(14px, 12cqmin)' }} />
        </div>
        <div className="flex flex-col">
          <div className="font-bold tracking-tighter flex items-start" style={{ fontSize: 'max(16px, 20cqmin)' }}>
            22
            <span className="mt-1" style={{ fontSize: 'max(8px, 8cqmin)' }}>°C</span>
          </div>
          <span className="uppercase font-bold opacity-60 tracking-widest" style={{ fontSize: 'max(5px, 5cqmin)' }}>Partly Cloudy</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-hw-blue/10 pt-2">
        {['MON', 'TUE', 'WED'].map((day, i) => (
          <div key={day} className="flex flex-col items-center gap-1">
            <span className="opacity-40 font-bold" style={{ fontSize: 'max(4px, 4cqmin)' }}>{day}</span>
            {i === 1 ? <CloudRain className="text-blue-400" style={{ width: 'max(6px, 6cqmin)', height: 'max(6px, 6cqmin)' }} /> : <Sun className="text-yellow-400/60" style={{ width: 'max(6px, 6cqmin)', height: 'max(6px, 6cqmin)' }} />}
            <span className="font-bold" style={{ fontSize: 'max(5px, 5cqmin)' }}>{24 - i}°</span>
          </div>
        ))}
      </div>

      {/* Morphing Background Effect */}
      <div className="absolute -bottom-10 -right-10 bg-hw-blue/5 rounded-full blur-3xl group-hover/widget:bg-hw-blue/10 transition-all duration-500" style={{ width: 'max(64px, 50cqmin)', height: 'max(64px, 50cqmin)' }} />
    </div>
  );
};
