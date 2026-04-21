import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Settings, X, Maximize2, Move, Layers } from 'lucide-react';
import { ActiveWidget, WidgetDefinition } from '../../types/widgets';
import { getWidgetById } from '../../widgets/registry';
import { useSettings } from '../../contexts/SettingsContext';
import { cn } from '../../lib/utils';

interface WidgetContainerProps {
  widget: ActiveWidget;
  gridSize: { cols: number; rows: number };
  onUpdate: (updates: Partial<ActiveWidget>) => void;
  onRemove: () => void;
  onMouseDown: (e: React.MouseEvent, data: { id: string, pos: {x: number, y: number} }) => void;
  isDragging?: boolean;
  currentMousePos?: { x: number, y: number };
  dragOffset?: { x: number, y: number };
  desktopRef?: React.RefObject<HTMLDivElement>;
  isDraggingAny?: boolean;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  gridSize,
  onUpdate,
  onRemove,
  onMouseDown,
  isDragging,
  currentMousePos,
  dragOffset,
  desktopRef,
  isDraggingAny
}) => {
  const { theme } = useSettings();
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const definition = getWidgetById(widget.widgetId);
  if (!definition) return null;

  const isGlassy = theme.globalTheme === 'glassy';
  const isDark = theme.isDarkMode;
  const widgetColor = widget.config?.textColor || theme.mainColor;

  const colWidth = 100 / gridSize.cols;
  const rowHeight = 100 / gridSize.rows;

  const desktopRect = desktopRef?.current?.getBoundingClientRect();

  const style: React.CSSProperties = isDragging && currentMousePos && dragOffset ? {
    position: 'absolute',
    left: currentMousePos.x - dragOffset.x - (desktopRect?.left || 0),
    top: currentMousePos.y - dragOffset.y - (desktopRect?.top || 0),
    width: `${widget.w * (desktopRect?.width || 0) / gridSize.cols}px`,
    height: `${widget.h * (desktopRect?.height || 0) / gridSize.rows}px`,
    zIndex: 10000,
    cursor: 'grabbing',
    opacity: 0.8,
    pointerEvents: 'none'
  } : {
    position: 'absolute',
    left: `${widget.x * colWidth}%`,
    top: `${widget.y * rowHeight}%`,
    width: `${widget.w * colWidth}%`,
    height: `${widget.h * rowHeight}%`,
    zIndex: widget.isFloating ? 5000 : 10,
    pointerEvents: isDraggingAny ? 'none' : 'auto',
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = widget.w;
    const startH = widget.h;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const desktop = containerRef.current?.parentElement;
      if (!desktop) return;
      const desktopRect = desktop.getBoundingClientRect();
      
      const cellW = desktopRect.width / gridSize.cols;
      const cellH = desktopRect.height / gridSize.rows;

      const newW = Math.max(1, Math.round(startW + deltaX / cellW));
      const newH = Math.max(1, Math.round(startH + deltaY / cellH));

      if (newW !== widget.w || newH !== widget.h) {
        onUpdate({ w: newW, h: newH });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <motion.div
      ref={containerRef}
      style={style}
      layoutId={isDragging ? undefined : widget.instanceId}
      transition={isDragging ? { duration: 0 } : { 
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 1
      }}
      className={cn(
        "group transition-shadow duration-300",
        isGlassy ? "rounded-2xl" : "rounded-none"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "w-full h-full relative overflow-hidden border-2 transition-all duration-300",
        isGlassy 
          ? "bg-white/5 backdrop-blur-md border-white/10" 
          : "bg-black/40 border-theme-main-20",
        isHovered && !isDraggingAny ? "border-theme-main-60 shadow-lg" : ""
      )}
      style={{ 
        borderColor: isHovered && !isDraggingAny ? 'var(--theme-main)' : undefined,
        borderRadius: isGlassy ? '1rem' : '0'
      }}>
        {/* Widget Content */}
        <div className="w-full h-full relative z-0" style={{ containerType: 'size', '--theme-main': widgetColor } as React.CSSProperties}>
          <definition.component 
            instanceId={widget.instanceId}
            mainColor={widgetColor}
            isDarkMode={isDark}
            globalTheme={theme.globalTheme}
            config={widget.config}
            isFloating={widget.isFloating}
          />
        </div>

        {/* Drag Handle (Behind buttons) */}
        <div 
          className={cn(
            "absolute top-0 left-0 w-[calc(100%-80px)] h-10 cursor-move flex items-center px-3 transition-opacity z-10",
            isHovered && !isDraggingAny ? "opacity-100" : "opacity-0 md:opacity-0"
          )}
          style={{ opacity: isHovered && !isDraggingAny ? 1 : 0.4 }}
          onMouseDown={(e) => onMouseDown(e, { id: widget.instanceId, pos: { x: widget.x, y: widget.y } })}
          onTouchStart={(e) => {
            // Support touch drag
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY,
              bubbles: true
            });
            onMouseDown(mouseEvent as any, { id: widget.instanceId, pos: { x: widget.x, y: widget.y } });
          }}
        >
          <Move className="w-3 h-3 opacity-50" style={{ color: 'var(--theme-main)' }} />
        </div>

        {/* Controls Overlay (Top Layer) */}
        <div className={cn(
          "absolute top-2 right-2 flex gap-1 transition-opacity duration-200 z-20"
        )}
        style={{ opacity: isHovered && !isDraggingAny ? 1 : 0.4 }}>
          {definition.type === 'app' && definition.appId && (
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('hw_os_open_app', { 
                  detail: { appId: definition.appId, morphFromId: widget.instanceId } 
                }));
              }}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors pointer-events-auto"
              title="Expand to Window"
            >
              <Maximize2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-main)' }} />
            </button>
          )}
          <button 
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ isFloating: !widget.isFloating });
            }}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors pointer-events-auto"
            title={widget.isFloating ? "Pin to Desktop" : "Float over Windows"}
          >
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--theme-main)' }} />
          </button>
          <button 
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors pointer-events-auto"
            title="Remove Widget"
          >
            <X className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>

        {/* Resize Handle */}
        <div 
          className={cn(
            "absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5",
            isHovered && !isDraggingAny ? "opacity-100" : "opacity-0"
          )}
          onMouseDown={handleResizeStart}
        >
          <div className="w-1.5 h-1.5 border-r-2 border-b-2 opacity-50" style={{ borderColor: 'var(--theme-main)' }} />
        </div>
      </div>
    </motion.div>
  );
};
