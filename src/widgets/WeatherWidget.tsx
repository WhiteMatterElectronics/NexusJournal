import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, MapPin, ExternalLink } from 'lucide-react';
import { WidgetProps } from '../types/widgets';
import { cn } from '../lib/utils';

export const WeatherWidget: React.FC<WidgetProps> = ({ instanceId, mainColor, isDarkMode, globalTheme }) => {
  const isGlassy = globalTheme === 'glassy';
  
  const openApp = () => {
    window.dispatchEvent(new CustomEvent('hw_os_open_app', { 
      detail: { appId: 'weather', morphFromId: instanceId } 
    }));
  };

  return (
    <div className={cn(
      "w-full h-full flex flex-col p-4 group/widget relative overflow-hidden",
      isGlassy ? "bg-white/5 backdrop-blur-md" : "bg-hw-blue/5"
    )}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-hw-blue opacity-60" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-hw-blue">Bucharest</span>
        </div>
        <button 
          onClick={openApp}
          className="p-1 hover:bg-hw-blue/20 rounded opacity-0 group-hover/widget:opacity-100 transition-opacity"
        >
          <ExternalLink size={10} className="text-hw-blue" />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-4">
        <div className="relative">
          <Sun className="w-10 h-10 text-yellow-400 animate-pulse" />
          <Cloud className="w-6 h-6 text-hw-blue/40 absolute -bottom-1 -right-1" />
        </div>
        <div className="flex flex-col">
          <div className="text-3xl font-bold tracking-tighter flex items-start">
            22
            <span className="text-sm mt-1">°C</span>
          </div>
          <span className="text-[8px] uppercase font-bold opacity-60 tracking-widest">Partly Cloudy</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hw-blue/10 pt-3">
        {['MON', 'TUE', 'WED'].map((day, i) => (
          <div key={day} className="flex flex-col items-center gap-1">
            <span className="text-[7px] opacity-40 font-bold">{day}</span>
            {i === 1 ? <CloudRain size={10} className="text-blue-400" /> : <Sun size={10} className="text-yellow-400/60" />}
            <span className="text-[8px] font-bold">{24 - i}°</span>
          </div>
        ))}
      </div>

      {/* Morphing Background Effect */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-hw-blue/5 rounded-full blur-3xl group-hover/widget:bg-hw-blue/10 transition-all duration-500" />
    </div>
  );
};
