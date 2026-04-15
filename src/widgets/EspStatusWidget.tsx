import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Wifi, Clock, Database, RefreshCw } from 'lucide-react';
import { useSerial } from '../contexts/SerialContext';
import { cn } from '../lib/utils';

interface EspStatus {
  chipModel: string;
  cores: string;
  cpuFreq: string;
  flashSize: string;
  totalHeap: string;
  freeHeap: string;
  bleActive: string;
  wifiMode: string;
}

export const EspStatusWidget: React.FC<any> = ({ mainColor }) => {
  const { connected, writeToSerial } = useSerial();
  const [status, setStatus] = useState<EspStatus>({
    chipModel: 'N/A',
    cores: 'N/A',
    cpuFreq: 'N/A',
    flashSize: 'N/A',
    totalHeap: 'N/A',
    freeHeap: 'N/A',
    bleActive: 'N/A',
    wifiMode: 'N/A'
  });
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

      if (text.match(/Chip Model:/i)) {
        setStatus(s => ({ ...s, chipModel: text.split(/Chip Model:/i)[1].trim() }));
      } else if (text.match(/Cores:/i)) {
        setStatus(s => ({ ...s, cores: text.split(/Cores:/i)[1].trim() }));
      } else if (text.match(/CPU Freq:/i)) {
        setStatus(s => ({ ...s, cpuFreq: text.split(/CPU Freq:/i)[1].trim() }));
      } else if (text.match(/Flash Size:/i)) {
        setStatus(s => ({ ...s, flashSize: text.split(/Flash Size:/i)[1].trim() }));
      } else if (text.match(/Total Heap:/i)) {
        setStatus(s => ({ ...s, totalHeap: text.split(/Total Heap:/i)[1].trim() }));
      } else if (text.match(/Free Heap:/i)) {
        setStatus(s => ({ ...s, freeHeap: text.split(/Free Heap:/i)[1].trim() }));
      } else if (text.match(/BLE Active:/i)) {
        setStatus(s => ({ ...s, bleActive: text.split(/BLE Active:/i)[1].trim() }));
      } else if (text.match(/WiFi Mode:/i)) {
        setStatus(s => ({ ...s, wifiMode: text.split(/WiFi Mode:/i)[1].trim() }));
        setIsRefreshing(false); // Last line of the report
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
            <Cpu style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} />
            <span className="uppercase font-bold" style={{ fontSize: 'max(5px, 4cqmin)' }}>Hardware</span>
          </div>
          <span className="font-mono truncate" style={{ fontSize: 'max(6px, 5cqmin)' }}>{status.chipModel}</span>
          <span className="opacity-60 font-mono" style={{ fontSize: 'max(5px, 4cqmin)' }}>{status.cpuFreq}</span>
        </div>

        <div className="bg-white/5 p-2 rounded flex flex-col gap-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <Database style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} />
            <span className="uppercase font-bold" style={{ fontSize: 'max(5px, 4cqmin)' }}>Memory</span>
          </div>
          <span className="font-mono truncate" style={{ fontSize: 'max(6px, 5cqmin)' }}>{status.freeHeap} Free</span>
          <span className="opacity-60 font-mono" style={{ fontSize: 'max(5px, 4cqmin)' }}>{status.totalHeap} Total</span>
        </div>

        <div className="bg-white/5 p-2 rounded flex flex-col gap-1 col-span-2">
          <div className="flex items-center gap-1.5 opacity-40">
            <Wifi style={{ width: 'max(6px, 5cqmin)', height: 'max(6px, 5cqmin)' }} />
            <span className="uppercase font-bold" style={{ fontSize: 'max(5px, 4cqmin)' }}>Connectivity</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono truncate" style={{ fontSize: 'max(6px, 5cqmin)' }}>BLE: {status.bleActive}</span>
            <span className="opacity-60 font-mono" style={{ fontSize: 'max(5px, 4cqmin)' }}>WiFi: {status.wifiMode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
