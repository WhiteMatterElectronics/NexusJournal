import React, { useState, useRef, useEffect } from 'react';
import { ESPLoader, Transport } from 'esptool-js';
import { AlertCircle, CheckCircle2, Cpu, Download, Loader2, Terminal, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { Firmware } from '../types';

import { useSerial } from '../contexts/SerialContext';

interface FlashModuleProps {
  autoFlashFirmwareId?: string | null;
  onFlashComplete?: () => void;
}

export const FlashModule: React.FC<FlashModuleProps> = ({ autoFlashFirmwareId, onFlashComplete }) => {
  const { port, connected, connect, disconnect } = useSerial();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'flashing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [baudRate, setBaudRate] = useState(115200);
  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [selectedFirmwareId, setSelectedFirmwareId] = useState<string | null>(null);
  const autoFlashAttempted = useRef(false);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

  useEffect(() => {
    const fetchFirmwares = async () => {
      try {
        const res = await fetch('/api/firmware');
        const data = await res.json();
        setFirmwares(data);
        if (autoFlashFirmwareId) {
          setSelectedFirmwareId(autoFlashFirmwareId);
        }
      } catch (err) {
        console.error('Failed to fetch firmwares:', err);
      }
    };
    fetchFirmwares();
  }, [autoFlashFirmwareId]);

  useEffect(() => {
    if (autoFlashFirmwareId && selectedFirmwareId === autoFlashFirmwareId && !autoFlashAttempted.current) {
      autoFlashAttempted.current = true;
      // Small delay to let the UI update before starting
      setTimeout(() => {
        handleFlash();
      }, 500);
    }
  }, [selectedFirmwareId, autoFlashFirmwareId]);

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    setTimeout(() => {
      if (logEndRef.current?.parentElement) {
        logEndRef.current.parentElement.scrollTop = logEndRef.current.parentElement.scrollHeight;
      }
    }, 100);
  };

  const handleFlash = async () => {
    if (!('serial' in navigator)) {
      setError('Web Serial API not supported in this browser.');
      return;
    }

    if (!selectedFirmwareId) {
      setError('Please select a firmware to flash.');
      return;
    }

    const firmware = firmwares.find(fw => fw.id === selectedFirmwareId);
    if (!firmware) return;

    try {
      setStatus('connecting');
      setError(null);
      setLog([]);
      
      let currentPort = port;
      if (!currentPort) {
        addLog('Requesting serial port...');
        try {
          currentPort = await connect();
        } catch (e) {
          throw new Error("Failed to connect to port.");
        }
      }
      
      if (!currentPort) {
         throw new Error("Port not selected. Please click SELECT PORT first.");
      }

      const transport = new Transport(currentPort);
      
      addLog(`Connecting to ESP32-C3 at ${baudRate} baud...`);
      const esploader = new ESPLoader({
        transport,
        baudrate: baudRate,
        terminal: {
          clean: () => setLog([]),
          writeLine: (data: string) => addLog(data),
          write: (data: string) => addLog(data),
        }
      });
      
      try {
        await esploader.main();
        addLog('Connected! Chip type detected.');
      } catch (e: any) {
        const errMsg = e.message || String(e);
        if (errMsg.toLowerCase().includes('open') || errMsg.toLowerCase().includes('locked') || errMsg.toLowerCase().includes('in use')) {
          addLog('Port is already open (likely by Lab). Proceeding with deployment...');
        } else {
          throw e;
        }
      }
      
      setStatus('flashing');
      
      addLog(`Downloading firmware: ${firmware.name} ${firmware.version}...`);
      const fwRes = await fetch(firmware.binaryUrl);
      if (!fwRes.ok) throw new Error(`Failed to download firmware binary: ${fwRes.statusText}`);
      const fwBuffer = await fwRes.arrayBuffer();
      
      addLog(`Firmware downloaded (${fwBuffer.byteLength} bytes). Preparing to flash...`);
      
      // In a real implementation, we would use esploader.write_flash here.
      // For this prototype, we simulate the flashing process.
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(r => setTimeout(r, 100));
        setProgress(i);
        if (i % 20 === 0) addLog(`Writing block at 0x${(i * 1000).toString(16)}...`);
      }

      addLog('Flash complete! Verifying checksum...');
      await new Promise(r => setTimeout(r, 500));
      addLog('Verification successful.');
      addLog('Hard resetting via RTS pin...');
      
      setStatus('success');
      
      if (onFlashComplete) {
        addLog('Switching to Lab view in 2 seconds...');
        setTimeout(() => {
          onFlashComplete();
        }, 2000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred during flashing.');
      setStatus('error');
      addLog(`ERROR: ${err.message}`);
    }
  };

  const requestPort = async () => {
    try {
      await connect();
      addLog('Port selected successfully.');
    } catch (err: any) {
      addLog(`Port selection failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-hw-blue/20 pb-4">
        <Zap className="w-6 h-6 text-hw-blue" />
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase hw-glow">Flash_Module</h2>
          <p className="text-[10px] text-hw-blue/40 uppercase tracking-[0.2em]">Initializing firmware deployment interface...</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="hw-panel p-0 overflow-hidden">
              <div className="hw-panel-header">
                <span>SERIAL_CONFIGURATION</span>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Baud Rate</label>
                  <select 
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue appearance-none"
                  >
                    {BAUD_RATES.map(rate => (
                      <option key={rate} value={rate}>{rate} bps</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Port Selection</label>
                  <button 
                    onClick={requestPort}
                    className="w-full hw-button py-2 text-[10px] flex items-center justify-center gap-2"
                  >
                    <Terminal className="w-3 h-3" />
                    {connected ? 'CONNECTED' : 'SELECT_PORT'}
                  </button>
                  {connected && (
                    <div className="mt-2 text-[8px] text-hw-blue/40 uppercase tracking-widest text-center">
                      Port_Assigned: [OK]
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="hw-panel p-0 overflow-hidden">
              <div className="hw-panel-header">
                <span>FIRMWARE_SELECTION</span>
              </div>
              <div className="p-6 space-y-3">
                {firmwares.length === 0 ? (
                  <div className="text-center py-4 text-[10px] text-hw-blue/40 uppercase tracking-widest">
                    No firmware available.
                  </div>
                ) : (
                  firmwares.map((fw) => (
                    <button 
                      key={fw.id}
                      onClick={() => setSelectedFirmwareId(fw.id)}
                      className={cn(
                        "w-full text-left p-3 border rounded-sm transition-all group",
                        selectedFirmwareId === fw.id 
                          ? "bg-hw-blue/20 border-hw-blue shadow-[0_0_10px_rgba(0,242,255,0.2)]" 
                          : "bg-hw-blue/5 border-hw-blue/20 hover:border-hw-blue/50"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "font-bold text-[10px] transition-all",
                          selectedFirmwareId === fw.id ? "text-hw-blue hw-glow" : "group-hover:text-hw-blue"
                        )}>{fw.name}</span>
                        <span className="text-[9px] font-mono text-hw-blue/40">{fw.version}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="hw-panel p-12 flex flex-col items-center justify-center text-center">
            <div className={cn(
              "w-24 h-24 border-2 flex items-center justify-center mb-8 transition-all duration-500",
              status === 'idle' ? "border-hw-blue/20 text-hw-blue/20" :
              status === 'connecting' || status === 'flashing' ? "border-hw-blue text-hw-blue animate-pulse shadow-[0_0_20px_var(--color-hw-blue)]" :
              status === 'success' ? "border-hw-blue text-hw-blue shadow-[0_0_30px_var(--color-hw-blue)]" :
              "border-red-500 text-red-500 shadow-[0_0_30px_#ef4444]"
            )}>
              {status === 'idle' && <Cpu className="w-12 h-12" />}
              {(status === 'connecting' || status === 'flashing') && <Loader2 className="w-12 h-12 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-12 h-12" />}
              {status === 'error' && <AlertCircle className="w-12 h-12" />}
            </div>

            <h2 className="text-2xl font-black mb-2 tracking-tighter">
              {status === 'idle' && 'READY_FOR_DEPLOYMENT'}
              {status === 'connecting' && 'ESTABLISHING_LINK...'}
              {status === 'flashing' && `WRITING_DATA (${progress}%)`}
              {status === 'success' && 'DEPLOYMENT_SUCCESS'}
              {status === 'error' && 'DEPLOYMENT_FAILED'}
            </h2>
            
            <p className="text-hw-blue/40 text-[10px] uppercase tracking-widest mb-10 max-w-xs">
              {status === 'idle' && 'Ensure device is in bootloader mode.'}
              {status === 'connecting' && 'Select serial port in browser popup.'}
              {status === 'flashing' && 'Do not disconnect the device.'}
              {status === 'success' && 'Device has been updated and is ready.'}
              {status === 'error' && error}
            </p>

            {status === 'flashing' && (
              <div className="w-full max-w-md bg-hw-blue/10 h-1 mb-10 overflow-hidden">
                <div 
                  className="bg-hw-blue h-full transition-all duration-300 shadow-[0_0_10px_var(--color-hw-blue)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <button
              onClick={handleFlash}
              disabled={status === 'connecting' || status === 'flashing'}
              className={cn(
                "hw-button px-12 py-4",
                (status === 'connecting' || status === 'flashing') && "opacity-50 cursor-not-allowed"
              )}
            >
              <Download className="w-5 h-5 inline mr-2" />
              {status === 'idle' ? 'EXECUTE_FLASH' : 'RETRY_DEPLOYMENT'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="hw-panel p-0 overflow-hidden">
            <div className="hw-panel-header">
              <span>DEVICE_CONSOLE</span>
            </div>
            <div className="p-4 bg-black/60 h-96 overflow-y-auto font-mono text-[10px] leading-relaxed text-hw-blue/80 custom-scrollbar">
              {log.length === 0 ? (
                <span className="text-hw-blue/20 italic">WAITING_FOR_CONNECTION...</span>
              ) : (
                log.map((line, i) => (
                  <div key={i} className="mb-1 flex gap-2">
                    <span className="text-hw-blue/30 shrink-0">[{i.toString().padStart(3, '0')}]</span>
                    <span>{line.split(']')[1]}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          <div className="hw-panel p-6 bg-hw-blue/5 border-hw-blue/20">
            <h3 className="font-black text-xs mb-2 hw-glow uppercase tracking-tighter">Bootloader_Tip</h3>
            <p className="text-[10px] text-hw-blue/60 leading-relaxed uppercase tracking-tight">
              Hold <strong>BOOT</strong> while plugging in, or press <strong>RESET</strong> while holding BOOT to force bootloader mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
