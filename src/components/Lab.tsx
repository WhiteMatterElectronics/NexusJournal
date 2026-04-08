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
  Edit3,
  Radio,
} from "lucide-react";
import { cn } from "../lib/utils";
import { BinaryAnalysis } from "./BinaryAnalysis";

import { useSerial } from "../contexts/SerialContext";

interface LogEntry {
  time: number;
  text: string;
}

export const Lab: React.FC = () => {
  const {
    port,
    connected,
    baudRate,
    setBaudRate,
    connect,
    disconnect,
    writeToSerial,
    subscribe
  } = useSerial();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(false);

  const [activeTab, setActiveTab] = useState<"console" | "eeprom" | "rfid" | "binary">(
    "console",
  );
  const [consoleInput, setConsoleInput] = useState("");
  const [i2cAddress, setI2cAddress] = useState("0x50");
  const [memoryData, setMemoryData] = useState<Uint8Array>(new Uint8Array());
  const [isDumping, setIsDumping] = useState(false);
  const [writeMemAddr, setWriteMemAddr] = useState("0x0000");
  const [writeData, setWriteData] = useState("");

  const [rfidData, setRfidData] = useState<Uint8Array>(new Uint8Array(1024));
  const [rfidBlocksRead, setRfidBlocksRead] = useState<Set<number>>(new Set());
  const [isRfidScanning, setIsRfidScanning] = useState(false);
  const [rfidStatus, setRfidStatus] = useState("");
  const [rfidSector, setRfidSector] = useState("0");
  const [rfidWriteBlock, setRfidWriteBlock] = useState("0");
  const [rfidWriteData, setRfidWriteData] = useState("");

  const logEndRef = useRef<HTMLDivElement>(null);
  const isDumpingRef = useRef(false);
  const memoryBufferRef = useRef<number[]>([]);
  const dumpTimeoutRef = useRef<any>(null);
  const serialBufferRef = useRef("");

  const BAUD_RATES = [
    9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600,
  ];

  useEffect(() => {
    if (autoScroll && activeTab === "console") {
      logEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [logs, autoScroll, activeTab]);

  useEffect(() => {
    const unsubscribe = subscribe((value) => {
      serialBufferRef.current += value;
      const lines = serialBufferRef.current.split("\n");
      
      if (lines.length > 1) {
        const newLines = lines.slice(0, -1).map((l) => l.replace("\r", ""));
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
            if (dumpTimeoutRef.current) clearTimeout(dumpTimeoutRef.current);
          } else if (text.includes("ERROR: Device not responding")) {
            isDumpingRef.current = false;
            setIsDumping(false);
            if (dumpTimeoutRef.current) clearTimeout(dumpTimeoutRef.current);
          } else if (text.includes("SCAN_CARD_NOW")) {
            setIsRfidScanning(true);
            setRfidStatus("Please scan your RFID card...");
          } else if (text.includes("TIMEOUT")) {
            setIsRfidScanning(false);
            setRfidStatus("Timeout: No card detected.");
          } else if (text.startsWith("BLOCK:")) {
            setIsRfidScanning(false);
            setRfidStatus("Reading data...");
            const parts = text.split(":");
            const blockNum = parseInt(parts[1], 10);
            if (parts[2] === "DATA" && parts[3]) {
              const hexStr = parts[3].trim();
              const bytes = [];
              for (let i = 0; i < hexStr.length; i += 2) {
                bytes.push(parseInt(hexStr.substring(i, i + 2), 16));
              }
              setRfidData(prev => {
                const newData = new Uint8Array(prev);
                newData.set(bytes, blockNum * 16);
                return newData;
              });
              setRfidBlocksRead(prev => {
                const newSet = new Set(prev);
                newSet.add(blockNum);
                return newSet;
              });
            }
          } else if (text.includes("WRITE_SUCCESS")) {
            setIsRfidScanning(false);
            setRfidStatus("Write successful!");
          } else if (text.includes("WRITE_FAILED")) {
            setIsRfidScanning(false);
            setRfidStatus("Write failed.");
          } else if (text.includes("ERR:HEX_LEN_32_REQ")) {
            setIsRfidScanning(false);
            setRfidStatus("Error: Data must be exactly 32 hex characters (16 bytes).");
          } else if (isDumpingRef.current) {
            const match = text.match(/(0x[0-9A-Fa-f]{4}):\s*(.*)/);
            if (match) {
              const addr = parseInt(match[1], 16);
              const hexBytes = match[2].trim().split(/\s+/);
              const bytes = hexBytes
                .filter(h => h.length > 0)
                .map((h) => parseInt(h, 16))
                .filter((n) => !isNaN(n));
              
              // Ensure buffer is large enough to reach this address
              while (memoryBufferRef.current.length < addr + bytes.length) {
                memoryBufferRef.current.push(0xFF);
              }
              
              // Place bytes at their exact absolute address
              for (let i = 0; i < bytes.length; i++) {
                memoryBufferRef.current[addr + i] = bytes[i];
              }
              
              // Update state on every line to ensure no data is lost
              setMemoryData(new Uint8Array(memoryBufferRef.current));
            }
          }
          return { time: now, text };
        });
        
        setLogs((prev) => {
          const updated = [...prev, ...newLogEntries];
          return updated.slice(-1000); // Keep last 1000 lines
        });
        
        serialBufferRef.current = lines[lines.length - 1];
      }
    });
    
    return unsubscribe;
  }, [subscribe]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (consoleInput.trim()) {
      writeToSerial(consoleInput + "\n");
      setConsoleInput("");
    }
  };

  const fetchDump = () => {
    if (!connected || !port || !port.writable) {
      return;
    }
    setMemoryData(new Uint8Array());
    setIsDumping(true);
    isDumpingRef.current = true;
    memoryBufferRef.current = [];
    writeToSerial(`DUMP ${i2cAddress}\n`);

    if (dumpTimeoutRef.current) clearTimeout(dumpTimeoutRef.current);
    dumpTimeoutRef.current = setTimeout(() => {
      if (isDumpingRef.current) {
        setIsDumping(false);
        isDumpingRef.current = false;
        setLogs((prev) => [...prev, { time: Date.now(), text: "SYSTEM ERROR: Dump operation timed out." }].slice(-1000));
      }
    }, 15000);
  };

  const handleEEPROMWrite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !port || !port.writable || !writeData.trim()) return;
    writeToSerial(`WRITE ${i2cAddress} ${writeMemAddr} ${writeData}\n`);
    setWriteData("");
  };

  const handleRfidDump = () => {
    if (!connected || !port || !port.writable) return;
    setRfidData(new Uint8Array(1024));
    setRfidBlocksRead(new Set());
    setRfidStatus("Initiating dump...");
    setIsRfidScanning(true);
    writeToSerial("DUMP\n");
  };

  const handleRfidRead = () => {
    if (!connected || !port || !port.writable) return;
    setRfidStatus(`Initiating read for sector ${rfidSector}...`);
    setIsRfidScanning(true);
    writeToSerial(`READ ${rfidSector}\n`);
  };

  const handleRfidWrite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !port || !port.writable) return;

    const blockNum = parseInt(rfidWriteBlock.trim(), 10);
    if (isNaN(blockNum) || blockNum < 0 || blockNum > 63) {
      setRfidStatus("Error: Invalid block number (0-63).");
      return;
    }

    if (blockNum === 0) {
      setRfidStatus("Error: Block 0 is read-only (Manufacturer Data).");
      return;
    }

    if ((blockNum + 1) % 4 === 0) {
      const confirmWrite = window.confirm(
        `WARNING: Block ${blockNum} is a Sector Trailer!\n\nWriting invalid data here can permanently lock the sector. Are you sure you want to proceed?`
      );
      if (!confirmWrite) {
        setRfidStatus("Write cancelled by user.");
        return;
      }
    }

    let finalHexData = rfidWriteData.trim();

    // Check if it's an ASCII string enclosed in quotes
    if (finalHexData.startsWith('"') && finalHexData.endsWith('"')) {
      const text = finalHexData.slice(1, -1);
      let hex = "";
      for (let i = 0; i < text.length && i < 16; i++) {
        hex += text.charCodeAt(i).toString(16).padStart(2, "0").toUpperCase();
      }
      // Pad with zeros to reach 32 characters (16 bytes)
      while (hex.length < 32) {
        hex += "00";
      }
      finalHexData = hex;
    } else {
      // Clean up hex input (remove spaces, '0x')
      finalHexData = finalHexData.replace(/0x/gi, "").replace(/\s+/g, "").toUpperCase();
      // Pad with zeros if less than 32 chars
      while (finalHexData.length < 32) {
        finalHexData += "00";
      }
      // Truncate to 32 chars if longer
      finalHexData = finalHexData.substring(0, 32);
    }

    setRfidStatus(`Initiating write to block ${blockNum}...`);
    setIsRfidScanning(true);
    writeToSerial(`WRITE ${blockNum} ${finalHexData}\n`);
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

  const renderRfidViewer = () => {
    if (rfidBlocksRead.size === 0 && !isRfidScanning) {
      return (
        <div className="text-hw-blue/40 italic">
          No RFID data. Connect and click DUMP ALL or READ SECTOR.
        </div>
      );
    }

    const rows = [];
    for (let i = 0; i < 64; i++) {
      if (!rfidBlocksRead.has(i)) continue;

      const chunk = rfidData.slice(i * 16, i * 16 + 16);
      const hexParts = Array.from(chunk).map((b) =>
        b.toString(16).padStart(2, "0").toUpperCase(),
      );
      const hexStr = hexParts.join(" ");

      const asciiStr = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");
      
      const sector = Math.floor(i / 4);
      const isSectorTrailer = i % 4 === 3;

      rows.push(
        <div
          key={i}
          className={cn(
            "flex gap-8 hover:bg-hw-blue/10 px-2 py-0.5 w-max items-center",
            isSectorTrailer ? "text-hw-blue/60" : ""
          )}
        >
          <span className="text-hw-blue/50 w-24 shrink-0">
            SEC {sector.toString().padStart(2, '0')} BLK {i.toString().padStart(2, '0')}
          </span>
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
          </div>

          <span className="text-hw-blue/90 tracking-widest">{asciiStr}</span>
        </div>,
      );
    }

    if (isRfidScanning) {
      rows.push(
        <div key="loading" className="flex gap-4 px-2 py-0.5 animate-pulse">
          <span className="text-hw-blue/50">{rfidStatus || "Waiting for card..."}</span>
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
            onClick={() => setActiveTab("rfid")}
            className={cn(
              "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors",
              activeTab === "rfid"
                ? "border-hw-blue text-hw-blue"
                : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
            )}
          >
            RFID Tool
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
            <div className="p-3 border-t border-hw-blue/20 bg-black/40">
              <form onSubmit={handleEEPROMWrite} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-[9px] font-bold text-hw-blue/40 uppercase">Address</label>
                  <input
                    type="text"
                    value={writeMemAddr}
                    onChange={(e) => setWriteMemAddr(e.target.value)}
                    placeholder="0x0000"
                    className="bg-transparent border border-hw-blue/20 px-2 py-1 text-[10px] font-mono text-hw-blue outline-none focus:border-hw-blue w-20"
                    disabled={!connected}
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[9px] font-bold text-hw-blue/40 uppercase">Data</label>
                  <input
                    type="text"
                    value={writeData}
                    onChange={(e) => setWriteData(e.target.value)}
                    placeholder='"Hello" or 0xDE 0xAD'
                    className="flex-1 bg-transparent border border-hw-blue/20 px-2 py-1 text-[10px] font-mono text-hw-blue outline-none focus:border-hw-blue"
                    disabled={!connected}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!connected || !writeData.trim()}
                  className="hw-button px-4 py-1 text-[10px] flex items-center gap-2 disabled:opacity-50"
                >
                  <Edit3 className="w-3 h-3" />
                  WRITE
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "rfid" && (
          <div className="hw-panel p-0 flex-1 overflow-hidden flex flex-col">
            <div className="hw-panel-header shrink-0 flex justify-between items-center">
              <span>RFID_MEMORY_MAP</span>
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-hw-blue/60">{rfidStatus}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rfidSector}
                    onChange={(e) => setRfidSector(e.target.value)}
                    placeholder="Sec (0-15)"
                    className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-[10px] font-mono text-hw-blue outline-none focus:border-hw-blue w-20 text-center"
                  />
                  <button
                    onClick={handleRfidRead}
                    disabled={!connected || isRfidScanning}
                    className="hw-button px-3 py-1 text-[9px] flex items-center gap-2 disabled:opacity-50"
                  >
                    <Radio className="w-3 h-3" />
                    READ SECTOR
                  </button>
                </div>
                <button
                  onClick={handleRfidDump}
                  disabled={!connected || isRfidScanning}
                  className="hw-button px-3 py-1 text-[9px] flex items-center gap-2 disabled:opacity-50"
                >
                  <Database className="w-3 h-3" />
                  DUMP ALL
                </button>
              </div>
            </div>
            <div className="flex-1 bg-black/60 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-hw-blue/80 custom-scrollbar">
              {renderRfidViewer()}
            </div>
            <div className="p-3 border-t border-hw-blue/20 bg-black/40">
              <form onSubmit={handleRfidWrite} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-[9px] font-bold text-hw-blue/40 uppercase">Block</label>
                  <input
                    type="text"
                    value={rfidWriteBlock}
                    onChange={(e) => setRfidWriteBlock(e.target.value)}
                    placeholder="0-63"
                    className="bg-transparent border border-hw-blue/20 px-2 py-1 text-[10px] font-mono text-hw-blue outline-none focus:border-hw-blue w-16"
                    disabled={!connected}
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[9px] font-bold text-hw-blue/40 uppercase">Data</label>
                  <input
                    type="text"
                    value={rfidWriteData}
                    onChange={(e) => setRfidWriteData(e.target.value)}
                    placeholder='Hex or "Text"'
                    className="flex-1 bg-transparent border border-hw-blue/20 px-2 py-1 text-[10px] font-mono text-hw-blue outline-none focus:border-hw-blue"
                    disabled={!connected}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!connected || !rfidWriteData.trim() || isRfidScanning}
                  className="hw-button px-4 py-1 text-[10px] flex items-center gap-2 disabled:opacity-50"
                >
                  <Edit3 className="w-3 h-3" />
                  WRITE BLOCK
                </button>
              </form>
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
