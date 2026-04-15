/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { ConceptExplorer } from './components/ConceptExplorer';
import { TutorialDetail } from './components/TutorialDetail';
import { FlashModule } from './components/FlashModule';
import { SystemConfig } from './components/SystemConfig';
import { AppView, Tutorial } from './types';
import { Settings, BookOpen, Zap, Terminal, Database, Radio, FileCode, Lock, Unlock, Activity, Cloud, ChevronRight, Layout, Plus } from 'lucide-react';
import { Window } from './components/os/Window';
import { Taskbar } from './components/os/Taskbar';
import { ConsoleApp } from './components/apps/ConsoleApp';
import { EepromApp } from './components/apps/EepromApp';
import { RfidApp } from './components/apps/RfidApp';
import { BinaryApp } from './components/apps/BinaryApp';
import { CyphonatorApp } from './components/apps/CyphonatorApp';
import { SettingsApp } from './components/apps/SettingsApp';
import { NotesApp } from './components/apps/NotesApp';
import { SystemMonitorApp } from './components/apps/SystemMonitorApp';
import { WeatherApp } from './components/apps/WeatherApp';
import { ClockApp } from './components/apps/ClockApp';
import { BluetoothApp } from './components/apps/BluetoothApp';
import { WidgetContainer } from './components/os/WidgetContainer';
import { useSettings } from './contexts/SettingsContext';
import { cn, getContrastColor, adjustColor } from './lib/utils';
import { APPS } from './constants';
import { ActiveWidget } from './types/widgets';
import { WIDGET_REGISTRY } from './widgets/registry';

interface WindowState {
  instanceId: string;
  appId: AppView;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  instanceNumber: number;
  morphFromId?: string; // ID of the widget it morphed from
  initialProps?: any;
}

const REFERENCE_COLS = 15;
const REFERENCE_ROWS = 7;
const MIN_CELL_WIDTH = 100;
const MIN_CELL_HEIGHT = 100;

function DesktopIcon({ 
  app, 
  gridPos, 
  theme, 
  handleStartApp, 
  desktopRef, 
  gridSize,
  onMouseDown,
  isDragging,
  currentMousePos,
  dragOffset
}: any) {
  if (!gridPos) return null;

  const mainColor = theme.mainColor || '#00f2ff';
  const isGlassy = theme.globalTheme === 'glassy';
  const isDark = theme.isDarkMode;
  const contrastColor = getContrastColor(mainColor);

  const labelText = app.label.replace('_', ' ').split(' ').slice(0, 2).join(' ');

  const desktopRect = desktopRef.current?.getBoundingClientRect();
  
  const style: React.CSSProperties = isDragging ? {
    position: 'absolute',
    left: currentMousePos.x - dragOffset.x - (desktopRect?.left || 0),
    top: currentMousePos.y - dragOffset.y - (desktopRect?.top || 0),
    zIndex: 100,
    cursor: 'grabbing',
    width: `${(1 / gridSize.cols) * 100}%`,
    height: `${(1 / gridSize.rows) * 100}%`,
  } : {
    position: 'absolute',
    left: `${(gridPos.x / gridSize.cols) * 100}%`,
    top: `${(gridPos.y / gridSize.rows) * 100}%`,
    width: `${100 / gridSize.cols}%`,
    height: `${100 / gridSize.rows}%`,
  };

  return (
    <motion.div
      transition={{ 
        duration: 0.15,
        ease: "easeOut"
      }}
      onMouseDown={(e) => onMouseDown(e, { id: app.id, pos: gridPos })}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
        onMouseDown(mouseEvent as any, { id: app.id, pos: gridPos });
      }}
      onDoubleClick={() => handleStartApp(app.id as AppView, `desktop-${app.id}`)}
      style={style}
      className={cn(
        "flex flex-col items-center justify-center group cursor-grab",
        isDragging && "scale-110 z-50"
      )}
    >
      <div 
        className={cn(
          "relative flex items-center justify-center p-2.5 transition-all duration-300 shrink-0",
          isGlassy 
            ? "bg-white/10 border border-white/20 group-hover:bg-white/20 group-hover:border-white/40 rounded-2xl" 
            : "bg-black/40 border-2 border-hw-blue/40 group-hover:bg-black/60 group-hover:border-hw-blue rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.5)]",
          isDragging && (isGlassy ? "bg-white/30" : "bg-black/80 border-hw-blue")
        )}
        style={{ 
          width: 'min(52px, 60%)',
          height: 'min(52px, 60%)',
          backdropFilter: isGlassy ? 'blur(10px)' : 'none',
          boxShadow: isDragging ? `0 0 30px ${mainColor}66` : isGlassy ? `0 0 15px ${mainColor}22` : 'none',
          borderColor: isGlassy ? undefined : isDragging ? mainColor : `${mainColor}66`
        }}
      >
        <app.icon 
          className={cn("w-1/2 h-1/2 transition-colors", !isGlassy && "drop-shadow-none")} 
          style={{ 
            color: isGlassy ? (isDark ? mainColor : adjustColor(mainColor, -40)) : mainColor,
            filter: isGlassy ? `drop-shadow(0 0 8px ${mainColor}44)` : 'none'
          }}
        />

        {/* Text Label - Absolute positioned to match GridTest style */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[140%] flex justify-center pointer-events-none">
          <div 
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider text-center leading-tight drop-shadow-md line-clamp-2 px-2 py-1 rounded-md transition-all duration-300 flex items-center justify-center min-h-[28px]",
              isDragging ? "" : "bg-black/40 backdrop-blur-md group-hover:bg-black/60"
            )}
            style={{ 
              maxWidth: '100%',
              color: isDragging ? contrastColor : mainColor,
              textShadow: isDark ? `0 0 10px ${mainColor}66` : '0 2px 4px rgba(0,0,0,0.5)',
              backgroundColor: isDragging ? mainColor : undefined,
              border: isDragging ? `1px solid ${contrastColor}33` : 'none'
            }}
          >
            {labelText}
          </div>
        </div>
      </div>
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
  const [isDraggingIcon, setIsDraggingIcon] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });
  const [gridSize, setGridSize] = useState({ cols: REFERENCE_COLS, rows: REFERENCE_ROWS });
  const initialLoadDone = useRef(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const updateGridSize = useCallback(() => {
    // We use fixed grid dimensions to ensure perfect scaling of icons and widgets
    setGridSize({ cols: REFERENCE_COLS, rows: REFERENCE_ROWS });
  }, []);

  useEffect(() => {
    updateGridSize();
    window.addEventListener('resize', updateGridSize);
    return () => {
      window.removeEventListener('resize', updateGridSize);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [updateGridSize]);

  const isMasterMode = gridSize.cols >= REFERENCE_COLS && gridSize.rows >= REFERENCE_ROWS;
  const isOverflowing = gridSize.cols < 10 || gridSize.rows < 5;

  /**
   * COLLISION-AWARE SNAKE LOGIC
   * This function finds the Nth empty slot in a zigzag pattern, skipping occupied cells.
   */
  const getNextAvailableSnakeSlot = (reservedCoords: Set<string>, cols: number, rows: number) => {
    const availableSlots: {x: number, y: number}[] = [];
    
    // Generate the full zigzag path
    for (let c = 0; c < cols; c++) {
      const isEvenCol = c % 2 === 0;
      if (isEvenCol) {
        for (let r = 0; r < rows; r++) {
          const key = `${c},${r}`;
          if (!reservedCoords.has(key)) availableSlots.push({ x: c, y: r });
        }
      } else {
        for (let r = rows - 1; r >= 0; r--) {
          const key = `${c},${r}`;
          if (!reservedCoords.has(key)) availableSlots.push({ x: c, y: r });
        }
      }
    }
    return availableSlots;
  };

  const renderedPositionsRef = useRef<Record<string, {x: number, y: number}>>({});

  // Calculate grid positions - SNAKE FLOW LOGIC
  const renderedPositions = useMemo(() => {
    const reservedCoords = new Set<string>();
    const final: Record<string, {x: number, y: number}> = {};

    // 0. Reserve space for widgets
    theme.widgets?.forEach(widget => {
      for (let i = 0; i < widget.w; i++) {
        for (let j = 0; j < widget.h; j++) {
          reservedCoords.add(`${widget.x + i},${widget.y + j}`);
        }
      }
    });

    // 1. Place icons with valid custom positions in current grid
    APPS.forEach((app) => {
      if (theme.desktopIcons?.[app.id] === false) return;
      const saved = theme.iconPositions?.[app.id];
      if (saved && saved.x < gridSize.cols && saved.y < gridSize.rows) {
        const key = `${Math.round(saved.x)},${Math.round(saved.y)}`;
        if (!reservedCoords.has(key)) {
          final[app.id] = { x: Math.round(saved.x), y: Math.round(saved.y) };
          reservedCoords.add(key);
        }
      }
    });

    // 2. Fill remaining icons into the snake flow, skipping reserved spots
    const snakeSlots = getNextAvailableSnakeSlot(reservedCoords, gridSize.cols, gridSize.rows);
    let snakeIndex = 0;

    APPS.forEach((app) => {
      if (theme.desktopIcons?.[app.id] === false || final[app.id]) return;
      const pos = snakeSlots[snakeIndex] || { x: 0, y: 0 };
      final[app.id] = pos;
      snakeIndex++;
    });
    
    renderedPositionsRef.current = final;
    return final;
  }, [theme.iconPositions, theme.desktopIcons, gridSize, theme.widgets]);

  const handleIconDrop = useCallback((appId: string, targetCol: number, targetRow: number) => {
    const col = Math.max(0, Math.min(targetCol, gridSize.cols - 1));
    const row = Math.max(0, Math.min(targetRow, gridSize.rows - 1));

    const newPositions = { ...theme.iconPositions };
    
    const isOccupiedByWidget = theme.widgets?.some(widget => {
      return col >= widget.x && col < widget.x + widget.w &&
             row >= widget.y && row < widget.y + widget.h;
    });

    if (!isOccupiedByWidget) {
      // Find if another icon is at this position
      const targetOccupant = Object.entries(renderedPositionsRef.current).find(
        ([id, pos]) => id !== appId && pos.x === col && pos.y === row
      );

      const currentPos = renderedPositionsRef.current[appId];

      newPositions[appId] = { x: col, y: row };

      if (targetOccupant && currentPos) {
        // Swap their positions
        newPositions[targetOccupant[0]] = { x: currentPos.x, y: currentPos.y };
      }

      updateTheme({ iconPositions: newPositions });
    }
  }, [theme.iconPositions, theme.widgets, updateTheme, gridSize]);

  const handleUpdateWidget = useCallback((instanceId: string, updates: Partial<ActiveWidget>) => {
    updateTheme(prev => ({
      widgets: prev.widgets.map(w => w.instanceId === instanceId ? { ...w, ...updates } : w)
    }));
  }, [updateTheme]);

  const handleRemoveWidget = useCallback((instanceId: string) => {
    updateTheme(prev => ({
      widgets: prev.widgets.filter(w => w.instanceId !== instanceId)
    }));
  }, [updateTheme]);

  const handleMouseDown = (e: React.MouseEvent, iconData: { id: string, pos: {x: number, y: number} }) => {
    // Prevent text selection during drag
    e.preventDefault();
    
    // If it's a double click or more, don't start a drag
    if (e.detail > 1) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setDraggingId(null);
      setIsDraggingIcon(false);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const startPos = { x: e.clientX, y: e.clientY };

    // Clear any existing timer
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    // Start a timer for long press (200ms)
    longPressTimer.current = setTimeout(() => {
      setDragOffset(offset);
      setDraggingId(iconData.id);
      setDragStartPos(startPos);
      setCurrentMousePos(startPos);
      longPressTimer.current = null;
    }, 200);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    if (draggingId) {
      setCurrentMousePos({ x: clientX, y: clientY });
      
      // Only show grid if we've moved more than a small threshold (prevents grid flashing on double click)
      if (!isDraggingIcon) {
        const dist = Math.sqrt(Math.pow(clientX - dragStartPos.x, 2) + Math.pow(clientY - dragStartPos.y, 2));
        if (dist > 10) {
          setIsDraggingIcon(true);
        }
      }
    } else if (longPressTimer.current) {
      // If we move too much before the timer fires, cancel it
      // This allows normal clicks to work without accidentally triggering drag
      const dist = Math.sqrt(Math.pow(clientX - dragStartPos.x, 2) + Math.pow(clientY - dragStartPos.y, 2));
      if (dist > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, [draggingId, isDraggingIcon, dragStartPos]);

  const handleMouseUp = useCallback((e: MouseEvent | TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!draggingId || !desktopRef.current) {
      setDraggingId(null);
      setIsDraggingIcon(false);
      return;
    }

    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

    const desktopRect = desktopRef.current.getBoundingClientRect();
    const relativeX = clientX - desktopRect.left;
    const relativeY = clientY - desktopRect.top;

    const cellW = desktopRect.width / gridSize.cols;
    const cellH = desktopRect.height / gridSize.rows;

    let newX = Math.floor(relativeX / cellW);
    let newY = Math.floor(relativeY / cellH);

    if (draggingId.startsWith('widget-')) {
      handleUpdateWidget(draggingId, { x: newX, y: newY });
    } else {
      handleIconDrop(draggingId, newX, newY);
    }
    
    setDraggingId(null);
    setIsDraggingIcon(false);
  }, [draggingId, handleIconDrop, gridSize]);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggingId, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    // We always start locked now, but if password is changed to empty while unlocked, we don't re-lock
  }, []);

  const [isTaskbarHovered, setIsTaskbarHovered] = useState(false);
  const [isTaskbarEffectivelyHovered, setIsTaskbarEffectivelyHovered] = useState(false);
  const [shouldHideTaskbar, setShouldHideTaskbar] = useState(false);

  useEffect(() => {
    // Debug permissions policy
    if ((document as any).featurePolicy) {
      const allowed = (document as any).featurePolicy.allowedFeatures();
      console.log("Permissions Policy Allowed Features:", allowed);
      if (!allowed.includes('serial')) {
        console.error("CRITICAL: 'serial' is NOT allowed by permissions policy. Please refresh the page or open in a new tab.");
      }
    }
  }, []);

  // Handle show delay for taskbar to prevent accidental triggers
  useEffect(() => {
    if (isTaskbarHovered) {
      const timer = setTimeout(() => {
        setIsTaskbarEffectivelyHovered(true);
      }, 250); // 250ms delay
      return () => clearTimeout(timer);
    } else {
      setIsTaskbarEffectivelyHovered(false);
    }
  }, [isTaskbarHovered]);

  const taskbarHeight = theme.taskbarStyle === 'panel' ? 60 : 48; // 56 (h-14) + 4 (bottom-1) vs 48 (h-12)

  // Intellihide logic
  useEffect(() => {
    if (!theme.intellihide) {
      setShouldHideTaskbar(false);
      return;
    }

    const isAnyMaximized = windows.some(win => win.isOpen && !win.isMinimized && win.isMaximized);
    
    if (!isAnyMaximized || isTaskbarEffectivelyHovered) {
      setShouldHideTaskbar(false);
      return;
    }

    const timer = setTimeout(() => {
      setShouldHideTaskbar(true);
    }, theme.hideDelay);

    return () => clearTimeout(timer);
  }, [theme.intellihide, windows, isTaskbarEffectivelyHovered, theme.hideDelay]);

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

  const handleUpdateTutorial = async (tutorial: Tutorial) => {
    try {
      const res = await fetch('/api/tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tutorial)
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }

      await refreshTutorials();
      setSelectedTutorial(tutorial);
    } catch (err) {
      console.error('Failed to update tutorial:', err);
      throw err;
    }
  };

  useEffect(() => {
    refreshTutorials();
  }, []);

  const handleStartApp = (id: AppView, morphFromId?: string, initialProps?: any) => {
    // Clear any dragging state when an app starts
    setDraggingId(null);
    setIsDraggingIcon(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setWindows(prev => {
      const existing = prev.filter(w => w.appId === id);
      
      // Singletons
      if (id === 'console' || id === 'settings' || id === 'admin' || id === 'flasher') {
        if (existing.length > 0) {
          setHighestZIndex(z => z + 1);
          setActiveWindowId(existing[0].instanceId);
          return prev.map(w => w.appId === id ? { ...w, isOpen: true, isMinimized: false, zIndex: highestZIndex + 1, initialProps: initialProps || w.initialProps } : w);
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
      setShowDash(false);
      
      return [...prev, { 
        instanceId, 
        appId: id, 
        isOpen: true, 
        isMinimized: false, 
        isMaximized: false, 
        zIndex: highestZIndex + 1,
        instanceNumber,
        morphFromId,
        initialProps
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

  const renderAppContent = (id: AppView, initialProps?: any) => {
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
                onUpdate={handleUpdateTutorial}
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
        return <SettingsApp {...initialProps} />;
      case 'sys_monitor':
        return <SystemMonitorApp windows={windows} onWindowAction={handleWindowAction} />;
      case 'weather':
        return <WeatherApp />;
      case 'clock':
        return <ClockApp />;
      case 'bluetooth':
        return <BluetoothApp />;
      default:
        return null;
    }
  };

  useEffect(() => {
    const handleOpenApp = (e: any) => {
      const { appId, morphFromId, initialProps } = e.detail;
      handleStartApp(appId, morphFromId, initialProps);
    };
    window.addEventListener('hw_os_open_app', handleOpenApp);
    return () => window.removeEventListener('hw_os_open_app', handleOpenApp);
  }, [handleStartApp]);

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
      className="h-screen w-screen overflow-hidden bg-transparent relative font-sans text-hw-blue select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, show: true });
      }}
      onClick={() => setContextMenu(null)}
    >
      {/* Custom Context Menu */}
      {contextMenu?.show && (
        <div 
          className="absolute z-[99999] bg-hw-black border border-hw-blue/30 shadow-[0_0_25px_rgba(0,0,0,0.5)] rounded-sm py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y, backdropFilter: 'var(--theme-backdrop-filter)' }}
        >
          <div className="px-3 py-1 text-[8px] uppercase tracking-[0.2em] text-hw-blue/40 border-b border-hw-blue/10 mb-1">Basic Apps</div>
          
          {[
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'console', label: 'Serial Monitor', icon: Terminal },
            { id: 'sys_monitor', label: 'Sys Monitor', icon: Activity },
            { id: 'admin', label: 'Sys Config', icon: Settings }
          ].map(app => (
            <button
              key={`ctx-${app.id}`}
              onClick={() => handleStartApp(app.id as AppView)}
              className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 transition-colors group"
            >
              <app.icon size={12} className="text-hw-blue/60 group-hover:text-hw-blue" />
              <span className="tracking-widest uppercase">{app.label}</span>
            </button>
          ))}

          <div className="h-[1px] bg-hw-blue/10 my-1" />
          
          <div className="relative group/widgets">
            <button
              onClick={() => handleStartApp('settings', undefined, { initialTab: 'widgets' })}
              className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layout size={12} className="text-hw-blue/60" />
                <span className="tracking-widest uppercase">Widgets</span>
              </div>
              <ChevronRight size={10} className="opacity-40" />
            </button>

            {/* Quick Widget Dropdown */}
            <div className="absolute left-full top-0 ml-[1px] hidden group-hover/widgets:block bg-hw-black border border-hw-blue/30 shadow-xl py-1 min-w-[160px] rounded-sm">
              <div className="px-3 py-1 text-[8px] uppercase tracking-[0.2em] text-hw-blue/40 border-b border-hw-blue/10 mb-1">Add Widget</div>
              {WIDGET_REGISTRY.map(widget => (
                <button
                  key={`ctx-widget-${widget.id}`}
                  onClick={() => {
                    const instanceId = `widget-${Date.now()}`;
                    updateTheme({
                      widgets: [...(theme.widgets || []), {
                        instanceId,
                        widgetId: widget.id,
                        x: 0,
                        y: 0,
                        w: widget.defaultSize.w,
                        h: widget.defaultSize.h,
                        isFloating: false
                      }]
                    });
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 transition-colors group"
                >
                  <widget.icon size={12} className="text-hw-blue/60 group-hover:text-hw-blue" />
                  <span className="tracking-widest uppercase">{widget.name}</span>
                  <Plus size={8} className="ml-auto opacity-0 group-hover:opacity-40" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Background / Grid */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ 
          backgroundImage: 'var(--theme-bg-image)',
          backgroundColor: 'var(--theme-bg-color)',
          backgroundSize: 'var(--theme-bg-size)',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none" />
      
      {/* Desktop Grid Overlay (Always subtly visible, blurs on drag) */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none grid"
        style={{
          bottom: taskbarHeight,
          gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
          backdropFilter: isDraggingIcon ? 'blur(16px)' : 'none',
          backgroundColor: isDraggingIcon ? `${theme.mainColor}10` : 'transparent',
          opacity: isDraggingIcon ? 1 : 0
        }}
      >
        {Array.from({ length: gridSize.cols * gridSize.rows }).map((_, i) => (
          <div 
            key={`grid-cell-${i}`} 
            className="border border-white/5"
            style={{ borderColor: isDraggingIcon ? `${theme.mainColor}30` : `${theme.mainColor}10` }}
          />
        ))}
      </div>
      
      {/* Desktop Icons Container */}
      <motion.div 
        className="absolute inset-0 z-10 overflow-hidden" 
        ref={desktopRef}
        animate={{ bottom: (theme.taskbarStyle === 'panel' || shouldHideTaskbar || theme.intellihide) ? 0 : taskbarHeight }}
        transition={{ duration: theme.animationSpeed, ease: "easeInOut" }}
      >
        {APPS.map((app) => {
          if (theme.desktopIcons?.[app.id] === false) return null;
          
          const gridPos = renderedPositions[app.id];
          if (!gridPos) return null;
          
          return (
            <DesktopIcon
              key={`desktop-icon-${app.id}`}
              app={app}
              gridPos={gridPos}
              theme={theme}
              handleStartApp={handleStartApp}
              desktopRef={desktopRef}
              gridSize={gridSize}
              onMouseDown={handleMouseDown}
              isDragging={draggingId === app.id}
              currentMousePos={currentMousePos}
              dragOffset={dragOffset}
            />
          );
        })}

        {/* Widgets */}
        {theme.widgets?.map(widget => (
          <WidgetContainer 
            key={widget.instanceId}
            widget={widget}
            gridSize={gridSize}
            onUpdate={(updates) => handleUpdateWidget(widget.instanceId, updates)}
            onRemove={() => handleRemoveWidget(widget.instanceId)}
            onMouseDown={handleMouseDown}
            isDragging={draggingId === widget.instanceId}
            currentMousePos={currentMousePos}
            dragOffset={dragOffset}
            desktopRef={desktopRef}
            isDraggingAny={!!draggingId}
          />
        ))}
      </motion.div>

      {/* Dash Panel (Ubuntu-style overflow) */}
      {showDash && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setShowDash(false)} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "relative w-full max-w-3xl max-h-[80vh] overflow-y-auto p-10 border shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center custom-scrollbar",
              theme.globalTheme === 'glassy' ? "rounded-[2.5rem] bg-hw-black/70 border-white/10" : "rounded-sm bg-hw-black border-hw-blue/20"
            )}
            style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
          >
            <button 
              onClick={() => setShowDash(false)}
              className="absolute top-8 right-8 text-hw-blue/30 hover:text-hw-blue transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <div className="text-hw-blue text-2xl font-bold mb-12 tracking-[0.3em] uppercase opacity-60">Applications</div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-8 gap-y-12 w-full">
              {APPS.filter(app => theme.desktopIcons?.[app.id] !== false).map(app => (
                <motion.div
                  key={`dash-${app.id}`}
                  transition={{ 
                    duration: 0.15,
                    ease: "easeOut"
                  }}
                  onClick={() => handleStartApp(app.id as AppView, `dash-${app.id}`)}
                  className="flex flex-col items-center gap-4 cursor-pointer group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-20 h-20 rounded-3xl bg-hw-blue/5 border border-hw-blue/10 flex items-center justify-center group-hover:bg-hw-blue/15 group-hover:border-hw-blue/30 group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_rgba(0,242,255,0.1)]">
                    <app.icon size={32} className="text-hw-blue/70 group-hover:text-hw-blue transition-colors" />
                  </div>
                  <span className="text-[10px] font-bold text-center text-hw-blue/70 group-hover:text-hw-blue uppercase tracking-widest drop-shadow-md truncate w-full px-2">
                    {app.label.replace('_', ' ')}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Windows Area */}
      <motion.div 
        className="absolute inset-0 overflow-hidden pointer-events-none z-20"
        animate={{ bottom: (theme.taskbarStyle === 'panel' || shouldHideTaskbar || theme.intellihide) ? 0 : taskbarHeight }}
        transition={{ duration: theme.animationSpeed, ease: "easeInOut" }}
      >
        <AnimatePresence mode="popLayout">
          {windows.map(win => {
            const appInfo = APPS.find(a => a.id === win.appId);
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
                  onCollapse={() => handleWindowAction(win.instanceId, 'close')}
                  morphFromId={win.morphFromId}
                  defaultSize={{ width: 900, height: 600 }}
                  defaultPosition={{ x: 50 + (win.zIndex * 20) % 200, y: 50 + (win.zIndex * 20) % 200 }}
                  globalTheme={theme.globalTheme}
                  mainColor={theme.mainColor}
                  isDarkMode={theme.isDarkMode}
                  taskbarHeight={taskbarHeight}
                  shouldHideTaskbar={shouldHideTaskbar}
                  taskbarStyle={theme.taskbarStyle}
                  intellihide={theme.intellihide}
                >
                  {renderAppContent(win.appId, win.initialProps)}
                </Window>
              </div>
            );
          })}
        </AnimatePresence>
      </motion.div>

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
        taskbarStyle={theme.taskbarStyle}
        globalTheme={theme.globalTheme}
        mainColor={theme.mainColor}
        isDarkMode={theme.isDarkMode}
        shouldHide={shouldHideTaskbar}
        onHoverChange={setIsTaskbarHovered}
        animationSpeed={theme.animationSpeed}
      />
    </div>
  );
}


