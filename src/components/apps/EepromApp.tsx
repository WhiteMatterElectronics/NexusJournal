import React, { useState, useEffect, useRef } from "react";
import { Database, ArrowDownToLine, ArrowUpToLine, Download, HardDrive, Folder, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSerial } from "../../contexts/SerialContext";
import { SerialConnectionSelector } from "../common/SerialConnectionSelector";

export const EepromApp: React.FC<{ connectionId?: string }> = ({ connectionId: initialConnId }) => {
  const [selectedConnId, setSelectedConnId] = useState(initialConnId || 'shared');
  const { connected, port, writeToSerial, allConnections } = useSerial(selectedConnId);

  const [i2cAddress, setI2cAddress] = useState("0x50");
  const [writeMemAddr, setWriteMemAddr] = useState("0x0000");
  const [writeData, setWriteData] = useState("");

  // Local State for this specific instance
  const [memoryData, setMemoryData] = useState<Uint8Array>(new Uint8Array());
  const [isDumping, setIsDumping] = useState(false);
  
  const [showVfsModal, setShowVfsModal] = useState(false);
  const [vfsFileName, setVfsFileName] = useState("");
  const [vfsFolders, setVfsFolders] = useState<{ id: string, name: string }[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("downloads");
  
  const isDumpingRef = useRef(false);
  const memoryBufferRef = useRef<number[]>([]);
  const dumpTimeoutRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSerialLine = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string, connectionId: string }>;
      const { text, connectionId } = customEvent.detail;

      if (connectionId !== selectedConnId) return;
      if (!isDumpingRef.current) return;

      if (text.includes("--- EEPROM DUMP")) {
        setIsDumping(true);
        memoryBufferRef.current = new Array(32768).fill(0xFF);
        setMemoryData(new Uint8Array(memoryBufferRef.current));
      } else if (text.includes("ERR: Connection lost")) {
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
          
          for (let i = 0; i < bytes.length; i++) {
            if (addr + i < memoryBufferRef.current.length) {
              memoryBufferRef.current[addr + i] = bytes[i];
            }
          }
          
          setMemoryData(new Uint8Array(memoryBufferRef.current));

          // If we reached the end of 32768 bytes (0x7FF0 is the last 16-byte block)
          if (addr >= 32752) {
            isDumpingRef.current = false;
            setIsDumping(false);
            if (dumpTimeoutRef.current) clearTimeout(dumpTimeoutRef.current);
          }
        }
      }
    };

    window.addEventListener('hw_serial_line', handleSerialLine);
    return () => window.removeEventListener('hw_serial_line', handleSerialLine);
  }, [selectedConnId]);

  const fetchDump = () => {
    if (!connected || !port || !port.writable) return;
    
    isDumpingRef.current = true;
    setIsDumping(true);
    // Initialize a full 32768-byte buffer with 0xFF
    memoryBufferRef.current = new Array(32768).fill(0xFF);
    setMemoryData(new Uint8Array(memoryBufferRef.current));
    
    if (dumpTimeoutRef.current) clearTimeout(dumpTimeoutRef.current);
    dumpTimeoutRef.current = setTimeout(() => {
      if (isDumpingRef.current) {
        setIsDumping(false);
        isDumpingRef.current = false;
      }
    }, 45000);

    writeToSerial(`EEPROM DUMP ${i2cAddress}\r\n`);
  };

  const handleEEPROMWrite = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!connected || !port || !port.writable || !writeData.trim()) return;
    writeToSerial(`EEPROM WRITE ${i2cAddress} ${writeMemAddr} ${writeData}\r\n`);
    setWriteData("");
  };

  const clearData = () => {
    setMemoryData(new Uint8Array());
  };

  const exportToPC = () => {
    if (memoryData.length === 0) return;
    const blob = new Blob([memoryData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eeprom_dump_0x${i2cAddress.replace('0x', '')}_${Date.now()}.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToVirtualFiles = () => {
    if (memoryData.length === 0) return;
    
    // Load virtual folders
    const savedItemsStr = localStorage.getItem('hw_os_fs');
    let loadedFolders = [];
    if (savedItemsStr) {
      try { 
        const parsed = JSON.parse(savedItemsStr);
        loadedFolders = parsed.filter((item: any) => item.type === 'folder');
      } catch (err) { }
    }
    
    if (loadedFolders.length === 0) {
      // Fallback defaults from MyFilesApp
      loadedFolders = [
        { id: 'root', name: 'Home' },
        { id: 'downloads', name: 'Downloads' },
        { id: 'documents', name: 'Documents' },
        { id: 'pictures', name: 'Pictures' },
      ];
    }
    
    setVfsFolders(loadedFolders);
    setVfsFileName(`eeprom_dump_0x${i2cAddress.replace('0x', '')}_${Date.now()}.bin`);
    setShowVfsModal(true);
  };

  const confirmVfsSave = () => {
    if (memoryData.length === 0 || !vfsFileName.trim()) return;
    const blob = new Blob([memoryData], { type: 'application/octet-stream' });
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const savedItemsStr = localStorage.getItem('hw_os_fs');
      let savedItems: any[] = [];
      try { savedItems = savedItemsStr ? JSON.parse(savedItemsStr) : []; } catch (err) { }
      
      const newItem = {
        id: crypto.randomUUID(),
        name: vfsFileName.endsWith('.bin') ? vfsFileName : `${vfsFileName}.bin`,
        type: 'file',
        extension: 'bin',
        content: dataUrl,
        parentId: selectedFolderId, 
        createdAt: Date.now(),
        size: memoryData.length,
        category: 'text' // Fallback category that Files app accepts
      };
      
      localStorage.setItem('hw_os_fs', JSON.stringify([...savedItems, newItem]));
      // Note: MyFilesApp listens to hw_os_fs_updated CustomEvent, not just StorageEvent globally via standard hooks usually
      window.dispatchEvent(new CustomEvent('hw_os_fs_updated', { detail: { sourceId: 'eeprom-vfs-save' } }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'hw_os_fs' }));
      setShowVfsModal(false);
    };
    reader.readAsDataURL(blob);
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
          <SerialConnectionSelector selectedConnId={selectedConnId} onSelect={setSelectedConnId} />
          <div className="h-4 w-px bg-hw-blue/20" />
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
          <div className="flex items-center gap-2 border-r border-hw-blue/20 pr-4">
            <button
              onClick={exportToPC}
              disabled={memoryData.length === 0}
              className="hw-button px-3 py-1 text-[9px] flex items-center gap-2 disabled:opacity-50"
              title="Download .bin to physical PC"
            >
              <Download className="w-3 h-3" />
              PC
            </button>
            <button
              onClick={exportToVirtualFiles}
              disabled={memoryData.length === 0}
              className="hw-button px-3 py-1 text-[9px] flex items-center gap-2 disabled:opacity-50"
              title="Save .bin to OS Virtual Files"
            >
              <HardDrive className="w-3 h-3" />
              VFS
            </button>
          </div>
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

      {showVfsModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-black/90 border border-hw-blue/40 w-full max-w-sm flex flex-col shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between p-2 border-b border-hw-blue/20 bg-hw-blue/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue flex items-center gap-2">
                <HardDrive className="w-3 h-3" /> Save to Virtual Files
              </span>
              <button 
                onClick={() => setShowVfsModal(false)}
                className="text-hw-blue/50 hover:text-hw-blue"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-hw-blue/50 uppercase tracking-widest">File Name</label>
                <input
                  type="text"
                  value={vfsFileName}
                  onChange={(e) => setVfsFileName(e.target.value)}
                  className="bg-black/40 border border-hw-blue/20 px-2 py-1.5 text-[11px] font-mono text-hw-blue outline-none focus:border-hw-blue"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-hw-blue/50 uppercase tracking-widest">Select Folder</label>
                <div className="flex flex-col border border-hw-blue/20 bg-black/40 max-h-40 overflow-y-auto custom-scrollbar">
                  {vfsFolders.map(folder => {
                    // Calculate visual depth roughly by counting parents (hacky but works for quick flat map)
                    let depth = 0;
                    let current: any = folder;
                    while (current && current.parentId !== null && current.parentId !== undefined && current.parentId !== 'root' && current.id !== 'root') {
                      depth++;
                      const parent = vfsFolders.find((f: any) => f.id === current.parentId);
                      if (parent) { current = parent; } else { break; }
                    }
                    
                    return (
                      <button
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-[11px] text-left hover:bg-hw-blue/10 transition-colors",
                          selectedFolderId === folder.id ? "bg-hw-blue/20 text-hw-blue" : "text-hw-blue/70"
                        )}
                        style={{ paddingLeft: `${0.75 + (depth * 1.25)}rem` }}
                      >
                        <Folder className="w-3 h-3 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-3 border-t border-hw-blue/20 bg-black/40">
              <button
                onClick={() => setShowVfsModal(false)}
                className="px-4 py-1.5 text-[10px] uppercase font-bold text-hw-blue/50 hover:text-hw-blue transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVfsSave}
                disabled={!vfsFileName.trim()}
                className="hw-button px-4 py-1.5 text-[10px] disabled:opacity-50"
              >
                SAVE BINARY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
