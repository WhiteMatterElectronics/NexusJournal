import React, { useState, useEffect, useRef, useCallback } from "react";
import { Wifi, Search, WifiOff, Activity, Terminal, Send, Trash2, RefreshCw, Info, Database, Signal, Lock, Unlock, Globe, Activity as PingIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useSerial } from "../../contexts/SerialContext";
import { SerialConnectionSelector } from "../common/SerialConnectionSelector";

interface WifiNetwork {
  ssid: string;
  rssi: number;
  channel: number;
  security: string;
  lastSeen: number;
}

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'error' | 'success' | 'data' | 'sent';
  message: string;
}

export const WifiApp: React.FC<{ connectionId?: string }> = ({ connectionId: initialConnId }) => {
  const [selectedConnId, setSelectedConnId] = useState(initialConnId || 'shared');
  const { connected, port, writeToSerial } = useSerial(selectedConnId);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'scanner' | 'connect' | 'ap' | 'ping' | 'console'>('scanner');
  
  const [connectSsid, setConnectSsid] = useState('');
  const [connectPass, setConnectPass] = useState('');
  
  const [apSsid, setApSsid] = useState('ESP32_AP');
  const [apPass, setApPass] = useState('12345678');
  
  const [pingHost, setPingHost] = useState('8.8.8.8');
  const [pingResults, setPingResults] = useState<string[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  
  const [currentStatus, setCurrentStatus] = useState<string>('Unknown');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const pingEndRef = useRef<HTMLDivElement>(null);

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
    if (logsEndRef.current?.parentElement) {
      logsEndRef.current.parentElement.scrollTop = logsEndRef.current.parentElement.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (pingEndRef.current?.parentElement) {
      pingEndRef.current.parentElement.scrollTop = pingEndRef.current.parentElement.scrollHeight;
    }
  }, [pingResults]);

  useEffect(() => {
    const handleSerialLine = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string, connectionId: string }>;
      const { text, connectionId } = customEvent.detail;

      if (connectionId !== selectedConnId) return;

      if (text.includes("[WIFI]") || text.includes("[PING]") || text.match(/^\s*\d+:\s+(.+?)\s+\((-?\d+)\s+dBm\)\s+\[CH:\s+(\d+)\]\s+\[(.+?)\]/)) {
        if (text.includes("Scanning networks")) {
          setIsScanning(true);
          setNetworks([]);
          addLog('info', 'Started WiFi scan...');
        } else if (text.includes("Found") && text.includes("networks:")) {
          setIsScanning(false);
          addLog('info', 'WiFi scan completed.');
        } else if (text.match(/^\s*\d+:\s+(.+?)\s+\((-?\d+)\s+dBm\)\s+\[CH:\s+(\d+)\]\s+\[(.+?)\]/)) {
          // Parse network line: "   1: MySSID (-45 dBm) [CH: 6] [SECURED]"
          const match = text.match(/^\s*\d+:\s+(.+?)\s+\((-?\d+)\s+dBm\)\s+\[CH:\s+(\d+)\]\s+\[(.+?)\]/);
          if (match) {
            const ssid = match[1].trim();
            const rssi = parseInt(match[2], 10);
            const channel = parseInt(match[3], 10);
            const security = match[4].trim();
            
            setNetworks(prev => {
              const existing = prev.find(n => n.ssid === ssid);
              if (existing) {
                return prev.map(n => n.ssid === ssid ? { ...n, rssi, channel, security, lastSeen: Date.now() } : n);
              }
              return [...prev, { ssid, rssi, channel, security, lastSeen: Date.now() }];
            });
          }
        } else if (text.includes("Connecting to")) {
          addLog('info', text.replace("[WIFI]", "").trim());
        } else if (text.includes("Connected! IP:")) {
          addLog('success', text.replace("[WIFI]", "").trim());
          setCurrentStatus(text.replace("[WIFI]", "").trim());
        } else if (text.includes("Connection Failed")) {
          addLog('error', 'Connection Failed');
        } else if (text.includes("AP '") && text.includes("active at")) {
          addLog('success', text.replace("[WIFI]", "").trim());
          setCurrentStatus(text.replace("[WIFI]", "").trim());
        } else if (text.includes("Radios powered down")) {
          addLog('info', 'WiFi radios powered down.');
          setCurrentStatus('Offline');
        } else if (text.includes("SSID:") && text.includes("IP:") && text.includes("RSSI:")) {
          addLog('info', text.replace("[WIFI]", "").trim());
          setCurrentStatus(text.replace("[WIFI]", "").trim());
        } else if (text.includes("Station not connected")) {
          addLog('info', 'Station not connected.');
          setCurrentStatus('Disconnected');
        } else if (text.includes("[PING] Pinging")) {
          setIsPinging(true);
          setPingResults(prev => [...prev, text.replace("[PING]", "").trim()]);
          addLog('info', text.replace("[PING]", "").trim());
        } else if (text.includes("[PING] Reply received") || text.includes("[PING] Timeout") || text.includes("[PING] ERR:")) {
          setPingResults(prev => [...prev, text.replace("[PING]", "").trim()]);
          addLog(text.includes("ERR") || text.includes("Timeout") ? 'error' : 'success', text.replace("[PING]", "").trim());
          if (text.includes("ERR:")) setIsPinging(false);
        }
      }
    };

    window.addEventListener('hw_serial_line', handleSerialLine);
    return () => window.removeEventListener('hw_serial_line', handleSerialLine);
  }, [addLog, selectedConnId]);

  const startScan = () => {
    if (!connected) return;
    writeToSerial("WIFI SCAN\n");
  };

  const connectToNetwork = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!connected || !connectSsid) return;
    writeToSerial(`WIFI CONNECT ${connectSsid} ${connectPass}\n`);
  };

  const startAp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!connected || !apSsid) return;
    writeToSerial(`WIFI AP ${apSsid} ${apPass}\n`);
  };

  const checkStatus = () => {
    if (!connected) return;
    writeToSerial("WIFI STA\n");
  };

  const turnOff = () => {
    if (!connected) return;
    writeToSerial("WIFI OFF\n");
  };

  const runPing = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!connected || !pingHost) return;
    setPingResults([]);
    writeToSerial(`PING ${pingHost}\n`);
    // Reset isPinging after a timeout since firmware doesn't send an explicit "end" message
    setTimeout(() => setIsPinging(false), 8000);
  };

  const getSignalStrength = (rssi: number) => {
    if (rssi > -50) return 4;
    if (rssi > -60) return 3;
    if (rssi > -70) return 2;
    if (rssi > -80) return 1;
    return 0;
  };

  if (!connected) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-hw-black text-hw-blue p-8">
        <WifiOff className="w-16 h-16 mb-4 opacity-20 animate-pulse" />
        <h2 className="text-xl font-bold uppercase tracking-widest mb-2">No Connection</h2>
        <p className="text-sm opacity-60 text-center max-w-md">
          Connect to a device via the Serial Console to use the WiFi Commander.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-hw-black text-hw-blue font-mono overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-hw-blue/20 bg-hw-blue/5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <SerialConnectionSelector selectedConnId={selectedConnId} onSelect={setSelectedConnId} />
          <div className="h-4 w-px bg-hw-blue/20" />
          <div className="flex items-center gap-3">
            <Wifi className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold uppercase tracking-widest leading-none">WIFI_COMMANDER</h1>
              <span className="text-xs opacity-60">ESP32 Network Controller</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs uppercase tracking-widest opacity-60">Port: {port?.getInfo().usbProductId || 'Connected'}</span>
          </div>
          <div className="text-xs bg-hw-blue/10 px-2 py-1 rounded border border-hw-blue/20 truncate max-w-[200px]">
            {currentStatus}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 flex-none border-r border-hw-blue/20 bg-hw-blue/5 p-2 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('scanner')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded text-sm uppercase tracking-wider transition-colors text-left",
              activeTab === 'scanner' ? "bg-hw-blue text-hw-black font-bold" : "hover:bg-hw-blue/10"
            )}
          >
            <Search className="w-4 h-4" /> Scanner
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded text-sm uppercase tracking-wider transition-colors text-left",
              activeTab === 'connect' ? "bg-hw-blue text-hw-black font-bold" : "hover:bg-hw-blue/10"
            )}
          >
            <Globe className="w-4 h-4" /> Connect
          </button>
          <button
            onClick={() => setActiveTab('ap')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded text-sm uppercase tracking-wider transition-colors text-left",
              activeTab === 'ap' ? "bg-hw-blue text-hw-black font-bold" : "hover:bg-hw-blue/10"
            )}
          >
            <Wifi className="w-4 h-4" /> Access Point
          </button>
          <button
            onClick={() => setActiveTab('ping')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded text-sm uppercase tracking-wider transition-colors text-left",
              activeTab === 'ping' ? "bg-hw-blue text-hw-black font-bold" : "hover:bg-hw-blue/10"
            )}
          >
            <PingIcon className="w-4 h-4" /> Ping
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded text-sm uppercase tracking-wider transition-colors text-left",
              activeTab === 'console' ? "bg-hw-blue text-hw-black font-bold" : "hover:bg-hw-blue/10"
            )}
          >
            <Terminal className="w-4 h-4" /> Log
          </button>

          <div className="mt-auto pt-4 border-t border-hw-blue/20 flex flex-col gap-2">
            <button
              onClick={checkStatus}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded text-xs uppercase tracking-wider transition-colors bg-hw-blue/10 hover:bg-hw-blue/20 border border-hw-blue/30"
            >
              <Info className="w-3 h-3" /> Check Status
            </button>
            <button
              onClick={turnOff}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded text-xs uppercase tracking-wider transition-colors bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400"
            >
              <WifiOff className="w-3 h-3" /> Power Off
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-black/40">
          {activeTab === 'scanner' && (
            <div className="absolute inset-0 flex flex-col p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest">Available Networks</h2>
                <button
                  onClick={startScan}
                  disabled={isScanning}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all border",
                    isScanning 
                      ? "bg-hw-blue/20 border-hw-blue/30 text-hw-blue/50 cursor-not-allowed"
                      : "bg-hw-blue/10 border-hw-blue/50 hover:bg-hw-blue hover:text-hw-black"
                  )}
                >
                  <RefreshCw className={cn("w-3 h-3", isScanning && "animate-spin")} />
                  {isScanning ? "Scanning..." : "Scan"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-hw-blue/20 rounded bg-hw-blue/5 p-2">
                {networks.length === 0 && !isScanning ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <Search className="w-8 h-8 mb-2" />
                    <span className="text-xs uppercase tracking-widest">No networks found</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {networks.sort((a, b) => b.rssi - a.rssi).map((network, idx) => (
                      <div 
                        key={`${network.ssid}-${idx}`}
                        className="flex items-center justify-between p-2 hover:bg-hw-blue/10 rounded border border-transparent hover:border-hw-blue/20 transition-colors cursor-pointer"
                        onClick={() => {
                          setConnectSsid(network.ssid);
                          setActiveTab('connect');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Signal className="w-4 h-4" />
                          <div>
                            <div className="font-bold">{network.ssid}</div>
                            <div className="text-[10px] opacity-60 flex items-center gap-2">
                              <span>CH: {network.channel}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                {network.security === 'OPEN' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {network.security}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs font-bold">{network.rssi} dBm</div>
                            <div className="text-[10px] opacity-60">Signal</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-md bg-hw-blue/5 border border-hw-blue/20 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-hw-blue/20 pb-4">
                  <Globe className="w-6 h-6" />
                  <h2 className="text-lg font-bold uppercase tracking-widest">Connect to Network</h2>
                </div>
                
                <form onSubmit={connectToNetwork} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest opacity-60 mb-1">SSID</label>
                    <input
                      type="text"
                      value={connectSsid}
                      onChange={(e) => setConnectSsid(e.target.value)}
                      className="w-full bg-black/50 border border-hw-blue/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-hw-blue"
                      placeholder="Network Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest opacity-60 mb-1">Password</label>
                    <input
                      type="password"
                      value={connectPass}
                      onChange={(e) => setConnectPass(e.target.value)}
                      className="w-full bg-black/50 border border-hw-blue/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-hw-blue"
                      placeholder="Leave blank if open"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-hw-blue text-hw-black font-bold uppercase tracking-widest py-2 rounded hover:bg-white transition-colors mt-4 flex items-center justify-center gap-2"
                  >
                    <Wifi className="w-4 h-4" /> Connect
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'ap' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-md bg-hw-blue/5 border border-hw-blue/20 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-hw-blue/20 pb-4">
                  <Wifi className="w-6 h-6" />
                  <h2 className="text-lg font-bold uppercase tracking-widest">Create Access Point</h2>
                </div>
                
                <form onSubmit={startAp} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest opacity-60 mb-1">AP SSID</label>
                    <input
                      type="text"
                      value={apSsid}
                      onChange={(e) => setApSsid(e.target.value)}
                      className="w-full bg-black/50 border border-hw-blue/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-hw-blue"
                      placeholder="ESP32_AP"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest opacity-60 mb-1">AP Password</label>
                    <input
                      type="text"
                      value={apPass}
                      onChange={(e) => setApPass(e.target.value)}
                      className="w-full bg-black/50 border border-hw-blue/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-hw-blue"
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-hw-blue text-hw-black font-bold uppercase tracking-widest py-2 rounded hover:bg-white transition-colors mt-4 flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4" /> Start AP
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'ping' && (
            <div className="absolute inset-0 flex flex-col p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest">Network Ping Utility</h2>
              </div>
              
              <form onSubmit={runPing} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={pingHost}
                  onChange={(e) => setPingHost(e.target.value)}
                  className="flex-1 bg-black/50 border border-hw-blue/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-hw-blue"
                  placeholder="Host or IP (e.g., 8.8.8.8)"
                  required
                />
                <button
                  type="submit"
                  disabled={isPinging}
                  className={cn(
                    "px-6 py-2 rounded font-bold uppercase tracking-widest transition-colors flex items-center gap-2",
                    isPinging 
                      ? "bg-hw-blue/20 text-hw-blue/50 cursor-not-allowed" 
                      : "bg-hw-blue text-hw-black hover:bg-white"
                  )}
                >
                  <PingIcon className={cn("w-4 h-4", isPinging && "animate-pulse")} />
                  {isPinging ? "Pinging..." : "Ping"}
                </button>
              </form>

              <div className="flex-1 bg-black/80 border border-hw-blue/20 rounded p-4 overflow-y-auto font-mono text-sm">
                {pingResults.length === 0 ? (
                  <div className="h-full flex items-center justify-center opacity-30">
                    Enter a host to start pinging
                  </div>
                ) : (
                  <div className="space-y-1">
                    {pingResults.map((result, idx) => (
                      <div key={idx} className={cn(
                        "break-all",
                        result.includes("Timeout") || result.includes("ERR") ? "text-red-400" : "text-green-400"
                      )}>
                        {result}
                      </div>
                    ))}
                    <div ref={pingEndRef} />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'console' && (
            <div className="absolute inset-0 flex flex-col p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold uppercase tracking-widest">Transaction Log</h2>
                <button 
                  onClick={() => setLogs([])}
                  className="p-1 hover:bg-hw-blue/20 rounded text-hw-blue/60 hover:text-hw-blue transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 bg-black/80 border border-hw-blue/20 rounded p-2 overflow-y-auto font-mono text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="mb-1 flex gap-2 break-all">
                    <span className="opacity-40 shrink-0">[{new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}]</span>
                    <span className={cn(
                      log.type === 'error' && "text-red-400",
                      log.type === 'success' && "text-green-400",
                      log.type === 'data' && "text-yellow-400",
                      log.type === 'sent' && "text-blue-400 opacity-80",
                      log.type === 'info' && "opacity-80"
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
    </div>
  );
};
