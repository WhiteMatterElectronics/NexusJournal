/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, useAnimation } from 'motion/react';
import { ConceptExplorer } from './components/ConceptExplorer';
import { TutorialDetail } from './components/TutorialDetail';
import { FlashModule } from './components/FlashModule';
import { SystemConfig } from './components/SystemConfig';
import { AppView, Tutorial } from './types';
import { Settings, BookOpen, Zap, Terminal, Database, Radio, FileCode, Lock, Unlock } from 'lucide-react';
import { Window } from './components/os/Window';
import { Taskbar } from './components/os/Taskbar';
import { ConsoleApp } from './components/apps/ConsoleApp';
import { EepromApp } from './components/apps/EepromApp';
import { RfidApp } from './components/apps/RfidApp';
import { BinaryApp } from './components/apps/BinaryApp';
import { CyphonatorApp } from './components/apps/CyphonatorApp';
import { SettingsApp } from './components/apps/SettingsApp';
import { NotesApp } from './components/apps/NotesApp';
import { useSettings } from './contexts/SettingsContext';
import { cn } from './lib/utils';

interface WindowState {
  instanceId: string;
  appId: AppView;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  instanceNumber: number;
}

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

function DesktopIcon({ app, pos, desktopRef, onDrop, theme, handleStartApp }: any) {
  if (!pos) return null;

  return (
    <motion.div
      layout
      drag
      dragMomentum={false}
      dragConstraints={desktopRef}
      initial={false}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      onDragEnd={(e, info) => {
        onDrop(app.id, pos.x + info.offset.x, pos.y + info.offset.y);
      }}
      onDoubleClick={() => handleStartApp(app.id as AppView)}
      className="absolute flex flex-col items-center gap-2 p-2 w-20 rounded hover:bg-hw-blue/10 transition-colors group cursor-pointer"
    >
      <div 
        className={cn(
          "w-12 h-12 flex items-center justify-center rounded transition-all shadow-[0_0_15px_rgba(0,242,255,0.1)] group-hover:shadow-[0_0_20px_rgba(0,242,255,0.3)]",
          theme.globalTheme === 'glassy' 
            ? "bg-white/5 border border-white/20 group-hover:bg-white/10 group-hover:border-white/40" 
            : "bg-hw-blue/5 border border-hw-blue/20 group-hover:bg-hw-blue/10 group-hover:border-hw-blue/50"
        )}
        style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
      >
        <app.icon className={cn(
          "w-6 h-6",
          theme.globalTheme === 'glassy' 
            ? "text-white/80 group-hover:text-white" 
            : "text-hw-blue/80 group-hover:text-hw-blue"
        )} />
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-center leading-tight drop-shadow-md",
        theme.globalTheme === 'glassy' 
          ? "text-white/80 group-hover:text-white" 
          : "text-hw-blue/80 group-hover:text-hw-blue"
      )}>
        {app.label.replace('_', ' ')}
      </span>
    </motion.div>
  );
}

export default function App() {
  const { profile, theme, updateTheme } = useSettings();
  const [isLocked, setIsLocked] = useState(true);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState('');

  const [windows, setWindows] = useState<WindowState[]>([
    { instanceId: 'console-1', appId: 'console', isOpen: true, isMinimized: false, isMaximized: true, zIndex: 1, instanceNumber: 1 }
  ]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>('console-1');
  const [highestZIndex, setHighestZIndex] = useState(1);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, show: boolean} | null>(null);

  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoFlashFirmwareId, setAutoFlashFirmwareId] = useState<string | null>(null);
  const [showDash, setShowDash] = useState(false);
  const [desktopSize, setDesktopSize] = useState({ width: window.innerWidth, height: window.innerHeight - 48 });
  const initialLoadDone = useRef(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!desktopRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = setTimeout(() => {
          setDesktopSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }, 50);
      }
    });

    observer.observe(desktopRef.current);
    
    setDesktopSize({
      width: desktopRef.current.clientWidth,
      height: desktopRef.current.clientHeight
    });

    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  const cellW = 120;
  const cellH = 130;
  const offsetX = 24;
  const offsetY = 24;
  
  const maxCols = Math.max(1, Math.floor((desktopSize.width - offsetX) / cellW));
  const maxRows = Math.max(1, Math.floor((desktopSize.height - offsetY) / cellH));
  
  const visibleApps = apps.filter(app => theme.desktopIcons?.[app.id] !== false);
  const isOverflowing = visibleApps.length > maxCols * maxRows;

  // Reconcile icon grid coordinates
  useEffect(() => {
    const currentPositions = theme.iconPositions || {};
    const newPositions: Record<string, {x: number, y: number}> = {};
    const occupied = new Set<string>();
    const needsPlacement: string[] = [];
    let changed = false;

    // 1. Identify which apps need placement and which have valid grid positions
    visibleApps.forEach(app => {
      const pos = currentPositions[app.id];
      if (pos) {
        // Migration/Validation: If it looks like a pixel value (> 50), convert it to grid units
        let col = pos.x > 50 ? Math.round((pos.x - offsetX) / cellW) : pos.x;
        let row = pos.y > 50 ? Math.round((pos.y - offsetY) / cellH) : pos.y;
        
        // Ensure it's within current bounds and not overlapping
        if (col >= 0 && col < maxCols && row >= 0 && row < maxRows && !occupied.has(`${col},${row}`)) {
          occupied.add(`${col},${row}`);
          newPositions[app.id] = { x: col, y: row };
          if (pos.x !== col || pos.y !== row) changed = true;
        } else {
          needsPlacement.push(app.id);
          changed = true;
        }
      } else {
        needsPlacement.push(app.id);
        changed = true;
      }
    });

    // 2. Auto-place icons that need a home (Column-major: top-to-bottom, then left-to-right)
    if (needsPlacement.length > 0) {
      // Sort by original app order for consistent placement
      needsPlacement.sort((a, b) => apps.findIndex(x => x.id === a) - apps.findIndex(x => x.id === b));
      
      needsPlacement.forEach(appId => {
        let placed = false;
        for (let c = 0; c < maxCols && !placed; c++) {
          for (let r = 0; r < maxRows && !placed; r++) {
            if (!occupied.has(`${c},${r}`)) {
              newPositions[appId] = { x: c, y: r };
              occupied.add(`${c},${r}`);
              placed = true;
            }
          }
        }
        if (!placed) {
          newPositions[appId] = { x: -1, y: -1 }; // Offscreen sentinel
        }
      });
    }

    // 3. Clean up positions for apps that are no longer visible
    Object.keys(newPositions).forEach(appId => {
      if (!visibleApps.find(a => a.id === appId)) {
        delete newPositions[appId];
        changed = true;
      }
    });

    // Only update if something actually changed to avoid render loops
    if (changed) {
      updateTheme({ iconPositions: newPositions });
    }
  }, [maxCols, maxRows, visibleApps.length, theme.desktopIcons, updateTheme]);

  const handleIconDrop = useCallback((appId: string, dropX: number, dropY: number) => {
    const col = Math.max(0, Math.min(Math.round((dropX - offsetX) / cellW), maxCols - 1));
    const row = Math.max(0, Math.min(Math.round((dropY - offsetY) / cellH), maxRows - 1));

    const newPositions = { ...theme.iconPositions };
    
    // Find who is CURRENTLY at this target grid location
    const displacedAppId = Object.entries(newPositions).find(
      ([id, pos]) => id !== appId && pos.x === col && pos.y === row
    )?.[0];

    if (displacedAppId) {
      // Swap: Displaced app takes the grid position of the dragged app
      const myCurrentPos = newPositions[appId];
      if (myCurrentPos) {
        newPositions[displacedAppId] = { x: myCurrentPos.x, y: myCurrentPos.y };
      }
    }

    newPositions[appId] = { x: col, y: row };
    updateTheme({ iconPositions: newPositions });
  }, [theme.iconPositions, maxCols, maxRows, updateTheme]);

  useEffect(() => {
    // We always start locked now, but if password is changed to empty while unlocked, we don't re-lock
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.passwordHash) {
      setIsLocked(false);
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(lockPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hash === profile.passwordHash) {
      setIsLocked(false);
      setLockError('');
      setLockPassword('');
    } else {
      setLockError('Incorrect password');
    }
  };

  const refreshTutorials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tutorials');
      const data = await res.json();
      setTutorials(data);
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        const intro = data.find((t: Tutorial) => t.id === 'intro-electron-assistant');
        if (intro) {
          setSelectedTutorial(intro);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tutorials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTutorials();
  }, []);

  const handleStartApp = (id: AppView) => {
    setWindows(prev => {
      const existing = prev.filter(w => w.appId === id);
      
      // Singletons
      if (id === 'console' || id === 'settings' || id === 'admin' || id === 'flasher') {
        if (existing.length > 0) {
          setHighestZIndex(z => z + 1);
          setActiveWindowId(existing[0].instanceId);
          return prev.map(w => w.appId === id ? { ...w, isOpen: true, isMinimized: false, zIndex: highestZIndex + 1 } : w);
        }
      }

      if (existing.length >= 4) {
        return prev;
      }

      const usedNumbers = existing.map(w => w.instanceNumber);
      let instanceNumber = 1;
      while (usedNumbers.includes(instanceNumber)) {
        instanceNumber++;
      }

      const instanceId = `${id}-${Date.now()}`;
      setHighestZIndex(z => z + 1);
      setActiveWindowId(instanceId);
      
      return [...prev, { 
        instanceId, 
        appId: id, 
        isOpen: true, 
        isMinimized: false, 
        isMaximized: false, 
        zIndex: highestZIndex + 1,
        instanceNumber
      }];
    });
    
    if (id !== 'flasher') {
      setAutoFlashFirmwareId(null);
    }
  };

  const handleWindowClick = (instanceId: string) => {
    setWindows(prev => {
      const win = prev.find(w => w.instanceId === instanceId);
      if (!win) return prev;
      
      if (win.isMinimized) {
        return prev.map(w => w.instanceId === instanceId ? { ...w, isMinimized: false, zIndex: highestZIndex + 1 } : w);
      } else if (activeWindowId === instanceId) {
        return prev.map(w => w.instanceId === instanceId ? { ...w, isMinimized: true } : w);
      } else {
        return prev.map(w => w.instanceId === instanceId ? { ...w, zIndex: highestZIndex + 1 } : w);
      }
    });
    
    if (activeWindowId !== instanceId) {
      setHighestZIndex(z => z + 1);
      setActiveWindowId(instanceId);
    } else {
      setActiveWindowId(null);
    }
  };

  const handleWindowAction = (instanceId: string, action: 'close' | 'minimize' | 'maximize' | 'focus') => {
    setWindows(prev => {
      if (action === 'close') {
        return prev.filter(w => w.instanceId !== instanceId);
      }
      return prev.map(w => {
        if (w.instanceId !== instanceId) return w;
        switch (action) {
          case 'minimize': return { ...w, isMinimized: true };
          case 'maximize': return { ...w, isMaximized: !w.isMaximized };
          case 'focus': return { ...w, zIndex: highestZIndex + 1 };
          default: return w;
        }
      });
    });

    if (action === 'focus' || action === 'maximize') {
      setHighestZIndex(z => z + 1);
      setActiveWindowId(instanceId);
    } else if (action === 'close' || action === 'minimize') {
      if (activeWindowId === instanceId) setActiveWindowId(null);
    }
  };

  const handleFlashFirmware = (firmwareId: string) => {
    setAutoFlashFirmwareId(firmwareId);
    handleStartApp('flasher');
  };

  const handleShutdown = () => {
    window.dispatchEvent(new CustomEvent('electron-os-shutdown'));
    setWindows(prev => prev.map(w => ({ ...w, isOpen: false })));
  };

  const renderAppContent = (id: AppView) => {
    switch (id) {
      case 'console':
        return <ConsoleApp />;
      case 'eeprom':
        return <EepromApp />;
      case 'rfid':
        return <RfidApp />;
      case 'binary':
        return <BinaryApp />;
      case 'cyphonator':
        return <CyphonatorApp />;
      case 'notes':
        return <NotesApp />;
      case 'tutorials':
        return (
          <div className="h-full overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-[10px] uppercase tracking-widest text-hw-blue/40">Loading_Database...</span>
              </div>
            ) : selectedTutorial ? (
              <TutorialDetail 
                tutorial={selectedTutorial} 
                onBack={() => setSelectedTutorial(null)} 
                onFlashFirmware={handleFlashFirmware}
              />
            ) : (
              <ConceptExplorer 
                tutorials={tutorials} 
                onSelect={setSelectedTutorial} 
              />
            )}
          </div>
        );
      case 'flasher':
        return (
          <div className="h-full overflow-y-auto p-6 custom-scrollbar">
            <FlashModule autoFlashFirmwareId={autoFlashFirmwareId} onFlashComplete={() => handleStartApp('console')} />
          </div>
        );
      case 'admin':
        return (
          <div className="h-full overflow-y-auto p-6 custom-scrollbar">
            <SystemConfig 
              tutorials={tutorials} 
              refreshTutorials={refreshTutorials} 
              loading={loading} 
            />
          </div>
        );
      case 'settings':
        return <SettingsApp />;
      default:
        return null;
    }
  };

  if (isLocked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black relative font-sans text-hw-blue">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'var(--theme-bg-image)', backgroundSize: 'var(--theme-bg-size)', backgroundPosition: 'center' }} />
        <div className="hw-panel p-8 max-w-sm w-full z-10 flex flex-col items-center" style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}>
          <div className="w-16 h-16 bg-hw-blue/10 border border-hw-blue/30 flex items-center justify-center mb-6 rounded-full">
            <Lock className="w-8 h-8 text-hw-blue" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase text-hw-blue mb-2">{profile.name}</h1>
          <p className="text-[10px] text-hw-blue/60 uppercase tracking-widest mb-8 text-center">
            {profile.passwordHash ? "System Locked. Please enter your credentials to continue." : "System Locked. Press UNLOCK to continue."}
          </p>
          
          <form onSubmit={handleUnlock} className="w-full space-y-4">
            {profile.passwordHash && (
              <div>
                <input
                  type="password"
                  value={lockPassword}
                  onChange={e => setLockPassword(e.target.value)}
                  placeholder="PASSWORD"
                  className="w-full bg-hw-blue/5 border border-hw-blue/20 p-3 text-sm text-hw-blue outline-none focus:border-hw-blue text-center tracking-widest"
                  autoFocus
                />
              </div>
            )}
            {lockError && (
              <div className="text-[10px] text-red-500 uppercase tracking-widest text-center">
                {lockError}
              </div>
            )}
            <button type="submit" className="w-full hw-button flex items-center justify-center gap-2 py-3" autoFocus={!profile.passwordHash}>
              <Unlock className="w-4 h-4" /> UNLOCK
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen w-screen overflow-hidden bg-transparent relative font-sans text-hw-blue"
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, show: true });
      }}
      onClick={() => setContextMenu(null)}
    >
      {/* Custom Context Menu */}
      {contextMenu?.show && (
        <div 
          className="absolute z-[99999] bg-hw-black border border-hw-blue/30 shadow-[0_0_15px_rgba(0,242,255,0.2)] rounded-sm py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y, backdropFilter: 'var(--theme-backdrop-filter)' }}
        >
          <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-hw-blue/50 border-b border-hw-blue/10 mb-1">System Menu</div>
          {apps.map(app => (
            <button
              key={`ctx-${app.id}`}
              onClick={() => handleStartApp(app.id as AppView)}
              className="w-full text-left px-3 py-1.5 text-[11px] font-bold hover:bg-hw-blue/10 flex items-center gap-2"
            >
              <app.icon size={12} className="text-hw-blue/70" />
              {app.label}
            </button>
          ))}
        </div>
      )}

      {/* Desktop Background / Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" />
      
      {/* Desktop Icons */}
      <div className="absolute inset-0 bottom-12 z-0" ref={desktopRef}>
        {apps.map((app) => {
          if (!theme.desktopIcons?.[app.id]) return null;
          
          const gridPos = theme.iconPositions?.[app.id];
          if (!gridPos || gridPos.x === -1) return null;
          
          const pos = {
            x: offsetX + gridPos.x * cellW,
            y: offsetY + gridPos.y * cellH
          };
          
          return (
            <DesktopIcon
              key={`desktop-icon-${app.id}`}
              app={app}
              pos={pos}
              desktopRef={desktopRef}
              onDrop={handleIconDrop}
              theme={theme}
              handleStartApp={handleStartApp}
            />
          );
        })}
      </div>

      {/* Dash Panel (Ubuntu-style overflow) */}
      {showDash && (
        <div className="absolute inset-0 bottom-12 z-[50] bg-hw-black/80 backdrop-blur-xl flex flex-col items-center justify-start pt-24 overflow-y-auto pb-24 border-t border-hw-blue/20">
          <button 
            onClick={() => setShowDash(false)}
            className="absolute top-8 right-8 text-hw-blue/50 hover:text-hw-blue transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <div className="text-hw-blue text-2xl font-bold mb-12 tracking-[0.2em] uppercase opacity-80">Applications</div>
          
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-8 gap-y-12 p-8 max-w-6xl w-full">
            {apps.filter(app => theme.desktopIcons?.[app.id] !== false).map(app => (
              <div
                key={`dash-${app.id}`}
                onClick={() => {
                  handleStartApp(app.id as AppView);
                  setShowDash(false);
                }}
                className="flex flex-col items-center gap-4 cursor-pointer group"
              >
                <div className="w-20 h-20 rounded-2xl bg-hw-blue/5 border border-hw-blue/10 flex items-center justify-center group-hover:bg-hw-blue/15 group-hover:border-hw-blue/30 group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_rgba(0,242,255,0.1)]">
                  <app.icon size={36} className="text-hw-blue/70 group-hover:text-hw-blue transition-colors" />
                </div>
                <span className="text-[10px] font-bold text-center text-hw-blue/70 group-hover:text-hw-blue uppercase tracking-wider drop-shadow-md">
                  {app.label.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Windows Area */}
      <div className="absolute inset-0 bottom-12 overflow-hidden pointer-events-none z-10">
        {windows.map(win => {
          const appInfo = apps.find(a => a.id === win.appId);
          if (!appInfo) return null;
          
          const isSingleton = win.appId === 'console' || win.appId === 'settings' || win.appId === 'admin' || win.appId === 'flasher';
          const title = isSingleton ? appInfo.label : `${appInfo.label} - ${win.instanceNumber}`;

          return (
            <div key={win.instanceId} className="pointer-events-auto">
              <Window
                id={win.instanceId}
                title={title}
                icon={appInfo.icon}
                isOpen={win.isOpen}
                isMinimized={win.isMinimized}
                isMaximized={win.isMaximized}
                isActive={activeWindowId === win.instanceId}
                zIndex={win.zIndex}
                onClose={() => handleWindowAction(win.instanceId, 'close')}
                onMinimize={() => handleWindowAction(win.instanceId, 'minimize')}
                onMaximize={() => handleWindowAction(win.instanceId, 'maximize')}
                onFocus={() => handleWindowAction(win.instanceId, 'focus')}
                defaultSize={{ width: 900, height: 600 }}
                defaultPosition={{ x: 50 + (win.zIndex * 20) % 200, y: 50 + (win.zIndex * 20) % 200 }}
              >
                {renderAppContent(win.appId)}
              </Window>
            </div>
          );
        })}
      </div>

      {/* Taskbar */}
      <Taskbar 
        windows={windows.filter(w => w.isOpen)}
        activeWindowId={activeWindowId}
        onWindowClick={handleWindowClick}
        onStartApp={handleStartApp}
        onShutdown={handleShutdown}
        onCloseWindow={(instanceId) => handleWindowAction(instanceId, 'close')}
        isOverflowing={isOverflowing}
        onToggleDash={() => setShowDash(!showDash)}
      />
    </div>
  );
}


