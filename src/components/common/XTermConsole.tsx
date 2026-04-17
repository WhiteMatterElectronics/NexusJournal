import React, { useEffect, useRef, useMemo } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';

interface XTermConsoleProps {
  onData?: (data: string) => void;
  className?: string;
  id?: string;
  theme?: any;
}

export const XTermConsole: React.FC<XTermConsoleProps> = ({ 
  onData, 
  className, 
  id,
  theme: customTheme
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { theme: osTheme } = useSettings();

  const activeTheme = useMemo(() => customTheme || {
    background: '#00000000',
    foreground: osTheme.mainColor,
    cursor: osTheme.mainColor,
    selectionBackground: `${osTheme.mainColor}44`,
    black: '#000000',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#bbbbbb',
  }, [customTheme, osTheme.mainColor]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize Terminal
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: activeTheme,
      allowProposedApi: true,
      convertEol: true, 
      scrollback: 10000,
      tabStopWidth: 8,
      screenReaderMode: false
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalRef.current);
    
    // Fitting delay
    const timer = setTimeout(() => {
        fitAddon.fit();
    }, 100);

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle user input
    if (onData) {
      terminal.onData((data) => {
        onData(data);
      });
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });

    resizeObserver.observe(terminalRef.current);

    const handleWrite = (e: any) => {
       if (e.detail) terminal.write(e.detail);
    };

    const handleClear = () => {
       terminal.clear();
       terminal.reset();
    };

    const handleScrollTop = () => {
      if (xtermRef.current) xtermRef.current.scrollToTop();
    };

    const handleScrollBottom = () => {
      if (xtermRef.current) xtermRef.current.scrollToBottom();
    };

    const writeEvent = 'terminal-write-' + (id || 'default');
    const clearEvent = 'terminal-clear-' + (id || 'default');
    const scrollTopEvent = 'terminal-scroll-top-' + (id || 'default');
    const scrollBottomEvent = 'terminal-scroll-bottom-' + (id || 'default');

    window.addEventListener(writeEvent, handleWrite);
    window.addEventListener(clearEvent, handleClear);
    window.addEventListener(scrollTopEvent, handleScrollTop);
    window.addEventListener(scrollBottomEvent, handleScrollBottom);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      terminal.dispose();
      window.removeEventListener(writeEvent, handleWrite);
      window.removeEventListener(clearEvent, handleClear);
      window.removeEventListener(scrollTopEvent, handleScrollTop);
      window.removeEventListener(scrollBottomEvent, handleScrollBottom);
    };
  }, [id]);

  // Update theme if it changes dynamically
  useEffect(() => {
      if (xtermRef.current) {
          xtermRef.current.options.theme = activeTheme;
      }
  }, [activeTheme]);

  return (
    <div 
      className={cn("w-full h-full min-h-0 bg-black/20 overflow-hidden", className)}
      ref={terminalRef}
    />
  );
};
