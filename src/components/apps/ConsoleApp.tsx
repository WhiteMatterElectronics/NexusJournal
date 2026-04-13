import React, { useState, useRef, useEffect } from "react";
import { Terminal, Play, Square, Trash2, ArrowDownToLine, ArrowUpToLine, Send } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSerial } from "../../contexts/SerialContext";

export const ConsoleApp: React.FC = () => {
  const {
    port,
    connected,
    baudRate,
    setBaudRate,
    connect,
    disconnect,
    writeToSerial,
    logs,
    clearLogs
  } = useSerial();

  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [consoleInput, setConsoleInput] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const BAUD_RATES = [
    9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600,
  ];

  useEffect(() => {
    if (autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [logs, autoScroll]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (consoleInput.trim()) {
      writeToSerial(consoleInput + "\n");
      setConsoleInput("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/60">
      <div className="hw-panel p-4 shrink-0 flex flex-wrap items-center gap-4 border-b border-hw-blue/20">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              connected ? "bg-green-500 hw-glow-green" : "bg-red-500 hw-glow-red",
            )}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue/60">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="h-4 w-px bg-hw-blue/20" />

        <select
          value={baudRate}
          onChange={(e) => setBaudRate(Number(e.target.value))}
          disabled={connected}
          className="bg-transparent border border-hw-blue/20 text-hw-blue text-[10px] font-mono px-2 py-1 outline-none focus:border-hw-blue disabled:opacity-50"
        >
          {BAUD_RATES.map((rate) => (
            <option key={rate} value={rate} className="bg-hw-black">
              {rate} BAUD
            </option>
          ))}
        </select>

        <div className="h-4 w-px bg-hw-blue/20" />

        {!connected ? (
          <button
            onClick={connect}
            className="hw-button px-4 py-1 text-[10px] flex items-center gap-2 bg-hw-blue/10 hover:bg-hw-blue/20"
          >
            <Play className="w-3 h-3" />
            SELECT_PORT
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="hw-button px-4 py-1 text-[10px] flex items-center gap-2 bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50"
          >
            <Square className="w-3 h-3" />
            DISCONNECT
          </button>
        )}
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed custom-scrollbar"
        style={{ color: 'var(--theme-terminal, var(--theme-main))' }}
      >
        {logs.length === 0 ? (
          <div className="opacity-40 italic">
            Waiting for serial data...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="hover:bg-hw-blue/5 px-2 py-0.5 break-all">
              {showTimestamp && (
                <span className="opacity-40 mr-4 select-none">
                  [{new Date(log.time).toISOString().substring(11, 23)}]
                </span>
              )}
              <span className="opacity-90">{log.text}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      <div className="p-3 border-t border-hw-blue/20 bg-black/40 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[10px] text-hw-blue/60 cursor-pointer hover:text-hw-blue transition-colors">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="accent-hw-blue"
              />
              AUTO_SCROLL
            </label>
            <label className="flex items-center gap-2 text-[10px] text-hw-blue/60 cursor-pointer hover:text-hw-blue transition-colors">
              <input
                type="checkbox"
                checked={showTimestamp}
                onChange={(e) => setShowTimestamp(e.target.checked)}
                className="accent-hw-blue"
              />
              TIMESTAMPS
            </label>
            <div className="flex items-center gap-2 ml-4 border-l border-hw-blue/20 pl-4">
              <button
                onClick={() => {
                  const container = logEndRef.current?.parentElement;
                  if (container) container.scrollTop = 0;
                }}
                className="text-hw-blue/40 hover:text-hw-blue transition-colors text-[10px] uppercase tracking-widest"
              >
                TOP
              </button>
              <button
                onClick={() => {
                  const container = logEndRef.current?.parentElement;
                  if (container) container.scrollTop = container.scrollHeight;
                }}
                className="text-hw-blue/40 hover:text-hw-blue transition-colors text-[10px] uppercase tracking-widest"
              >
                BOTTOM
              </button>
            </div>
          </div>
          <button
            onClick={clearLogs}
            className="text-hw-blue/40 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] uppercase tracking-widest"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <div className="flex-1 relative">
            <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hw-blue/40" />
            <input
              type="text"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              placeholder="Enter command to send via TX..."
              className="w-full bg-transparent border border-hw-blue/20 pl-10 pr-4 py-2 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue transition-colors"
              disabled={!connected}
            />
          </div>
          <button
            type="submit"
            disabled={!connected || !consoleInput.trim()}
            className="hw-button px-6 flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            SEND
          </button>
        </form>
      </div>
    </div>
  );
};
