import React, { useState, useEffect } from 'react';
import { motion, useDragControls, useMotionValue } from 'motion/react';
import { X, Minus, Square, Minimize2 } from 'lucide-react';
import { cn, getContrastColor } from '../../lib/utils';

interface WindowProps {
  id: string;
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  isActive: boolean;
  zIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onCollapse?: () => void;
  children: React.ReactNode;
  defaultSize?: { width: number; height: number };
  defaultPosition?: { x: number; y: number };
  globalTheme?: 'retro' | 'glassy';
  taskbarHeight?: number;
  shouldHideTaskbar?: boolean;
  taskbarStyle?: 'fixed' | 'panel';
  intellihide?: boolean;
  mainColor?: string;
  isDarkMode?: boolean;
  layoutId?: string;
  morphFromId?: string;
}

export const Window: React.FC<WindowProps> = ({
  id,
  title,
  icon: Icon,
  isOpen,
  isMinimized,
  isMaximized,
  isActive,
  zIndex,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onCollapse,
  children,
  defaultSize = { width: 800, height: 600 },
  defaultPosition = { x: 50, y: 50 },
  globalTheme = 'retro',
  taskbarHeight = 48,
  shouldHideTaskbar = false,
  taskbarStyle = 'fixed',
  intellihide = false,
  mainColor = '#00f2ff',
  isDarkMode = true,
  layoutId,
  morphFromId
}) => {
  const dragControls = useDragControls();
  const [bounds, setBounds] = useState({ 
    width: defaultSize.width, 
    height: defaultSize.height,
    x: defaultPosition.x,
    y: defaultPosition.y
  });

  // Handle proportional resizing when browser window resizes
  useEffect(() => {
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    const handleResize = () => {
      if (isMaximized) return;
      
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      
      const widthRatio = currentWidth / lastWidth;
      const heightRatio = currentHeight / lastHeight;
      
      setBounds(prev => {
        let newX = prev.x * widthRatio;
        let newY = prev.y * heightRatio;
        let newWidth = prev.width * widthRatio;
        let newHeight = prev.height * heightRatio;
        
        // Clamp width/height
        if (newWidth > currentWidth) newWidth = currentWidth;
        if (newHeight > currentHeight - taskbarHeight) newHeight = currentHeight - taskbarHeight;
        
        // Clamp x/y
        if (newX + newWidth > currentWidth) newX = currentWidth - newWidth;
        if (newY + newHeight > currentHeight - taskbarHeight) newY = currentHeight - taskbarHeight - newHeight;
        
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        
        return { x: newX, y: newY, width: newWidth, height: newHeight };
      });
      
      lastWidth = currentWidth;
      lastHeight = currentHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMaximized, taskbarHeight]);

  const handleTitleBarPointerDown = (e: React.PointerEvent) => {
    if (isMaximized) {
      onMaximize(); // Restore
      
      // Calculate new bounds to center around mouse
      const newWidth = defaultSize.width;
      const newX = e.clientX - newWidth / 2;
      const newY = e.clientY - 10;
      
      setBounds(prev => ({
        ...prev,
        x: newX,
        y: newY,
        width: newWidth
      }));

      // Start drag from this new position
      startDrag(e.clientX, e.clientY, newX, newY);
    } else {
      startDrag(e.clientX, e.clientY, bounds.x, bounds.y);
    }
  };

  const startDrag = (startX: number, startY: number, initialWindowX: number, initialWindowY: number) => {
    const handlePointerMove = (moveEvent: PointerEvent) => {
      setBounds(prev => ({
        ...prev,
        x: initialWindowX + (moveEvent.clientX - startX),
        y: initialWindowY + (moveEvent.clientY - startY)
      }));
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Snapping logic on drop
      if (upEvent.clientY < 30) {
        if (!isMaximized) onMaximize();
      } else if (upEvent.clientX < 30) {
        if (isMaximized) onMaximize();
        setBounds({ x: 0, y: 0, width: screenWidth / 2, height: screenHeight - taskbarHeight });
      } else if (upEvent.clientX > screenWidth - 30) {
        if (isMaximized) onMaximize();
        setBounds({ x: screenWidth / 2, y: 0, width: screenWidth / 2, height: screenHeight - taskbarHeight });
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = bounds.width;
    const startHeight = bounds.height;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setBounds(prev => ({
        ...prev,
        width: Math.max(300, startWidth + (moveEvent.clientX - startX)),
        height: Math.max(200, startHeight + (moveEvent.clientY - startY))
      }));
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // We keep the window mounted to preserve state (like serial subscriptions)
  // We just hide it visually when closed or minimized
  const isVisible = isOpen && !isMinimized;
  // If intellihide is on, we want the window to be full height and the taskbar to overlay it
  const effectiveTaskbarHeight = (shouldHideTaskbar || intellihide) ? 0 : taskbarHeight;
  const isPanel = taskbarStyle === 'panel';
  const contrastColor = getContrastColor(mainColor);

  const windowState = !isOpen ? { 
    opacity: 0, 
    pointerEvents: 'none' as const, 
    ...(isMaximized ? { x: 0, y: 0, width: '100%', height: isPanel ? `calc(100% - ${effectiveTaskbarHeight}px)` : '100%', scale: 1 } : { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, scale: 0.95 })
  } :
  isMinimized ? { 
    opacity: 0, 
    y: 500, 
    pointerEvents: 'none' as const, 
    ...(isMaximized ? { x: 0, width: '100%', height: isPanel ? `calc(100% - ${effectiveTaskbarHeight}px)` : '100%', scale: 1 } : { x: bounds.x, width: bounds.width, height: bounds.height, scale: 0.8 })
  } :
  isMaximized
    ? { opacity: 1, x: 0, y: 0, width: '100%', height: isPanel ? `calc(100% - ${effectiveTaskbarHeight}px)` : '100%', scale: 1, pointerEvents: 'auto' as const }
    : { opacity: 1, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, scale: 1, pointerEvents: 'auto' as const };

  return (
    <motion.div
      id={`window-${id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={windowState}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ 
        duration: 0.15,
        ease: "easeOut"
      }}
      onMouseDown={onFocus}
      style={{ 
        zIndex, 
        position: 'absolute', 
        backdropFilter: 'var(--theme-backdrop-filter)', 
        color: 'var(--theme-text)',
        visibility: isVisible ? 'visible' : (isOpen ? 'visible' : 'hidden'),
      }}
      className={cn(
        "flex flex-col bg-hw-black border shadow-2xl overflow-hidden pointer-events-auto",
        isMaximized ? "border-none" : cn("border-hw-border", globalTheme === 'glassy' ? "rounded-2xl" : "rounded-sm"),
        isActive ? "border-hw-blue shadow-[0_0_30px_rgba(0,242,255,0.15)]" : "opacity-90"
      )}
    >
      {/* Title Bar (Draggable Area) */}
      <div 
        className={cn(
          "h-8 flex items-center justify-between px-3 shrink-0 select-none",
          isActive ? "" : "bg-hw-blue/5 border-b border-hw-blue/20"
        )}
        style={{ 
          cursor: isMaximized ? 'default' : 'grab',
          backgroundColor: isActive ? mainColor : undefined,
          borderBottomColor: isActive ? mainColor : undefined
        }}
        onPointerDown={handleTitleBarPointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onMaximize();
        }}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <Icon className="w-4 h-4" style={{ color: isActive ? contrastColor : mainColor }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isActive ? contrastColor : mainColor }}>{title}</span>
        </div>
        <div 
          className="flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); onMinimize(); }} 
            className={cn("p-1.5 transition-colors", globalTheme === 'glassy' && "hover:bg-white/10 rounded-lg")}
            style={{ color: isActive ? contrastColor : mainColor }}
          >
            <Minus className="w-3 h-3" />
          </button>
          {morphFromId && onCollapse && (
            <button 
              onClick={(e) => { e.stopPropagation(); onCollapse(); }} 
              className={cn("p-1.5 transition-colors", globalTheme === 'glassy' && "hover:bg-white/10 rounded-lg")}
              style={{ color: isActive ? contrastColor : mainColor }}
              title="Collapse to Widget"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onMaximize(); }} 
            className={cn("p-1.5 transition-colors", globalTheme === 'glassy' && "hover:bg-white/10 rounded-lg")}
            style={{ color: isActive ? contrastColor : mainColor }}
          >
            {isMaximized ? <Minus className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className={cn("p-1.5 transition-colors", globalTheme === 'glassy' && "hover:bg-red-500/10 rounded-lg")}
            style={{ color: isActive ? contrastColor : 'rgb(239, 68, 68)' }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-hidden relative bg-transparent">
        {children}
      </div>

      {/* Resize Handle */}
      {!isMaximized && isVisible && (
        <div
          onPointerDown={handleResizePointerDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, rgba(0, 242, 255, 0.4) 50%)'
          }}
        />
      )}
    </motion.div>
  );
};

