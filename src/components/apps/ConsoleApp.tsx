import React, { useState, useRef, useEffect } from "react";
import { Terminal, Play, Square, Trash2, ArrowDownToLine, ArrowUpToLine, Send, SplitSquareHorizontal, Power, Settings } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSerial } from "../../contexts/SerialContext";
import { SerialConnectionSelector } from "../common/SerialConnectionSelector";

export const ConsoleApp: React.FC<{ connectionId?: string }> = ({ connectionId: initialConnId }) => {
  const [selectedConnId, setSelectedConnId] = useState(initialConnId || 'shared');
  const {
    port,
    connected,
    baudRate,
    setBaudRate,
    connect,
    disconnect,
    writeToSerial,
    logs,
    clearLogs,
    allConnections
  } = useSerial(selectedConnId);

  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [consoleInput, setConsoleInput] = useState("");
  const [bridgeInput, setBridgeInput] = useState("");
  const [showBridge, setShowBridge] = useState(false);
  const [bridgeActive, setBridgeActive] = useState(false);
  const [bridgeBaud, setBridgeBaud] = useState(115200);
  const [lineEnding, setLineEnding] = useState("CRLF");

  const logEndRef = useRef<HTMLDivElement>(null);
  const bridgeLogEndRef = useRef<HTMLDivElement>(null);

  const BAUD_RATES = [
    9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600,
  ];

  useEffect(() => {
    if (autoScroll) {
      const mainContainer = logEndRef.current?.parentElement;
      if (mainContainer) {
        mainContainer.scrollTop = mainContainer.scrollHeight;
      }
      const bridgeContainer = bridgeLogEndRef.current?.parentElement;
      if (bridgeContainer) {
        bridgeContainer.scrollTop = bridgeContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const getEndingToken = () => {
    switch (lineEnding) {
      case "CRLF": return "\r\n";
      case "LF": return "\n";
      case "CR": return "\r";
      default: return "";
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (consoleInput.trim()) {
      writeToSerial(consoleInput + getEndingToken());
      setConsoleInput("");
    }
  };

  const handleBridgeSend = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bridgeInput.trim()) {
      writeToSerial(`BRIDGE WRITE ${bridgeInput}${getEndingToken()}`);
      setBridgeInput("");
    }
  };

  const toggleBridge = () => {
    const newState = !bridgeActive;
    setBridgeActive(newState);
    if (connected) {
      writeToSerial(`BRIDGE ${newState ? 'ON' : 'OFF'}${getEndingToken()}`);
    }
  };

  const handleBridgeBaudChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBaud = Number(e.target.value);
    setBridgeBaud(newBaud);
    if (connected) {
      writeToSerial(`BRIDGE BAUD ${newBaud}${getEndingToken()}`);
    }
  };

  const isBridgeLog = (text: string) => text.includes("[UART]") || text.includes("[UART1_RX]") || text.includes("[UART1_TX]") || text.includes("[BRIDGE]");
  const isBridgeWriteLocal = (text: string) => text.includes("> BRIDGE WRITE");

  const mainLogs = logs;
  const bridgeLogs = logs.filter(log => isBridgeLog(log.text) || isBridgeWriteLocal(log.text));

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--theme-panel-bg)' }}>
      <div className="hw-panel p-4 shrink-0 flex flex-wrap items-center gap-4 border-b border-hw-blue/20" style={{ borderColor: 'var(--theme-border-color)' }}>
        {/* Connection Selector */}
        <SerialConnectionSelector selectedConnId={selectedConnId} onSelect={setSelectedConnId} />

        <div className="h-4 w-px bg-hw-blue/20" />

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
            className="hw-button px-4 py-1.5 text-[10px] flex items-center gap-2 bg-hw-blue/10 hover:bg-hw-blue/20 rounded-lg border border-hw-blue/20 transition-all hover:scale-105 active:scale-95"
          >
            <div className="p-1 rounded bg-hw-blue/20">
              <Play className="w-3 h-3" />
            </div>
            SELECT_PORT
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="hw-button px-4 py-1.5 text-[10px] flex items-center gap-2 bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 rounded-lg transition-all hover:scale-105 active:scale-95"
          >
            <div className="p-1 rounded bg-red-500/20">
              <Square className="w-3 h-3" />
            </div>
            DISCONNECT
          </button>
        )}

        <div className="h-4 w-px bg-hw-blue/20" />

        <button
          onClick={() => setShowBridge(!showBridge)}
          className={cn(
            "hw-button px-4 py-1.5 text-[10px] flex items-center gap-2 rounded-lg border transition-all hover:scale-105 active:scale-95",
            showBridge ? "bg-hw-blue/20 border-hw-blue text-hw-blue" : "bg-hw-blue/5 border-hw-blue/20 text-hw-blue/60 hover:bg-hw-blue/10"
          )}
        >
          <SplitSquareHorizontal className="w-3 h-3" />
          SPLIT_VIEW
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Serial Stream */}
        <div 
          className={cn(
            "flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed custom-scrollbar transition-all",
            showBridge ? "border-r border-hw-blue/20" : ""
          )}
          style={{ color: 'var(--theme-terminal, var(--theme-main))', borderColor: 'var(--theme-border-color)' }}
        >
          <div className="sticky top-0 bg-black/80 backdrop-blur-sm py-1 px-2 mb-2 border-b border-hw-blue/20 text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest z-10 flex justify-between items-center">
            <span>ESP32 Stream</span>
            <span className="text-hw-blue/40">{mainLogs.length} msgs</span>
          </div>
          {mainLogs.length === 0 ? (
            <div className="opacity-40 italic">
              Waiting for serial data...
            </div>
          ) : (
            mainLogs.map((log, i) => (
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

        {/* Bridged Serial Stream */}
        {showBridge && (
          <div 
            className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed custom-scrollbar bg-hw-blue/5"
            style={{ color: 'var(--theme-terminal, var(--theme-main))' }}
          >
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm py-1 px-2 mb-2 border-b border-hw-blue/20 text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest z-10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span>Bridged Stream (UART1)</span>
                <div className={cn("w-1.5 h-1.5 rounded-full", bridgeActive ? "bg-green-500" : "bg-red-500")} />
              </div>
              <span className="text-hw-blue/40">{bridgeLogs.length} msgs</span>
            </div>
            {bridgeLogs.length === 0 ? (
              <div className="opacity-40 italic">
                No bridged data received...
              </div>
            ) : (
              bridgeLogs.map((log, i) => {
                const isTx = log.text.includes("[UART1_TX]") || log.text.includes("[UART_TX]") || isBridgeWriteLocal(log.text);
                const cleanText = log.text.replace(/^>\s*BRIDGE WRITE\s*/, "");
                
                return (
                  <div key={i} className={cn("hover:bg-hw-blue/10 px-2 py-0.5 break-all flex", isTx ? "text-cyan-400" : "text-green-400")}>
                    {showTimestamp && (
                      <span className="opacity-40 mr-4 select-none text-hw-blue/40 shrink-0">
                        [{new Date(log.time).toISOString().substring(11, 23)}]
                      </span>
                    )}
                    <span className="opacity-50 mr-2 font-bold select-none shrink-0">
                      {isTx ? ">>" : "<<"}
                    </span>
                    <span className="opacity-90">{cleanText}</span>
                  </div>
                );
              })
            )}
            <div ref={bridgeLogEndRef} />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-hw-blue/20 bg-black/40 shrink-0 flex flex-col gap-3" style={{ borderColor: 'var(--theme-border-color)' }}>
        <div className="flex items-center justify-between">
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
              <select
                value={lineEnding}
                onChange={(e) => setLineEnding(e.target.value)}
                className="bg-transparent border border-hw-blue/20 text-hw-blue/60 text-[10px] uppercase font-mono px-2 py-1 outline-none focus:border-hw-blue"
              >
                <option value="CRLF" className="bg-hw-black">CRLF (\r\n)</option>
                <option value="LF" className="bg-hw-black">LF (\n)</option>
                <option value="CR" className="bg-hw-black">CR (\r)</option>
                <option value="none" className="bg-hw-black">None</option>
              </select>
            </div>
            <div className="flex items-center gap-2 ml-4 border-l border-hw-blue/20 pl-4">
              <button
                type="button"
                onClick={() => {
                  const container = logEndRef.current?.parentElement;
                  if (container) container.scrollTop = 0;
                  const bContainer = bridgeLogEndRef.current?.parentElement;
                  if (bContainer) bContainer.scrollTop = 0;
                }}
                className="text-hw-blue/40 hover:text-hw-blue transition-colors text-[10px] uppercase tracking-widest"
              >
                TOP
              </button>
              <button
                type="button"
                onClick={() => {
                  const container = logEndRef.current?.parentElement;
                  if (container) container.scrollTop = container.scrollHeight;
                  const bContainer = bridgeLogEndRef.current?.parentElement;
                  if (bContainer) bContainer.scrollTop = bContainer.scrollHeight;
                }}
                className="text-hw-blue/40 hover:text-hw-blue transition-colors text-[10px] uppercase tracking-widest"
              >
                BOTTOM
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={clearLogs}
            className="text-hw-blue/40 hover:text-red-500 transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest group"
          >
            <div className="p-1 rounded bg-hw-blue/5 group-hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-3 h-3" />
            </div>
            Clear
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {/* Main Input */}
          <form onSubmit={handleSend} className="flex gap-2">
            <div className="flex-1 relative">
              <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hw-blue/40" />
              <input
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                placeholder="Enter command for ESP32..."
                className="w-full bg-transparent border border-hw-blue/20 pl-10 pr-4 py-2 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue transition-colors"
                disabled={!connected}
              />
            </div>
            <button
              type="submit"
              disabled={!connected || !consoleInput.trim()}
              className="hw-button px-6 flex items-center gap-2 disabled:opacity-50 rounded-lg border border-hw-blue/20 hover:bg-hw-blue/10 transition-all hover:scale-105 active:scale-95"
            >
              <div className="p-1.5 rounded bg-hw-blue/20">
                <Send className="w-4 h-4" />
              </div>
              SEND
            </button>
          </form>

          {/* Bridged Input & Controls */}
          <div className="flex gap-2 items-center bg-hw-blue/5 p-2 rounded border border-hw-blue/10">
            <button
              type="button"
              onClick={toggleBridge}
              disabled={!connected}
              className={cn(
                "px-3 py-1.5 text-[10px] flex items-center gap-2 rounded border transition-all disabled:opacity-50",
                bridgeActive ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-hw-blue/10 border-hw-blue/20 text-hw-blue/60 hover:bg-hw-blue/20"
              )}
            >
              <Power className="w-3 h-3" />
              {bridgeActive ? "BRIDGE ON" : "BRIDGE OFF"}
            </button>
            
            <select
              value={bridgeBaud}
              onChange={handleBridgeBaudChange}
              disabled={!connected}
              className="bg-transparent border border-hw-blue/20 text-hw-blue text-[10px] font-mono px-2 py-1.5 outline-none focus:border-hw-blue disabled:opacity-50 rounded"
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate} className="bg-hw-black">
                  {rate} BAUD
                </option>
              ))}
            </select>

            <form onSubmit={handleBridgeSend} className="flex-1 flex gap-2 ml-2">
              <div className="flex-1 relative">
                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500/40" />
                <input
                  type="text"
                  value={bridgeInput}
                  onChange={(e) => setBridgeInput(e.target.value)}
                  placeholder="Enter command for bridged device (UART1)..."
                  className="w-full bg-transparent border border-hw-blue/20 pl-10 pr-4 py-1.5 text-xs font-mono text-green-400 outline-none focus:border-green-500/50 transition-colors"
                  disabled={!connected || !bridgeActive}
                />
              </div>
              <button
                type="submit"
                disabled={!connected || !bridgeActive || !bridgeInput.trim()}
                className="hw-button px-4 flex items-center gap-2 disabled:opacity-50 rounded border border-hw-blue/20 hover:bg-hw-blue/10 transition-all"
              >
                <Send className="w-3 h-3" />
                SEND
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
