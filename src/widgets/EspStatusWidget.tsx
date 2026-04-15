import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Wifi, Clock, Database, RefreshCw } from 'lucide-react';
import { useSerial } from '../contexts/SerialContext';
import { cn } from '../lib/utils';

interface EspStatus {
  ip: string;
  rssi: string;
  uptime: string;
  heap: string;
  chip: string;
  version: string;
}

export const EspStatusWidget: React.FC<any> = ({ mainColor }) => {
  const { connected, writeToSerial } = useSerial();
  const [status, setStatus] = useState<EspStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  const fetchStatus = async () => {
    if (!connected) return;
    setIsRefreshing(true);
    await writeToSerial("STATUS\n");
    lastUpdateRef.current = Date.now();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    const handleSerialLine = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail;

      if (text.includes("[STATUS]")) {
        // Parse status line: [STATUS] IP:192.168.1.1 RSSI:-45 Uptime:123s Heap:120000 Chip:ESP32 Version:1.0.0
        const ip = text.match(/IP:([^\s]+)/)?.[1] || "N/A";
        const rssi = text.match(/RSSI:([^\s]+)/)?.[1] || "N/A";
        const uptime = text.match(/Uptime:([^\s]+)/)?.[1] || "N/A";
        const heap = text.match(/Heap:([^\s]+)/)?.[1] || "N/A";
        const chip = text.match(/Chip:([^\s]+)/)?.[1] || "ESP32";
        const version = text.match(/Version:([^\s]+)/)?.[1] || "1.0.0";

        setStatus({ ip, rssi, uptime, heap, chip, version });
        setIsRefreshing(false);
      }
    };

    window.addEventListener('hw_serial_line', handleSerialLine);
    
    // Auto refresh every 30 seconds if connected
    const interval = setInterval(() => {
      if (connected && Date.now() - lastUpdateRef.current > 25000) {
        fetchStatus();
      }
    }, 30000);

    if (connected) fetchStatus();

    return () => {
      window.removeEventListener('hw_serial_line', handleSerialLine);
      clearInterval(interval);
    };
  }, [connected]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
        <Cpu style={{ color: mainColor, width: 'max(16px, 15cqmin)', height: 'max(16px, 15cqmin)' }} className="opacity-20" />
        <span className="font-bold uppercase tracking-widest opacity-40" style={{ fontSize: 'max(8px, 6cqmin)' }}>ESP32 Offline</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2" style={{ padding: 'max(8px, 5cqmin)' }}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Cpu style={{ color: mainColor, width: 'max(10px, 8cqmin)', height: 'max(10px, 8cqmin)' }} />
          <span className="font-bold uppercase tracking-widest opacity-80" style={{ fontSize: 'max(6px, 6cqmin)' }}>ESP32_STATUS</span>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={isRefreshing}
          className={cn(
            "p-1 hover:bg-white/10 rounded transition-all",
            isRefreshing && "animate-spin"
          )}
        >
          <RefreshCw style={{ color: mainColor, width: 'max(8px, 6cqmin)', height: 'max(8px, 6cqmin)' }} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Wifi style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} />
            <span className="uppercase font-bold" style={{ fontSize: 'max(5px, 4cqmin)' }}>Network</span>
          </div>
          <span className="font-mono truncate" style={{ fontSize: 'max(6px, 5cqmin)' }}>{status?.ip || "..."}</span>
          <span className="opacity-60 font-mono" style={{ fontSize: 'max(5px, 4cqmin)' }}>{status?.rssi ? `${status.rssi} dBm` : "..."}</span>
        </div>

        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Clock style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} />
            <span className="uppercase font-bold" style={{ fontSize: 'max(5px, 4cqmin)' }}>Uptime</span>
          </div>
          <span className="font-mono truncate" style={{ fontSize: 'max(6px, 5cqmin)' }}>{status?.uptime || "..."}</span>
        </div>

        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Database style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} />
            <span className="uppercase font-bold" style={{ fontSize: 'max(5px, 4cqmin)' }}>Memory</span>
          </div>
          <span className="font-mono truncate" style={{ fontSize: 'max(6px, 5cqmin)' }}>{status?.heap || "..."}</span>
          <span className="opacity-60 font-mono uppercase" style={{ fontSize: 'max(5px, 4cqmin)' }}>Free Heap</span>
        </div>

        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Cpu style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} />
            <span className="uppercase font-bold" style={{ fontSize: 'max(5px, 4cqmin)' }}>System</span>
          </div>
          <span className="font-mono truncate" style={{ fontSize: 'max(6px, 5cqmin)' }}>{status?.chip || "..."}</span>
          <span className="opacity-60 font-mono uppercase" style={{ fontSize: 'max(5px, 4cqmin)' }}>v{status?.version || "1.0.0"}</span>
        </div>
      </div>
    </div>
  );
};
