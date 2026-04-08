import React, { useState, useRef, useEffect } from "react";
import {
  Terminal,
  Play,
  Square,
  Trash2,
  ArrowDownToLine,
  ArrowUpToLine,
  Clock,
  Database,
  Send,
  FileCode,
} from "lucide-react";
import { cn } from "../lib/utils";
import { BinaryAnalysis } from "./BinaryAnalysis";

interface LogEntry {
  time: number;
  text: string;
}

export const Lab: React.FC = () => {
  const [port, setPort] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(false);

  const [activeTab, setActiveTab] = useState<"console" | "eeprom" | "binary">(
    "console",
  );
  const [consoleInput, setConsoleInput] = useState("");
  const [i2cAddress, setI2cAddress] = useState("0x50");
  const [memoryData, setMemoryData] = useState<Uint8Array>(new Uint8Array());
  const [isDumping, setIsDumping] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<any>(null);
  const keepReadingRef = useRef(true);
  const closedPromiseRef = useRef<Promise<void> | null>(null);
  const isDumpingRef = useRef(false);
  const memoryBufferRef = useRef<number[]>([]);

  const BAUD_RATES = [
    9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600,
  ];

  useEffect(() => {
    if (autoScroll && activeTab === "console") {
      logEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [logs, autoScroll, activeTab]);

  const connect = async () => {
    if (!("serial" in navigator)) {
      alert("Web Serial API not supported in this browser.");
      return;
    }

    try {
      let currentPort = port;
      if (!currentPort) {
        currentPort = await (navigator as any).serial.requestPort();
        setPort(currentPort);
      }

      await currentPort.open({ baudRate });
      setConnected(true);
      keepReadingRef.current = true;

      readLoop(currentPort);
    } catch (err: any) {
      console.error(err);
      alert(`Connection failed: ${err.message}`);
      setPort(null);
      setConnected(false);
    }
  };

  const writeToSerial = async (text: string) => {
    if (!port || !port.writable) return;
    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    try {
      await writer.write(encoder.encode(text));
    } catch (err) {
      console.error("Write error:", err);
    } finally {
      writer.releaseLock();
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (consoleInput.trim()) {
      writeToSerial(consoleInput + "\n");
      setConsoleInput("");
    }
  };

  const fetchDump = () => {
    if (!connected) return;
    setMemoryData(new Uint8Array());
    setIsDumping(true);
    isDumpingRef.current = true;
    memoryBufferRef.current = [];
    writeToSerial(`DUMP ${i2cAddress}\n`);
  };

  const disconnect = async () => {
    keepReadingRef.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error("Error canceling reader:", e);
      }
    }

    if (closedPromiseRef.current) {
      try {
        await closedPromiseRef.current;
      } catch (e) {
        console.error("Error waiting for stream to close:", e);
      }
    }

    if (port) {
      try {
        await port.close();
      } catch (e) {
        console.error("Error closing port:", e);
      }
    }

    setPort(null);
    setConnected(false);
  };

  const readLoop = async (currentPort: any) => {
    try {
      while (currentPort.readable && keepReadingRef.current) {
        const textDecoder = new TextDecoderStream();
        closedPromiseRef.current = currentPort.readable.pipeTo(
          textDecoder.writable,
        );
        const reader = textDecoder.readable.getReader();
        readerRef.current = reader;

        try {
          let buffer = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            if (value) {
              buffer += value;
              const lines = buffer.split("\n");
              if (lines.length > 1) {
                const newLines = lines
                  .slice(0, -1)
                  .map((l) => l.replace("\r", ""));
                const now = Date.now();
                const newLogEntries = newLines.map((text) => {
                  if (text.includes("--- DUMPING DEVICE")) {
                    isDumpingRef.current = true;
                    setIsDumping(true);
                    memoryBufferRef.current = [];
                    setMemoryData(new Uint8Array());
                  } else if (text.includes("--- DUMP COMPLETE ---")) {
                    isDumpingRef.current = false;
                    setIsDumping(false);
                    setMemoryData(new Uint8Array(memoryBufferRef.current));
                  } else if (isDumpingRef.current) {
                    const match = text.match(/0x[0-9A-Fa-f]{4}:\s+(.*)/);
                    if (match) {
                      const hexBytes = match[1].trim().split(/\s+/);
                      const bytes = hexBytes
                        .map((h) => parseInt(h, 16))
                        .filter((n) => !isNaN(n));
                      memoryBufferRef.current.push(...bytes);
                      if (memoryBufferRef.current.length % 256 === 0) {
                        setMemoryData(new Uint8Array(memoryBufferRef.current));
                      }
                    }
                  }
                  return { time: now, text };
                });
                setLogs((prev) => {
                  const updated = [...prev, ...newLogEntries];
                  return updated.slice(-1000); // Keep last 1000 lines
                });
                buffer = lines[lines.length - 1];
              }
            }
          }
        } catch (error) {
          console.error("Read error:", error);
          break; // Device likely disconnected
        } finally {
          reader.releaseLock();
          readerRef.current = null;
        }
      }
    } finally {
      if (keepReadingRef.current) {
        disconnect();
      }
    }
  };

  const clearLogs = () => setLogs([]);

  const getEntropyColor = (b: number) => {
    if (b === 0x00) return "rgba(0, 0, 0, 0.8)"; // Empty/Zero
    if (b === 0xff) return "rgba(255, 255, 255, 0.8)"; // Uninitialized EEPROM
    if (b >= 32 && b <= 126) return "rgba(34, 197, 94, 0.8)"; // Printable ASCII (Green)
    // Other data: gradient from blue to red based on value
    const hue = 240 - (b / 255) * 240;
    return `hsla(${hue}, 80%, 60%, 0.6)`;
  };

  const renderHexViewer = () => {
    if (memoryData.length === 0 && !isDumping) {
      return (
        <div className="text-hw-blue/40 italic">
          No memory data. Connect and click FETCH DUMP.
        </div>
      );
    }

    const rows = [];
    for (let i = 0; i < memoryData.length; i += 16) {
      const chunk = memoryData.slice(i, i + 16);

      const hexParts = Array.from(chunk).map((b) =>
        b.toString(16).padStart(2, "0").toUpperCase(),
      );
      while (hexParts.length < 16) hexParts.push("  ");
      const hexStr = hexParts.join(" ");

      const asciiStr = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");
      const addrStr = `0x${i.toString(16).padStart(4, "0").toUpperCase()}`;

      rows.push(
        <div
          key={i}
          className="flex gap-8 hover:bg-hw-blue/10 px-2 py-0.5 w-max items-center"
        >
          <span className="text-hw-blue/50 w-16 shrink-0">{addrStr}</span>
          <span className="text-hw-blue tracking-widest whitespace-pre">
            {hexStr}
          </span>

          <div className="flex items-center gap-0.5 border-x border-hw-blue/20 px-4">
            {Array.from(chunk).map((b, idx) => (
              <div
                key={idx}
                className="w-2.5 h-3.5 rounded-[1px]"
                style={{ backgroundColor: getEntropyColor(b) }}
                title={`0x${b.toString(16).padStart(2, "0").toUpperCase()}`}
              />
            ))}
            {Array.from({ length: 16 - chunk.length }).map((_, idx) => (
              <div key={`pad-${idx}`} className="w-2.5 h-3.5" />
            ))}
          </div>

          <span className="text-hw-blue/90 tracking-widest">{asciiStr}</span>
        </div>,
      );
    }

    if (isDumping) {
      rows.push(
        <div key="loading" className="flex gap-4 px-2 py-0.5 animate-pulse">
          <span className="text-hw-blue/50">Reading...</span>
        </div>,
      );
    }

    return rows;
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex items-center gap-4 border-b border-hw-blue/20 pb-4 shrink-0">
        <Terminal className="w-6 h-6 text-hw-blue" />
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase hw-glow">
            LAB_ENVIRONMENT
          </h2>
          <p className="text-[10px] text-hw-blue/40 uppercase tracking-[0.2em]">
            Serial Console & Diagnostics...
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 gap-4">
        <div className="hw-panel p-4 shrink-0 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-bold text-hw-blue/40 uppercase">
              Baud Rate
            </label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={connected}
              className="bg-hw-blue/5 border border-hw-blue/20 p-1.5 text-[10px] focus:border-hw-blue outline-none text-hw-blue appearance-none min-w-[100px]"
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate} bps
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-hw-blue/20 mx-2" />

          {connected ? (
            <button
              onClick={disconnect}
              className="hw-button py-1.5 px-4 bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30 flex items-center gap-2"
            >
              <Square className="w-3 h-3" />
              <span className="text-[10px]">DISCONNECT</span>
            </button>
          ) : (
            <button
              onClick={connect}
              className="hw-button py-1.5 px-4 bg-hw-blue/20 text-hw-blue border-hw-blue/50 hover:bg-hw-blue/30 flex items-center gap-2"
            >
              <Play className="w-3 h-3" />
              <span className="text-[10px]">CONNECT</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-4">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                connected
                  ? "bg-green-500 shadow-[0_0_8px_#22c55e]"
                  : "bg-red-500 shadow-[0_0_8px_#ef4444]",
              )}
            />
            <span className="text-[9px] uppercase font-bold text-hw-blue/60">
              {connected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>
        </div>

        <div className="flex gap-6 border-b border-hw-blue/20 shrink-0 px-2">
          <button
            onClick={() => setActiveTab("console")}
            className={cn(
              "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors",
              activeTab === "console"
                ? "border-hw-blue text-hw-blue"
                : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
            )}
          >
            Serial Console
          </button>
          <button
            onClick={() => setActiveTab("eeprom")}
            className={cn(
              "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors",
              activeTab === "eeprom"
                ? "border-hw-blue text-hw-blue"
                : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
            )}
          >
            EEPROM Dumper
          </button>
          <button
            onClick={() => setActiveTab("binary")}
            className={cn(
              "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors",
              activeTab === "binary"
                ? "border-hw-blue text-hw-blue"
                : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
            )}
          >
            Binary Analysis
          </button>
        </div>

        {activeTab === "console" && (
          <div className="hw-panel p-0 flex-1 overflow-hidden flex flex-col">
            <div className="hw-panel-header shrink-0 flex justify-between items-center">
              <span>SERIAL_OUTPUT</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTimestamp(!showTimestamp)}
                  className={cn(
                    "hw-button py-1 px-2 flex items-center gap-1.5",
                    showTimestamp
                      ? "bg-hw-blue/20 text-hw-blue border-hw-blue/50"
                      : "bg-transparent text-hw-blue/60 border-hw-blue/20",
                  )}
                >
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px]">TIMESTAMP</span>
                </button>

                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={cn(
                    "hw-button py-1 px-2 flex items-center gap-1.5",
                    autoScroll
                      ? "bg-hw-blue/20 text-hw-blue border-hw-blue/50"
                      : "bg-transparent text-hw-blue/60 border-hw-blue/20",
                  )}
                >
                  {autoScroll ? (
                    <ArrowDownToLine className="w-3 h-3" />
                  ) : (
                    <ArrowUpToLine className="w-3 h-3" />
                  )}
                  <span className="text-[9px]">AUTOSCROLL</span>
                </button>

                <button
                  onClick={clearLogs}
                  className="hw-button py-1 px-2 bg-transparent text-hw-blue/60 border-hw-blue/20 hover:text-hw-blue hover:border-hw-blue/50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="text-[9px]">CLEAR</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-black/60 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-hw-blue/80 custom-scrollbar">
              {logs.length === 0 ? (
                <span className="text-hw-blue/20 italic">Awaiting data...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all flex">
                    {showTimestamp && (
                      <span className="text-hw-blue/40 mr-3 shrink-0 select-none">
                        [{new Date(log.time).toISOString().substring(11, 23)}]
                      </span>
                    )}
                    <span>{log.text}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
            <form
              onSubmit={handleSend}
              className="p-2 border-t border-hw-blue/20 bg-black/40 flex gap-2"
            >
              <input
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                className="flex-1 bg-transparent border border-hw-blue/20 px-3 py-1.5 text-[11px] font-mono text-hw-blue outline-none focus:border-hw-blue"
                placeholder="Send command..."
                disabled={!connected}
              />
              <button
                type="submit"
                disabled={!connected}
                className="hw-button px-4 py-1.5 text-[10px] flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                SEND
              </button>
            </form>
          </div>
        )}

        {activeTab === "eeprom" && (
          <div className="hw-panel p-0 flex-1 overflow-hidden flex flex-col">
            <div className="hw-panel-header shrink-0 flex justify-between items-center">
              <span>EEPROM_MEMORY_MAP</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={i2cAddress}
                  onChange={(e) => setI2cAddress(e.target.value)}
                  placeholder="0x50"
                  className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-[10px] font-mono text-hw-blue outline-none focus:border-hw-blue w-16 text-center"
                />
                <button
                  onClick={fetchDump}
                  disabled={!connected || isDumping}
                  className="hw-button px-3 py-1 text-[9px] flex items-center gap-2 disabled:opacity-50"
                >
                  <Database className="w-3 h-3" />
                  {isDumping ? "DUMPING..." : "FETCH DUMP"}
                </button>
              </div>
            </div>
            <div className="flex-1 bg-black/60 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-hw-blue/80 custom-scrollbar">
              {renderHexViewer()}
            </div>
          </div>
        )}

        {activeTab === "binary" && (
          <div className="flex-1 min-h-0">
            <BinaryAnalysis />
          </div>
        )}
      </div>
    </div>
  );
};
