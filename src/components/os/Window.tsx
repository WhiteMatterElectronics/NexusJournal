import React, { useState, useEffect } from 'react';
import { motion, useDragControls, useMotionValue } from 'motion/react';
import { X, Minus, Square } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  children: React.ReactNode;
  defaultSize?: { width: number; height: number };
  defaultPosition?: { x: number; y: number };
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
  children,
  defaultSize = { width: 800, height: 600 },
  defaultPosition = { x: 50, y: 50 }
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
        if (newHeight > currentHeight - 48) newHeight = currentHeight - 48;
        
        // Clamp x/y
        if (newX + newWidth > currentWidth) newX = currentWidth - newWidth;
        if (newY + newHeight > currentHeight - 48) newY = currentHeight - 48 - newHeight;
        
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        
        return { x: newX, y: newY, width: newWidth, height: newHeight };
      });
      
      lastWidth = currentWidth;
      lastHeight = currentHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMaximized]);

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
      if (upEvent.clientY < 20) {
        if (!isMaximized) onMaximize();
      } else if (upEvent.clientX < 20) {
        if (isMaximized) onMaximize();
        setBounds({ x: 0, y: 0, width: screenWidth / 2, height: screenHeight - 48 });
      } else if (upEvent.clientX > screenWidth - 20) {
        if (isMaximized) onMaximize();
        setBounds({ x: screenWidth / 2, y: 0, width: screenWidth / 2, height: screenHeight - 48 });
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

  const windowState = !isOpen ? { 
    opacity: 0, 
    pointerEvents: 'none' as const, 
    display: 'none',
    ...(isMaximized ? { x: 0, y: 0, width: '100%', height: '100%', scale: 1 } : { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, scale: 0.95 })
  } :
  isMinimized ? { 
    opacity: 0, 
    y: 500, 
    pointerEvents: 'none' as const, 
    display: 'none',
    ...(isMaximized ? { x: 0, width: '100%', height: '100%', scale: 1 } : { x: bounds.x, width: bounds.width, height: bounds.height, scale: 0.8 })
  } :
  isMaximized
    ? { opacity: 1, x: 0, y: 0, width: '100%', height: '100%', scale: 1, pointerEvents: 'auto' as const, display: 'flex' }
    : { opacity: 1, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, scale: 1, pointerEvents: 'auto' as const, display: 'flex' };

  return (
    <motion.div
      id={`window-${id}`}
      initial={windowState}
      animate={windowState}
      transition={{ duration: 0.15, display: { delay: isVisible ? 0 : 0.15 } }}
      onMouseDown={onFocus}
      style={{ zIndex, position: 'absolute', backdropFilter: 'var(--theme-backdrop-filter)' }}
      className={cn(
        "flex flex-col bg-hw-black border shadow-2xl overflow-hidden",
        isMaximized ? "border-none" : "border-hw-blue/30 rounded-sm",
        isActive ? "border-hw-blue shadow-[0_0_30px_rgba(0,242,255,0.15)]" : "opacity-90"
      )}
    >
      {/* Title Bar (Draggable Area) */}
      <div 
        className={cn(
          "h-8 flex items-center justify-between px-3 shrink-0 select-none",
          isActive ? "bg-hw-blue/20 border-b border-hw-blue/40" : "bg-hw-blue/5 border-b border-hw-blue/20"
        )}
        style={{ cursor: isMaximized ? 'default' : 'grab' }}
        onPointerDown={handleTitleBarPointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onMaximize();
        }}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <Icon className="w-4 h-4 text-hw-blue" />
          <span className="text-[10px] font-bold text-hw-blue uppercase tracking-widest">{title}</span>
        </div>
        <div 
          className="flex items-center gap-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="text-hw-blue/60 hover:text-hw-blue p-1">
            <Minus className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMaximize(); }} className="text-hw-blue/60 hover:text-hw-blue p-1">
            {isMaximized ? <Minus className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-red-500/60 hover:text-red-500 p-1">
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

