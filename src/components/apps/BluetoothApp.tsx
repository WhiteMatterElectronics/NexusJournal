import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bluetooth, Search, BluetoothConnected, BluetoothOff, ChevronDown, ChevronRight, Activity, Terminal, Send, Trash2, RefreshCw, Info, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useSerial } from "../../contexts/SerialContext";

interface BleDevice {
  address: string;
  name: string;
  rssi: number;
  lastSeen: number;
}

interface BleCharacteristic {
  uuid: string;
  properties: string[];
  value?: string;
  isNotifying: boolean;
}

interface BleService {
  uuid: string;
  characteristics: BleCharacteristic[];
  isExpanded: boolean;
}

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'error' | 'success' | 'data' | 'sent';
  message: string;
}

export const BluetoothApp: React.FC = () => {
  const { connected, port, writeToSerial } = useSerial();
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BleDevice | null>(null);
  const [services, setServices] = useState<BleService[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'explorer' | 'console'>('explorer');
  const [writeValues, setWriteValues] = useState<Record<string, string>>({});
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const lastReadUuidRef = useRef<string | null>(null);
  const pendingConnectionAddressRef = useRef<string | null>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        type,
        message
      }
    ].slice(-100));
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    const handleSerialLine = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail;

      if (text.includes("[BLE]") || text.includes("[BLE-NOTIFY]")) {
        if (text.includes("Starting 5s scan")) {
          setIsScanning(true);
          setDevices([]);
          addLog('info', 'Started BLE scan...');
        } else if (text.includes("Scan Ended") || text.includes("Scan routine finished")) {
          setIsScanning(false);
          addLog('info', 'BLE scan stopped.');
        } else if (text.includes("Device: ")) {
          // Extract address, name, rssi from NimBLE toString() format
          const addressMatch = text.match(/Address:\s*([0-9a-fA-F:]+)/i);
          const nameMatch = text.match(/Name:\s*([^,]+)/i);
          const rssiMatch = text.match(/RSSI:\s*(-?\d+)/i) || text.match(/rssi:\s*(-?\d+)/i);
          
          if (addressMatch) {
            const address = addressMatch[1];
            const name = nameMatch && nameMatch[1].trim() !== "" ? nameMatch[1].trim() : "Unknown Device";
            const rssi = rssiMatch ? parseInt(rssiMatch[1], 10) : -100;
            
            setDevices(prev => {
              const existing = prev.find(d => d.address === address);
              if (existing) {
                return prev.map(d => d.address === address ? { ...d, rssi, lastSeen: Date.now(), name: name !== "Unknown Device" ? name : d.name } : d);
              }
              return [...prev, { address, name, rssi, lastSeen: Date.now() }];
            });
          }
        } else if (text.includes("Success! Exploring services") || text.includes("Connected to Server")) {
          const address = pendingConnectionAddressRef.current || "Unknown";
          const device = devices.find(d => d.address === address);
          setConnectedDevice(device || { address, name: "Connected Device", rssi: 0, lastSeen: Date.now() });
          addLog('success', `Connected to ${address}`);
        } else if (text.includes("Connection Failed")) {
          addLog('error', `Failed to connect`);
          setConnectedDevice(null);
          pendingConnectionAddressRef.current = null;
        } else if (text.includes("Disconnected")) {
          addLog('info', 'Device disconnected.');
          setConnectedDevice(null);
          setServices([]);
        } else if (text.includes("Service: ")) {
          const uuidMatch = text.match(/Service:\s*([a-zA-Z0-9-]+)/);
          if (uuidMatch) {
            const uuid = uuidMatch[1];
            setServices(prev => {
              if (prev.find(s => s.uuid === uuid)) return prev;
              return [...prev, { uuid, characteristics: [], isExpanded: false }];
            });
          }
        } else if (text.includes("- Char: ")) {
          const charMatch = text.match(/- Char:\s*([a-zA-Z0-9-]+)\s*\[(.*?)\]/);
          if (charMatch) {
            const charUuid = charMatch[1];
            const propsStr = charMatch[2];
            const props = [];
            if (propsStr.includes("R")) props.push("READ");
            if (propsStr.includes("W")) props.push("WRITE");
            if (propsStr.includes("N")) props.push("NOTIFY");
            
            setServices(prev => {
              const lastService = prev[prev.length - 1];
              if (!lastService) return prev;
              if (lastService.characteristics.find(c => c.uuid === charUuid)) return prev;
              // Firmware auto-subscribes to notifications if 'N' is present
              const newChar: BleCharacteristic = { uuid: charUuid, properties: props, isNotifying: props.includes("NOTIFY") };
              return prev.map((s, idx) => idx === prev.length - 1 ? { ...s, characteristics: [...s.characteristics, newChar] } : s);
            });
          }
        } else if (text.includes("[BLE-READ] Hex:")) {
          const hexMatch = text.match(/Hex:\s*([a-zA-Z0-9]+)/);
          if (hexMatch && lastReadUuidRef.current) {
            const hexData = hexMatch[1];
            const charUuid = lastReadUuidRef.current;
            addLog('data', `[${charUuid}] READ: ${hexData}`);
            setServices(prev => prev.map(s => ({
              ...s,
              characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, value: hexData } : c)
            })));
          }
        } else if (text.includes("[BLE-NOTIFY]")) {
          const parts = text.replace("[BLE-NOTIFY]", "").trim().split(":");
          if (parts.length >= 2) {
            const charUuid = parts[0].trim();
            const hexData = parts[1].trim();
            addLog('data', `[${charUuid}] NOTIFY: ${hexData}`);
            setServices(prev => prev.map(s => ({
              ...s,
              characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, value: hexData } : c)
            })));
          }
        }
      }
    };

    window.addEventListener('hw_serial_line', handleSerialLine);
    return () => window.removeEventListener('hw_serial_line', handleSerialLine);
  }, [devices, addLog]);

  const startScan = () => {
    if (!connected) return;
    writeToSerial("BLE SCAN\n");
  };

  const stopScan = () => {
    if (!connected) return;
    // Firmware doesn't have a stop scan command, it scans for 5s automatically.
    // We'll just update UI state if they click it.
    setIsScanning(false);
  };

  const connectDevice = (address: string) => {
    if (!connected) return;
    addLog('info', `Connecting to ${address}...`);
    pendingConnectionAddressRef.current = address;
    writeToSerial(`BLE CONNECT ${address}\n`);
  };

  const disconnectDevice = () => {
    if (!connected) return;
    writeToSerial("BLE DISCONNECT\n");
  };

  const readChar = (uuid: string) => {
    if (!connected) return;
    lastReadUuidRef.current = uuid;
    addLog('sent', `Reading characteristic ${uuid}...`);
    writeToSerial(`BLE READ ${uuid}\n`);
  };

  const writeChar = (uuid: string) => {
    if (!connected) return;
    const value = writeValues[uuid];
    if (!value) return;
    addLog('sent', `Writing to ${uuid}: ${value}`);
    writeToSerial(`BLE WRITE ${uuid} ${value}\n`);
  };

  const toggleNotify = (uuid: string, current: boolean) => {
    // Firmware auto-subscribes. We don't need to send a command.
    addLog('info', `Firmware automatically manages subscriptions.`);
  };

  const toggleService = (uuid: string) => {
    setServices(prev => prev.map(s => s.uuid === uuid ? { ...s, isExpanded: !s.isExpanded } : s));
  };

  return (
    <div className="flex flex-col h-full bg-black/80 font-mono text-hw-blue">
      {/* Header */}
      <div className="hw-panel-header shrink-0 flex justify-between items-center border-b border-hw-blue/20 px-4 py-2">
        <div className="flex items-center gap-4">
          <Bluetooth className={cn("w-5 h-5", connectedDevice ? "text-hw-blue animate-pulse" : "text-hw-blue/40")} />
          <span className="text-xs font-bold tracking-widest uppercase">BLE_COMMANDER_V1.0</span>
          {connectedDevice && (
            <div className="flex items-center gap-2 px-3 py-1 bg-hw-blue/10 border border-hw-blue/30 rounded-full">
              <BluetoothConnected className="w-3 h-3" />
              <span className="text-[10px] font-bold">{connectedDevice.name} ({connectedDevice.address})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('explorer')}
            className={cn("px-3 py-1 text-[10px] uppercase tracking-widest transition-all", activeTab === 'explorer' ? "bg-hw-blue text-black font-bold" : "text-hw-blue/60 hover:text-hw-blue")}
          >
            Explorer
          </button>
          <button 
            onClick={() => setActiveTab('console')}
            className={cn("px-3 py-1 text-[10px] uppercase tracking-widest transition-all", activeTab === 'console' ? "bg-hw-blue text-black font-bold" : "text-hw-blue/60 hover:text-hw-blue")}
          >
            Console
          </button>
          <div className="w-px h-4 bg-hw-blue/20 mx-2" />
          {!connectedDevice ? (
            <button 
              onClick={isScanning ? stopScan : startScan}
              disabled={!connected}
              className={cn("hw-button px-4 py-1 text-[10px] flex items-center gap-2", isScanning && "animate-pulse")}
            >
              {isScanning ? <BluetoothOff className="w-3 h-3" /> : <Search className="w-3 h-3" />}
              {isScanning ? "STOP SCAN" : "SCAN DEVICES"}
            </button>
          ) : (
            <button 
              onClick={disconnectDevice}
              className="hw-button px-4 py-1 text-[10px] border-red-500/50 text-red-500 hover:bg-red-500/10 flex items-center gap-2"
            >
              <BluetoothOff className="w-3 h-3" />
              DISCONNECT
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Device List */}
        {!connectedDevice && (
          <div className="w-72 border-r border-hw-blue/10 flex flex-col bg-black/40">
            <div className="p-3 border-b border-hw-blue/10 flex justify-between items-center bg-hw-blue/5">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Discovered Devices</span>
              <span className="text-[9px] px-2 py-0.5 bg-hw-blue/20 rounded-full">{devices.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              <AnimatePresence>
                {devices.length === 0 && !isScanning && (
                  <div className="text-[10px] text-hw-blue/30 text-center py-10 italic">
                    No devices found.<br/>Click SCAN to begin.
                  </div>
                )}
                {devices.sort((a, b) => b.rssi - a.rssi).map(device => (
                  <motion.div
                    key={device.address}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => connectDevice(device.address)}
                    className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg hover:bg-hw-blue/15 hover:border-hw-blue/30 cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[11px] font-bold truncate pr-2">{device.name}</span>
                      <span className={cn("text-[9px] font-mono", device.rssi > -60 ? "text-green-500" : device.rssi > -80 ? "text-yellow-500" : "text-red-500")}>
                        {device.rssi} dBm
                      </span>
                    </div>
                    <div className="text-[9px] opacity-40 font-mono mb-2">{device.address}</div>
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] bg-hw-blue/20 px-2 py-0.5 rounded uppercase tracking-tighter">Connect</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'explorer' ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {!connectedDevice ? (
                <div className="h-full flex flex-col items-center justify-center text-hw-blue/20 space-y-4">
                  <Bluetooth className="w-16 h-16 opacity-10" />
                  <p className="text-sm tracking-widest uppercase">Select a device to explore services</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <Database className="w-6 h-6 text-hw-blue" />
                      <h2 className="text-lg font-bold tracking-[0.2em] uppercase">Service Explorer</h2>
                    </div>
                  </div>

                  {services.length === 0 && (
                    <div className="flex flex-col items-center py-20 bg-hw-blue/5 rounded-xl border border-dashed border-hw-blue/20">
                      <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-40" />
                      <p className="text-xs uppercase tracking-widest opacity-40">Discovering Services...</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {services.map(service => (
                      <div key={service.uuid} className="bg-hw-blue/5 border border-hw-blue/10 rounded-xl overflow-hidden">
                        <button 
                          onClick={() => toggleService(service.uuid)}
                          className="w-full flex items-center justify-between p-4 hover:bg-hw-blue/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {service.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <div className="text-left">
                              <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Service UUID</div>
                              <div className="text-xs font-mono font-bold">{service.uuid}</div>
                            </div>
                          </div>
                          <div className="text-[9px] px-2 py-1 bg-hw-blue/20 rounded uppercase font-bold">
                            {service.characteristics.length} Characteristics
                          </div>
                        </button>

                        <AnimatePresence>
                          {service.isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-hw-blue/10"
                            >
                              <div className="p-4 space-y-4 bg-black/20">
                                {service.characteristics.map(char => (
                                  <div key={char.uuid} className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
                                    <div className="flex justify-between items-start mb-4">
                                      <div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1">Characteristic UUID</div>
                                        <div className="text-xs font-mono font-bold">{char.uuid}</div>
                                      </div>
                                      <div className="flex gap-1">
                                        {char.properties.map(p => (
                                          <span key={p} className="text-[8px] px-1.5 py-0.5 bg-hw-blue/20 rounded uppercase font-bold">
                                            {p}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 items-end">
                                      <div className="flex-1 min-w-[200px]">
                                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-2">Value</div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-black/40 border border-hw-blue/20 rounded px-3 py-2 text-xs font-mono min-h-[32px] flex items-center">
                                            {char.value || <span className="opacity-20 italic">No data read</span>}
                                          </div>
                                          {char.properties.includes('READ') && (
                                            <button 
                                              onClick={() => readChar(char.uuid)}
                                              className="p-2 hover:bg-hw-blue/20 rounded transition-colors"
                                              title="Read Value"
                                            >
                                              <RefreshCw className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {char.properties.includes('WRITE') && (
                                        <div className="flex-1 min-w-[200px]">
                                          <div className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-2">Write Hex</div>
                                          <div className="flex items-center gap-2">
                                            <input 
                                              type="text"
                                              value={writeValues[char.uuid] || ''}
                                              onChange={(e) => setWriteValues(prev => ({ ...prev, [char.uuid]: e.target.value }))}
                                              placeholder="e.g. FF00AA"
                                              className="flex-1 bg-black/40 border border-hw-blue/20 rounded px-3 py-2 text-xs font-mono outline-none focus:border-hw-blue transition-colors"
                                            />
                                            <button 
                                              onClick={() => writeChar(char.uuid)}
                                              disabled={!writeValues[char.uuid]}
                                              className="p-2 bg-hw-blue/10 hover:bg-hw-blue/20 disabled:opacity-20 rounded transition-colors"
                                              title="Write Value"
                                            >
                                              <Send className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {char.properties.includes('NOTIFY') && (
                                        <button 
                                          onClick={() => toggleNotify(char.uuid, char.isNotifying)}
                                          className={cn(
                                            "px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                                            char.isNotifying ? "bg-hw-blue text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]" : "bg-hw-blue/10 hover:bg-hw-blue/20"
                                          )}
                                        >
                                          <Activity className={cn("w-3 h-3", char.isNotifying && "animate-pulse")} />
                                          {char.isNotifying ? "Subscribed" : "Notify"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-black/60">
              <div className="p-3 border-b border-hw-blue/10 flex justify-between items-center bg-hw-blue/5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3 h-3 opacity-50" />
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">BLE Transaction Log</span>
                </div>
                <button 
                  onClick={() => setLogs([])}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  title="Clear Logs"
                >
                  <Trash2 className="w-3 h-3 text-red-500/60" />
                </button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 font-mono text-[11px] space-y-1">
                {logs.length === 0 && (
                  <div className="text-hw-blue/20 italic text-center py-20">No transactions recorded.</div>
                )}
                {logs.map(log => (
                  <div key={log.id} className="flex gap-4 group">
                    <span className="opacity-20 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={cn(
                      "shrink-0 w-16 font-bold uppercase text-[9px] pt-0.5",
                      log.type === 'error' ? 'text-red-500' :
                      log.type === 'success' ? 'text-green-500' :
                      log.type === 'sent' ? 'text-hw-blue/50' :
                      log.type === 'data' ? 'text-yellow-500' : 'text-hw-blue/30'
                    )}>
                      {log.type}
                    </span>
                    <span className={cn(
                      "flex-1 break-all",
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'sent' ? 'text-hw-blue/70' :
                      log.type === 'data' ? 'text-yellow-200' : 'text-hw-blue/90'
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Status Bar */}
      <div className="h-8 border-t border-hw-blue/20 bg-black/60 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">Serial: {connected ? "Ready" : "Offline"}</span>
          </div>
          {connectedDevice && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-hw-blue animate-pulse shadow-[0_0_8px_rgba(0,242,255,0.5)]" />
              <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">BLE: Connected</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 opacity-40">
          <Info className="w-3 h-3" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">ESP32 BLE Controller v1.0.4</span>
        </div>
      </div>
    </div>
  );
};
