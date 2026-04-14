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
        <Cpu className="w-8 h-8 opacity-20" style={{ color: mainColor }} />
        <span className="text-[10px] uppercase tracking-widest opacity-40">ESP32 Offline</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5" style={{ color: mainColor }} />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">ESP32_STATUS</span>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={isRefreshing}
          className={cn(
            "p-1 hover:bg-white/10 rounded transition-all",
            isRefreshing && "animate-spin"
          )}
        >
          <RefreshCw className="w-3 h-3" style={{ color: mainColor }} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Wifi className="w-2.5 h-2.5" />
            <span className="text-[8px] uppercase font-bold">Network</span>
          </div>
          <span className="text-[10px] font-mono truncate">{status?.ip || "..."}</span>
          <span className="text-[8px] opacity-60 font-mono">{status?.rssi ? `${status.rssi} dBm` : "..."}</span>
        </div>

        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Clock className="w-2.5 h-2.5" />
            <span className="text-[8px] uppercase font-bold">Uptime</span>
          </div>
          <span className="text-[10px] font-mono truncate">{status?.uptime || "..."}</span>
        </div>

        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Database className="w-2.5 h-2.5" />
            <span className="text-[8px] uppercase font-bold">Memory</span>
          </div>
          <span className="text-[10px] font-mono truncate">{status?.heap || "..."}</span>
          <span className="text-[8px] opacity-60 font-mono uppercase">Free Heap</span>
        </div>

        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Cpu className="w-2.5 h-2.5" />
            <span className="text-[8px] uppercase font-bold">System</span>
          </div>
          <span className="text-[10px] font-mono truncate">{status?.chip || "..."}</span>
          <span className="text-[8px] opacity-60 font-mono uppercase">v{status?.version || "1.0.0"}</span>
        </div>
      </div>
    </div>
  );
};
