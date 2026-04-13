import React, { useState, useEffect, useRef } from "react";
import { Database, Radio, Edit3 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSerial } from "../../contexts/SerialContext";

export const RfidApp: React.FC = () => {
  const { connected, port, writeToSerial } = useSerial();

  const [rfidSector, setRfidSector] = useState("0");
  const [rfidWriteBlock, setRfidWriteBlock] = useState("0");
  const [rfidWriteData, setRfidWriteData] = useState("");

  // Local State for this specific instance
  const [rfidData, setRfidData] = useState<Uint8Array>(new Uint8Array(1024));
  const [rfidBlocksRead, setRfidBlocksRead] = useState<Set<number>>(new Set());
  const [isRfidScanning, setIsRfidScanning] = useState(false);
  const [rfidStatus, setRfidStatus] = useState("");
  
  const isScanningRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSerialLine = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail;

      if (!isScanningRef.current) return;

      if (text.includes("SCAN_CARD_NOW")) {
        setIsRfidScanning(true);
        setRfidStatus("Please scan your RFID card...");
      } else if (text.includes("TIMEOUT")) {
        setIsRfidScanning(false);
        isScanningRef.current = false;
        setRfidStatus("Timeout: No card detected.");
      } else if (text.startsWith("BLOCK:")) {
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
        isScanningRef.current = false;
        setRfidStatus("Write successful!");
      } else if (text.includes("WRITE_FAILED")) {
        setIsRfidScanning(false);
        isScanningRef.current = false;
        setRfidStatus("Write failed.");
      } else if (text.includes("ERR:HEX_LEN_32_REQ")) {
        setIsRfidScanning(false);
        isScanningRef.current = false;
        setRfidStatus("Error: Data must be exactly 32 hex characters (16 bytes).");
      } else if (text.includes("DUMP_COMPLETE") || text.includes("READ_COMPLETE") || (text.includes("Auth Error") && isScanningRef.current)) {
         // Fallback to stop scanning if we see common completion or error markers
         setTimeout(() => {
           if (isScanningRef.current) {
             setIsRfidScanning(false);
             isScanningRef.current = false;
             setRfidStatus("Operation finished.");
           }
         }, 1000);
      }
    };

    window.addEventListener('hw_serial_line', handleSerialLine);
    return () => window.removeEventListener('hw_serial_line', handleSerialLine);
  }, []);

  const handleRfidDump = () => {
    if (!connected || !port || !port.writable) return;
    setRfidData(new Uint8Array(1024));
    setRfidBlocksRead(new Set());
    setRfidStatus("Initiating dump...");
    setIsRfidScanning(true);
    isScanningRef.current = true;
    writeToSerial("DUMP\n");
    
    // Auto timeout to release lock
    setTimeout(() => {
      if (isScanningRef.current) {
        setIsRfidScanning(false);
        isScanningRef.current = false;
        setRfidStatus("Dump finished or timed out.");
      }
    }, 10000);
  };

  const clearData = () => {
    setRfidData(new Uint8Array(1024));
    setRfidBlocksRead(new Set());
    setRfidStatus("");
  };

  const handleRfidRead = () => {
    if (!connected || !port || !port.writable) return;
    setRfidStatus(`Initiating read for sector ${rfidSector}...`);
    setIsRfidScanning(true);
    isScanningRef.current = true;
    writeToSerial(`READ ${rfidSector}\n`);
    
    setTimeout(() => {
      if (isScanningRef.current) {
        setIsRfidScanning(false);
        isScanningRef.current = false;
        setRfidStatus("Read finished or timed out.");
      }
    }, 5000);
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

    if (finalHexData.startsWith('"') && finalHexData.endsWith('"')) {
      const text = finalHexData.slice(1, -1);
      let hex = "";
      for (let i = 0; i < text.length && i < 16; i++) {
        hex += text.charCodeAt(i).toString(16).padStart(2, "0").toUpperCase();
      }
      while (hex.length < 32) {
        hex += "00";
      }
      finalHexData = hex;
    } else {
      finalHexData = finalHexData.replace(/0x/gi, "").replace(/\s+/g, "").toUpperCase();
      while (finalHexData.length < 32) {
        finalHexData += "00";
      }
      finalHexData = finalHexData.substring(0, 32);
    }

    setRfidStatus(`Initiating write to block ${blockNum}...`);
    setIsRfidScanning(true);
    isScanningRef.current = true;
    writeToSerial(`WRITE ${blockNum} ${finalHexData}\n`);
    
    setTimeout(() => {
      if (isScanningRef.current) {
        setIsRfidScanning(false);
        isScanningRef.current = false;
        setRfidStatus("Write finished or timed out.");
      }
    }, 5000);
  };

  const getEntropyColor = (b: number) => {
    if (b === 0x00) return "rgba(0, 0, 0, 0.8)";
    if (b === 0xff) return "rgba(255, 255, 255, 0.8)";
    if (b >= 32 && b <= 126) return "rgba(34, 197, 94, 0.8)";
    const hue = 240 - (b / 255) * 240;
    return `hsla(${hue}, 80%, 60%, 0.6)`;
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
    <div className="flex flex-col h-full bg-black/60">
      <div className="hw-panel-header shrink-0 flex justify-between items-center border-b border-hw-blue/20">
        <div className="flex items-center gap-4">
          <span>RFID_MEMORY_MAP</span>
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
      
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-hw-blue/80 custom-scrollbar">
        {renderRfidViewer()}
      </div>
      
      <div className="p-3 border-t border-hw-blue/20 bg-black/40 shrink-0">
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
  );
};
