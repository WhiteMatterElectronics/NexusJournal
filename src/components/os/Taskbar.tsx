import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Power, Settings, BookOpen, Zap, Terminal, Database, Radio, FileCode, Lock, X, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings, defaultGranular, ThemeMode, GranularColors, TimeConfig } from '../../contexts/SettingsContext';
import { cn, getContrastColor, adjustColor } from '../../lib/utils';
import { AppView } from '../../types';

import { APPS } from '../../constants';

interface TaskbarProps {
  windows: any[];
  activeWindowId: string | null;
  onWindowClick: (instanceId: string) => void;
  onStartApp: (id: AppView) => void;
  onShutdown: () => void;
  onCloseWindow: (instanceId: string) => void;
  isOverflowing?: boolean;
  onToggleDash?: () => void;
  taskbarStyle?: 'fixed' | 'panel';
  globalTheme?: 'retro' | 'glassy';
  mainColor?: string;
  isDarkMode?: boolean;
  shouldHide?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  animationSpeed?: number;
  onContextMenu?: (e: React.MouseEvent, type: 'taskbar' | 'dash') => void;
  timeConfig?: TimeConfig;
}

export const Taskbar: React.FC<TaskbarProps> = ({
  windows,
  activeWindowId,
  onWindowClick,
  onStartApp,
  onShutdown,
  onCloseWindow,
  isOverflowing,
  onToggleDash,
  taskbarStyle = 'fixed',
  globalTheme = 'retro',
  mainColor = '#00f2ff',
  isDarkMode = true,
  shouldHide = false,
  onHoverChange,
  animationSpeed = 0.3,
  onContextMenu,
  timeConfig = { source: 'auto', manualOffset: 0, showSeconds: true, is24Hour: true }
}) => {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<{ left: number, width: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const taskbarRef = useRef<HTMLDivElement>(null);
  const startMenuRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isStartOpen &&
        startMenuRef.current &&
        !startMenuRef.current.contains(event.target as Node) &&
        startButtonRef.current &&
        !startButtonRef.current.contains(event.target as Node)
      ) {
        setIsStartOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStartOpen]);

  const contrastColor = getContrastColor(mainColor);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (timeConfig.manualOffset !== 0) {
        now.setMinutes(now.getMinutes() + timeConfig.manualOffset);
      }
      setTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeConfig.manualOffset]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour12: !timeConfig.is24Hour,
      hour: '2-digit',
      minute: '2-digit',
      second: timeConfig.showSeconds ? '2-digit' : undefined
    });
  };

  const handleMouseEnter = (appId: string, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const taskbarRect = taskbarRef.current?.getBoundingClientRect();
    
    // Calculate relative left position within the taskbar
    const left = taskbarRect ? rect.left - taskbarRect.left : rect.left;
    setHoverRect({ left, width: rect.width });
    setHoveredAppId(appId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredAppId(null);
    }, 150);
  };

  const groupedWindows = APPS.map(app => {
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
            ref={startMenuRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute bottom-12 left-0 w-64 bg-hw-black border border-hw-border shadow-[0_0_30px_rgba(0,242,255,0.15)] z-[9999] flex flex-col origin-bottom-left",
              globalTheme === 'glassy' ? "rounded-2xl" : "rounded-tr-sm"
            )}
            style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
          >
            <div className="p-4 border-b border-hw-border bg-hw-blue/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-hw-blue/10 border border-hw-border flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-hw-blue" />
                </div>
                <div>
                  <h1 className="font-black text-sm tracking-tighter leading-none text-hw-blue">NEXUS_JOURNAL</h1>
                  <span className="text-[8px] text-hw-blue/40 uppercase tracking-widest">v1.0.0-arch</span>
                </div>
              </div>
            </div>
            
            <div className="p-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[400px]">
              {APPS.map((app) => (
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

            <div className="mt-auto p-2 border-t border-hw-border">
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

      {/* Reveal Arrow */}
      <AnimatePresence>
        {shouldHide && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.4, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none"
          >
            <ChevronUp className="w-4 h-4 text-hw-blue" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Zone for intellihide */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-12 z-[9998]"
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
      />

      {/* Taskbar */}
      <motion.div 
        ref={taskbarRef}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, 'taskbar');
          }
        }}
        animate={{ y: shouldHide ? 100 : 0 }}
        transition={{ duration: animationSpeed, ease: "easeInOut" }}
        className={cn(
          "absolute flex items-center px-2 z-[9999] select-none",
          taskbarStyle === 'panel' 
            ? "bottom-1 left-1/2 -translate-x-1/2 h-14 bg-hw-black/60 border border-hw-border rounded-2xl shadow-2xl px-4 min-w-[300px] max-w-[90vw]" 
            : "bottom-0 left-0 right-0 h-12 bg-hw-black border-t border-hw-border"
        )}
        style={{ backdropFilter: 'var(--theme-backdrop-filter)', borderColor: 'var(--theme-border-color)', color: 'var(--theme-text)' }}
      >
        <button
          ref={startButtonRef}
          onClick={() => {
            if (taskbarStyle === 'panel' && onToggleDash) {
              onToggleDash();
            } else {
              setIsStartOpen(!isStartOpen);
            }
          }}
          onContextMenu={(e) => {
            if (onContextMenu) {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu(e, 'dash');
            }
          }}
          className={cn(
            "h-8 px-3 flex items-center justify-center gap-2 border transition-all",
            (taskbarStyle === 'panel' || globalTheme === 'glassy') ? "rounded-xl" : "rounded-none",
            isStartOpen ? "bg-hw-blue/20 border-hw-blue" : "bg-transparent border-transparent hover:bg-hw-blue/10 hover:border-hw-border"
          )}
          style={{ 
            backgroundColor: isStartOpen ? mainColor : undefined,
            borderColor: isStartOpen ? mainColor : undefined,
            color: isStartOpen ? contrastColor : mainColor
          }}
        >
          <Cpu className="w-4 h-4 text-hw-blue" />
          <span className="text-[10px] font-bold text-hw-blue uppercase tracking-widest">
            {taskbarStyle === 'panel' ? 'DASH' : 'START'}
          </span>
        </button>

        {isOverflowing && taskbarStyle === 'fixed' && (
          <button
            onClick={onToggleDash}
            className="h-8 px-3 flex items-center justify-center gap-2 border border-hw-border bg-hw-blue/5 hover:bg-hw-blue/20 hover:border-hw-blue transition-all ml-1 group"
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
                    "h-8 px-3 flex items-center gap-2 border min-w-[120px] max-w-[200px] transition-all truncate",
                    (taskbarStyle === 'panel' || globalTheme === 'glassy') ? "rounded-xl" : "rounded-none",
                    isActiveGroup
                      ? ""
                      : "bg-hw-blue/5 border-hw-border text-hw-blue/60 hover:bg-hw-blue/10 hover:text-hw-blue"
                  )}
                  style={{
                    backgroundColor: isActiveGroup ? mainColor : undefined,
                    borderColor: isActiveGroup ? mainColor : undefined,
                    color: isActiveGroup ? contrastColor : mainColor
                  }}
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
            {formatTime(time)}
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
              style={{ left: hoverRect.left + hoverRect.width / 2 }}
              className={cn(
                "absolute bottom-full pb-2 z-[10000] -translate-x-1/2",
                taskbarStyle === 'panel' ? "mb-1" : ""
              )}
              onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                className="bg-hw-black border border-hw-border shadow-[0_0_15px_rgba(0,242,255,0.2)] rounded-sm py-1 min-w-[160px]"
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
      </motion.div>
    </>
  );
};
