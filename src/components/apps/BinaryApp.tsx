import React, { useRef, useState, useEffect } from "react";
import { BinaryAnalysis } from "../BinaryAnalysis";
import { useSerial } from "../../contexts/SerialContext";
import { cn } from "../../lib/utils";

export const BinaryApp: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Local State for this specific instance
  const [memoryData, setMemoryData] = useState<Uint8Array>(new Uint8Array());
  const [isCapturing, setIsCapturing] = useState(false);
  const isDumpingRef = useRef(false);
  const memoryBufferRef = useRef<number[]>([]);
  const dumpTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleSerialLine = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail;

      if (text.includes("--- EEPROM DUMP") && isCapturing) {
        isDumpingRef.current = true;
        memoryBufferRef.current = [];
        setMemoryData(new Uint8Array());
      } else if (text.includes("ERR: Connection lost")) {
        isDumpingRef.current = false;
        if (dumpTimeoutRef.current) clearTimeout(dumpTimeoutRef.current);
      } else if (isDumpingRef.current && isCapturing) {
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

          if (addr >= 4080) {
            isDumpingRef.current = false;
            if (dumpTimeoutRef.current) clearTimeout(dumpTimeoutRef.current);
          }
        }
      }
    };

    window.addEventListener('hw_serial_line', handleSerialLine);
    return () => window.removeEventListener('hw_serial_line', handleSerialLine);
  }, []);

  return (
    <div className="flex flex-col h-full bg-black/60">
      <div className="hw-panel-header shrink-0 flex justify-between items-center border-b border-hw-blue/20">
        <div className="flex items-center gap-4">
          <span>BINARY_ANALYSIS_TOOL</span>
          <div className="flex items-center gap-2 border-l border-hw-blue/20 pl-4">
            <button
              onClick={() => setIsCapturing(!isCapturing)}
              className={cn(
                "px-3 py-0.5 rounded-sm text-[9px] uppercase tracking-widest transition-all",
                isCapturing 
                  ? "bg-hw-blue text-black font-bold shadow-[0_0_10px_rgba(0,242,255,0.5)]" 
                  : "bg-hw-blue/10 text-hw-blue/60 hover:bg-hw-blue/20"
              )}
            >
              {isCapturing ? "CAPTURING..." : "START CAPTURE"}
            </button>
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
              onClick={() => setMemoryData(new Uint8Array())}
              className="text-hw-blue/40 hover:text-red-500 transition-colors text-[9px] uppercase tracking-widest ml-2"
            >
              CLEAR
            </button>
          </div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <BinaryAnalysis data={memoryData} />
      </div>
    </div>
  );
};
