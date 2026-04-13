import React, { useState, useEffect, useRef } from "react";
import { Database, ArrowDownToLine, ArrowUpToLine } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSerial } from "../../contexts/SerialContext";

export const EepromApp: React.FC = () => {
  const { connected, port, writeToSerial } = useSerial();

  const [i2cAddress, setI2cAddress] = useState("0x50");
  const [writeMemAddr, setWriteMemAddr] = useState("0x0000");
  const [writeData, setWriteData] = useState("");

  // Local State for this specific instance
  const [memoryData, setMemoryData] = useState<Uint8Array>(new Uint8Array());
  const [isDumping, setIsDumping] = useState(false);
  
  const isDumpingRef = useRef(false);
  const memoryBufferRef = useRef<number[]>([]);
  const dumpTimeoutRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSerialLine = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail;

      if (!isDumpingRef.current) return;

      if (text.includes("--- DUMPING DEVICE")) {
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
      } else {
        const match = text.match(/(0x[0-9A-Fa-f]{4}):\s*(.*)/);
        if (match) {
          const addr = parseInt(match[1], 16);
          const hexBytes = match[2].trim().split(/\s+/);
          const bytes = hexBytes
            .filter(h => h.length > 0)
            .map((h) => parseInt(h, 16))
            .filter((n) => !isNaN(n));
          
          while (memoryBufferRef.current.length < addr + bytes.length) {
            memoryBufferRef.current.push(0xFF);
          }
          
          for (let i = 0; i < bytes.length; i++) {
            memoryBufferRef.current[addr + i] = bytes[i];
          }
          
          setMemoryData(new Uint8Array(memoryBufferRef.current));
        }
      }
    };

    window.addEventListener('hw_serial_line', handleSerialLine);
    return () => window.removeEventListener('hw_serial_line', handleSerialLine);
  }, []);

  const fetchDump = () => {
    if (!connected || !port || !port.writable) return;
    
    isDumpingRef.current = true;
    setIsDumping(true);
    memoryBufferRef.current = [];
    setMemoryData(new Uint8Array());
    
    if (dumpTimeoutRef.current) clearTimeout(dumpTimeoutRef.current);
    dumpTimeoutRef.current = setTimeout(() => {
      if (isDumpingRef.current) {
        setIsDumping(false);
        isDumpingRef.current = false;
      }
    }, 15000);

    writeToSerial(`DUMP ${i2cAddress}\n`);
  };

  const handleEEPROMWrite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !port || !port.writable || !writeData.trim()) return;
    writeToSerial(`WRITE ${i2cAddress} ${writeMemAddr} ${writeData}\n`);
    setWriteData("");
  };

  const clearData = () => {
    setMemoryData(new Uint8Array());
  };

  const getEntropyColor = (b: number) => {
    if (b === 0x00) return "rgba(0, 0, 0, 0.8)";
    if (b === 0xff) return "rgba(255, 255, 255, 0.8)";
    if (b >= 32 && b <= 126) return "rgba(34, 197, 94, 0.8)";
    const hue = 240 - (b / 255) * 240;
    return `hsla(${hue}, 80%, 60%, 0.6)`;
  };

  const renderMemoryViewer = () => {
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
      const hexStr = hexParts.join(" ");

      const asciiStr = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");

      rows.push(
        <div
          key={i}
          className="flex gap-8 hover:bg-hw-blue/10 px-2 py-0.5 w-max items-center"
        >
          <span className="text-hw-blue/50 w-16 shrink-0">
            0x{i.toString(16).padStart(4, "0").toUpperCase()}
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
    <div className="flex flex-col h-full bg-black/60">
      <div className="hw-panel-header shrink-0 flex justify-between items-center border-b border-hw-blue/20">
        <div className="flex items-center gap-4">
          <span>EEPROM_MEMORY_MAP</span>
          <div className="flex items-center gap-2 border-l border-hw-blue/20 pl-4">
            <button
              onClick={() => {
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
              className="text-hw-blue/40 hover:text-hw-blue transition-colors text-[9px] uppercase tracking-widest"
            >
              TOP
            </button>
            <button
              onClick={() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }}
              className="text-hw-blue/40 hover:text-hw-blue transition-colors text-[9px] uppercase tracking-widest"
            >
              BOTTOM
            </button>
            <button
              onClick={clearData}
              className="text-hw-blue/40 hover:text-red-500 transition-colors text-[9px] uppercase tracking-widest ml-2"
            >
              CLEAR
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-hw-blue/40 uppercase">I2C Addr:</span>
            <input
              type="text"
              value={i2cAddress}
              onChange={(e) => setI2cAddress(e.target.value)}
              className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-[10px] font-mono text-hw-blue outline-none focus:border-hw-blue w-16 text-center"
            />
          </div>
          <button
            onClick={fetchDump}
            disabled={!connected || isDumping}
            className="hw-button px-3 py-1 text-[9px] flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowDownToLine className="w-3 h-3" />
            FETCH DUMP
          </button>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-hw-blue/80 custom-scrollbar">
        {renderMemoryViewer()}
      </div>
      
      <div className="p-3 border-t border-hw-blue/20 bg-black/40 shrink-0">
        <form onSubmit={handleEEPROMWrite} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-bold text-hw-blue/40 uppercase">Addr</label>
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
              placeholder="Hex bytes (e.g. DE AD BE EF) or ASCII string"
              className="flex-1 bg-transparent border border-hw-blue/20 px-2 py-1 text-[10px] font-mono text-hw-blue outline-none focus:border-hw-blue"
              disabled={!connected}
            />
          </div>
          <button
            type="submit"
            disabled={!connected || !writeData.trim()}
            className="hw-button px-4 py-1 text-[10px] flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowUpToLine className="w-3 h-3" />
            WRITE
          </button>
        </form>
      </div>
    </div>
  );
};
