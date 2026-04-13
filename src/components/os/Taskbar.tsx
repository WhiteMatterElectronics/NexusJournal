import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Power, Settings, BookOpen, Zap, Terminal, Database, Radio, FileCode, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { AppView } from '../../types';

interface TaskbarProps {
  windows: any[];
  activeWindowId: string | null;
  onWindowClick: (instanceId: string) => void;
  onStartApp: (id: AppView) => void;
  onShutdown: () => void;
  onCloseWindow: (instanceId: string) => void;
  isOverflowing?: boolean;
  onToggleDash?: () => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({
  windows,
  activeWindowId,
  onWindowClick,
  onStartApp,
  onShutdown,
  onCloseWindow,
  isOverflowing,
  onToggleDash
}) => {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<{ left: number, width: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseEnter = (appId: string, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverRect({ left: rect.left, width: rect.width });
    setHoveredAppId(appId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredAppId(null);
    }, 150);
  };

  const apps = [
    { id: 'console', icon: Terminal, label: 'SERIAL_CONSOLE' },
    { id: 'eeprom', icon: Database, label: 'EEPROM_DUMPER' },
    { id: 'rfid', icon: Radio, label: 'RFID_TOOL' },
    { id: 'binary', icon: FileCode, label: 'BINARY_ANALYSIS' },
    { id: 'cyphonator', icon: Lock, label: 'CYPHONATOR' },
    { id: 'tutorials', icon: BookOpen, label: 'KNOWLEDGE_BASE' },
    { id: 'flasher', icon: Zap, label: 'FLASH_MODULE' },
    { id: 'notes', icon: FileCode, label: 'DATA_SLABS' },
    { id: 'admin', icon: Settings, label: 'SYS_CONFIG' },
    { id: 'settings', icon: Settings, label: 'SETTINGS' },
  ];

  const groupedWindows = apps.map(app => {
    return {
      ...app,
      instances: windows.filter(w => w.appId === app.id)
    };
  }).filter(g => g.instances.length > 0);

  return (
    <>
      {/* Start Menu */}
      <AnimatePresence>
        {isStartOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-12 left-0 w-64 bg-hw-black border border-hw-blue/30 shadow-[0_0_30px_rgba(0,242,255,0.15)] rounded-tr-sm z-[9999] flex flex-col origin-bottom-left"
            style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
          >
            <div className="p-4 border-b border-hw-blue/20 bg-hw-blue/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-hw-blue/10 border border-hw-blue/30 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-hw-blue" />
                </div>
                <div>
                  <h1 className="font-black text-sm tracking-tighter leading-none text-hw-blue">ELECTRON_OS</h1>
                  <span className="text-[8px] text-hw-blue/40 uppercase tracking-widest">v1.0.0-arch</span>
                </div>
              </div>
            </div>
            
            <div className="p-2 flex flex-col gap-1">
              {apps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    onStartApp(app.id as AppView);
                    setIsStartOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-left hover:bg-hw-blue/10 transition-colors group"
                >
                  <app.icon className="w-4 h-4 text-hw-blue/60 group-hover:text-hw-blue transition-colors" />
                  <span className="text-[10px] font-bold text-hw-blue/80 group-hover:text-hw-blue uppercase tracking-widest">{app.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto p-2 border-t border-hw-blue/20">
              <button
                onClick={() => {
                  onShutdown();
                  setIsStartOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-500/10 transition-colors group"
              >
                <Power className="w-4 h-4 text-red-500/60 group-hover:text-red-500 transition-colors" />
                <span className="text-[10px] font-bold text-red-500/80 group-hover:text-red-500 uppercase tracking-widest">SHUTDOWN (Disconnect)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Taskbar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-12 bg-hw-black border-t border-hw-blue/30 flex items-center px-2 z-[9999] select-none"
        style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
      >
        <button
          onClick={() => setIsStartOpen(!isStartOpen)}
          className={cn(
            "h-8 px-3 flex items-center justify-center gap-2 border transition-colors",
            isStartOpen ? "bg-hw-blue/20 border-hw-blue" : "bg-transparent border-transparent hover:bg-hw-blue/10 hover:border-hw-blue/30"
          )}
        >
          <Cpu className="w-4 h-4 text-hw-blue" />
          <span className="text-[10px] font-bold text-hw-blue uppercase tracking-widest">START</span>
        </button>

        {isOverflowing && (
          <button
            onClick={onToggleDash}
            className="h-8 px-3 flex items-center justify-center gap-2 border border-hw-blue/30 bg-hw-blue/5 hover:bg-hw-blue/20 hover:border-hw-blue transition-all ml-1 group"
          >
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-1 h-1 bg-hw-blue/60 group-hover:bg-hw-blue"></div>
              <div className="w-1 h-1 bg-hw-blue/60 group-hover:bg-hw-blue"></div>
              <div className="w-1 h-1 bg-hw-blue/60 group-hover:bg-hw-blue"></div>
              <div className="w-1 h-1 bg-hw-blue/60 group-hover:bg-hw-blue"></div>
            </div>
            <span className="text-[10px] font-bold text-hw-blue uppercase tracking-widest">DASH</span>
          </button>
        )}

        <div className="w-px h-6 bg-hw-blue/20 mx-2" />

        <div className="flex-1 flex items-center gap-1 overflow-x-auto custom-scrollbar px-1">
          {groupedWindows.map((group) => {
            const Icon = group.icon;
            const isActiveGroup = group.instances.some(i => activeWindowId === i.instanceId && !i.isMinimized);
            
            return (
              <div 
                key={group.id} 
                className="relative"
              >
                <button
                  onMouseEnter={(e) => handleMouseEnter(group.id, e)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => {
                    if (group.instances.length === 1) {
                      onWindowClick(group.instances[0].instanceId);
                      return;
                    }
                    const activeInst = group.instances.find(i => i.instanceId === activeWindowId);
                    if (activeInst && !activeInst.isMinimized) {
                      onWindowClick(activeInst.instanceId); // minimize current
                    } else {
                      // Find first minimized or just cycle
                      const minimized = group.instances.find(i => i.isMinimized);
                      if (minimized) {
                        onWindowClick(minimized.instanceId);
                      } else {
                        onWindowClick(group.instances[0].instanceId);
                      }
                    }
                  }}
                  className={cn(
                    "h-8 px-3 flex items-center gap-2 border min-w-[120px] max-w-[200px] transition-colors truncate",
                    isActiveGroup
                      ? "bg-hw-blue/20 border-hw-blue text-hw-blue"
                      : "bg-hw-blue/5 border-hw-blue/20 text-hw-blue/60 hover:bg-hw-blue/10 hover:text-hw-blue"
                  )}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="text-[9px] font-bold uppercase tracking-widest truncate flex-1 text-left">
                    {group.label}
                  </span>
                  {group.instances.length > 1 && (
                    <span className="bg-hw-blue/20 text-hw-blue px-1.5 py-0.5 rounded text-[8px] ml-1">
                      {group.instances.length}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="w-px h-6 bg-hw-blue/20 mx-2" />

        <div className="h-8 px-3 flex items-center justify-center border border-transparent text-hw-blue/60">
          <span className="text-[10px] font-mono">
            {time.toLocaleTimeString([], { hour12: false })}
          </span>
        </div>

        {/* Hover Menu for Instances (Rendered outside overflow container) */}
        <AnimatePresence>
          {hoveredAppId && hoverRect && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full pb-2 z-[10000]"
              style={{ left: hoverRect.left }}
              onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                className="bg-hw-black border border-hw-blue/30 shadow-[0_0_15px_rgba(0,242,255,0.2)] rounded-sm py-1 min-w-[160px]"
                style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
              >
                {groupedWindows.find(g => g.id === hoveredAppId)?.instances.map(inst => (
                  <div key={inst.instanceId} className="flex items-center justify-between px-2 py-1.5 hover:bg-hw-blue/10 group/item cursor-pointer" onClick={() => onWindowClick(inst.instanceId)}>
                    <div className="flex-1 text-left text-[10px] font-bold text-hw-blue/80 group-hover/item:text-hw-blue truncate">
                      {groupedWindows.find(g => g.id === hoveredAppId)?.label} {groupedWindows.find(g => g.id === hoveredAppId)!.instances.length > 1 ? `- ${inst.instanceNumber}` : ''}
                    </div>
                    <button
                      className="ml-2 text-red-500/50 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseWindow(inst.instanceId);
                      }}
                      title="Close Instance"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
