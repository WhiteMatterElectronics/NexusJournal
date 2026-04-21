import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
// @ts-ignore
import "xterm/css/xterm.css";
import { Terminal as TerminalIcon } from "lucide-react";

interface ShellAppProps {
  instanceId: string;
}

export const ShellApp: React.FC<ShellAppProps> = ({ instanceId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#00000000', // Transparent, let CSS handle it
        foreground: '#00f2ff',
        cursor: '#00f2ff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    let isOpened = false;
    let isDisposed = false;

    const safeFit = () => {
      if (isDisposed) return;
      try {
        if (!terminalRef.current || terminalRef.current.clientWidth === 0 || terminalRef.current.clientHeight === 0) {
           return;
        }

        if (!isOpened) {
           term.open(terminalRef.current);
           isOpened = true;
        }

        if (fitAddon) {
          fitAddon.fit();
        }
      } catch (e) {
        // Ignore fit errors
      }
    };

    const initTimeout = setTimeout(() => {
       safeFit();
    }, 50);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Start shell process in main via IPC
    const electron = (window as any).electron;
    if (electron?.shell) {
      electron.shell.start(instanceId);

      const unsub = electron.shell.onData(instanceId, (data: string) => {
        if (!isDisposed) term.write(data);
      });

      term.onData((data) => {
        electron.shell.write(instanceId, data);
      });

      term.onResize(({ cols, rows }) => {
        electron.shell.resize(instanceId, cols, rows);
      });

      // Handle resize via ResizeObserver for precise container tracking
      const resizeObserver = new ResizeObserver(() => {
        safeFit();
      });
      resizeObserver.observe(terminalRef.current);

      return () => {
        isDisposed = true;
        clearTimeout(initTimeout);
        unsub();
        electron.shell.kill(instanceId);
        resizeObserver.disconnect();
        try { term.dispose(); } catch (e) {}
      };
    }

    return () => {
      isDisposed = true;
      clearTimeout(initTimeout);
      try { term.dispose(); } catch (e) {}
    };
  }, [instanceId]);

  return (
    <div className="flex flex-col h-full bg-black/80">
      <div className="bg-black/40 py-1 px-3 border-b border-hw-blue/20 text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest flex items-center gap-2">
        <TerminalIcon className="w-3 h-3" />
        <span>System Shell ({instanceId})</span>
      </div>
      <div className="flex-1 overflow-hidden p-2" ref={terminalRef} />
    </div>
  );
};
