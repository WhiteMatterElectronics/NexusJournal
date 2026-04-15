import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Cpu, Database, HardDrive, Network, 
  X, Terminal, Search, Trash2, RefreshCcw, 
  ChevronDown, ChevronRight, Zap, Monitor, 
  Layers, Gauge, BarChart3, EyeOff
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import { AppView } from '../../types';

interface Process {
  id: string;
  name: string;
  appId: AppView | 'kernel' | 'system';
  cpu: number;
  ram: number;
  network: number;
  gpu: number;
  status: 'running' | 'suspended' | 'zombie';
  instances: { id: string; cpu: number; ram: number; network: number }[];
}

interface SystemMonitorProps {
  windows: any[];
  onWindowAction: (instanceId: string, action: 'close' | 'minimize' | 'maximize' | 'focus') => void;
  initialView?: 'dashboard' | 'process_detail';
  appId?: string;
}

export const SystemMonitorApp: React.FC<SystemMonitorProps> = ({ windows, onWindowAction, initialView = 'dashboard', appId }) => {
  const { theme } = useSettings();
  const [view, setView] = useState<'dashboard' | 'process_detail'>(initialView);
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(appId);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [cpuHistory, setCpuHistory] = useState<number[][]>(Array(8).fill([]).map(() => Array(20).fill(0)));
  const [gpuLoad, setGpuLoad] = useState(0);
  const [networkHistory, setNetworkHistory] = useState<{in: number, out: number}[]>(Array(20).fill({in: 0, out: 0}));

  // Group windows by appId
  const processGroups = useMemo(() => {
    const groups: Record<string, Process> = {
      'kernel': { 
        id: 'kernel', name: 'OS_KERNEL', appId: 'kernel', cpu: 1.2, ram: 128, network: 0.01, gpu: 0.5, status: 'running', 
        instances: [{ id: 'k-1', cpu: 1.2, ram: 128, network: 0.01 }] 
      },
      'system': { 
        id: 'system', name: 'WINDOW_SERVER', appId: 'system', cpu: 3.4, ram: 256, network: 0.1, gpu: 4.2, status: 'running', 
        instances: [{ id: 's-1', cpu: 3.4, ram: 256, network: 0.1 }] 
      }
    };

    windows.forEach(win => {
      if (!groups[win.appId]) {
        groups[win.appId] = {
          id: win.appId,
          name: win.appId.toUpperCase(),
          appId: win.appId,
          cpu: 0,
          ram: 0,
          network: 0,
          gpu: 0,
          status: 'running',
          instances: []
        };
      }
      
      // Generate some dynamic mock stats for each instance
      const iCpu = Math.random() * 5 + 1;
      const iRam = Math.floor(Math.random() * 100 + 50);
      const iNet = Math.random() * 0.5;
      
      groups[win.appId].instances.push({ id: win.instanceId, cpu: iCpu, ram: iRam, network: iNet });
      groups[win.appId].cpu += iCpu;
      groups[win.appId].ram += iRam;
      groups[win.appId].network += iNet;
      groups[win.appId].gpu += Math.random() * 2;
    });

    return Object.values(groups);
  }, [windows]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuHistory(prev => prev.map(core => [...core.slice(1), Math.floor(Math.random() * 40 + 10)]));
      setGpuLoad(Math.floor(Math.random() * 30 + 5));
      setNetworkHistory(prev => [...prev.slice(1), { in: Math.random() * 5, out: Math.random() * 2 }]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalStats = useMemo(() => {
    return processGroups.reduce((acc, p) => ({
      cpu: acc.cpu + p.cpu,
      ram: acc.ram + p.ram,
      network: acc.network + p.network,
      gpu: acc.gpu + p.gpu
    }), { cpu: 0, ram: 0, network: 0, gpu: 0 });
  }, [processGroups]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (view === 'process_detail' && selectedAppId) {
    const app = processGroups.find(p => p.appId === selectedAppId);
    return (
      <div className="flex flex-col h-full bg-hw-black text-hw-blue/90 font-sans select-none overflow-hidden">
        <div className="p-6 border-b border-hw-blue/10 flex items-center justify-between bg-hw-blue/5">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('dashboard')} className="p-2 hover:bg-hw-blue/10 rounded-full transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold uppercase tracking-widest">{app?.name || selectedAppId.toUpperCase()} PROPERTIES</h2>
              <span className="text-[9px] opacity-40 uppercase tracking-widest">Process ID: {selectedAppId}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest", app ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>
              {app ? 'ACTIVE_PROCESS' : 'TERMINATED'}
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="p-6 bg-hw-blue/5 border border-hw-blue/10 rounded-xl">
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-60">Resource Consumption</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>CPU LOAD</span>
                      <span className="font-mono">{app?.cpu.toFixed(1) || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-hw-blue/10 rounded-full overflow-hidden">
                      <div className="h-full bg-hw-blue transition-all duration-1000" style={{ width: `${app?.cpu || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>MEMORY USAGE</span>
                      <span className="font-mono">{app?.ram || 0} MB</span>
                    </div>
                    <div className="h-1.5 bg-hw-blue/10 rounded-full overflow-hidden">
                      <div className="h-full bg-hw-blue transition-all duration-1000" style={{ width: `${((app?.ram || 0) / 1024) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-hw-blue/5 border border-hw-blue/10 rounded-xl">
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-60">Process Metadata</h3>
                <div className="space-y-3 text-[10px]">
                  <div className="flex justify-between border-b border-hw-blue/5 pb-2">
                    <span className="opacity-40">EXECUTABLE</span>
                    <span className="font-mono">{selectedAppId}.bin</span>
                  </div>
                  <div className="flex justify-between border-b border-hw-blue/5 pb-2">
                    <span className="opacity-40">USER</span>
                    <span className="font-mono">ROOT</span>
                  </div>
                  <div className="flex justify-between border-b border-hw-blue/5 pb-2">
                    <span className="opacity-40">PRIORITY</span>
                    <span className="font-mono">NORMAL (20)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-40">THREADS</span>
                    <span className="font-mono">12</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="p-6 bg-hw-blue/5 border border-hw-blue/10 rounded-xl h-full flex flex-col">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-60">Active Instances</h3>
                  <div className="flex-1 space-y-2">
                    {app?.instances.map((inst, i) => (
                      <div key={inst.id} className="flex items-center justify-between p-3 bg-black/20 rounded border border-hw-blue/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold">Instance #{i+1}</span>
                          <span className="text-[8px] opacity-40 font-mono">{inst.id}</span>
                        </div>
                        <button 
                          onClick={() => onWindowAction(inst.id, 'close')}
                          className="p-1.5 hover:bg-red-500/20 text-red-500/60 hover:text-red-500 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(!app || app.instances.length === 0) && (
                      <div className="flex flex-col items-center justify-center h-40 opacity-20">
                        <EyeOff className="w-8 h-8 mb-2" />
                        <span className="text-[10px] uppercase tracking-widest">No active instances</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const MiniGraph = ({ data, color, height = 30 }: { data: number[], color: string, height?: number }) => (
    <div className="flex items-end gap-[1px] h-[30px] w-full bg-black/20 rounded overflow-hidden p-1">
      {data.map((v, i) => (
        <div 
          key={i} 
          className="flex-1 transition-all duration-500" 
          style={{ height: `${v}%`, backgroundColor: color, opacity: 0.3 + (v/100) }}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-hw-black text-hw-blue/90 font-sans select-none overflow-hidden">
      {/* Top Dashboard */}
      <div className="grid grid-cols-4 gap-4 p-6 border-b border-hw-blue/10 bg-hw-blue/5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 opacity-60">
            <Cpu className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">CPU_CORES</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {cpuHistory.map((core, i) => (
              <div key={i} className="h-8 bg-black/40 rounded border border-hw-blue/5 overflow-hidden flex items-end">
                <div className="w-full bg-hw-blue/40" style={{ height: `${core[core.length-1]}%` }} />
              </div>
            ))}
          </div>
          <div className="text-xl font-mono font-bold tracking-tighter text-hw-blue">
            {totalStats.cpu.toFixed(1)}%
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 opacity-60">
            <Database className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">MEMORY_POOL</span>
          </div>
          <div className="h-8 bg-black/40 rounded border border-hw-blue/5 overflow-hidden flex items-center px-2">
             <div className="h-1 w-full bg-hw-blue/10 rounded-full overflow-hidden">
                <div className="h-full bg-hw-blue transition-all duration-1000" style={{ width: `${(totalStats.ram / 4096) * 100}%` }} />
             </div>
          </div>
          <div className="text-xl font-mono font-bold tracking-tighter text-hw-blue">
            {(totalStats.ram / 1024).toFixed(2)} GB
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 opacity-60">
            <Zap className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">GPU_ACCELERATION</span>
          </div>
          <div className="h-8 bg-black/40 rounded border border-hw-blue/5 overflow-hidden">
             <MiniGraph data={Array(20).fill(0).map(() => Math.random() * 40 + 10)} color={theme.mainColor} />
          </div>
          <div className="text-xl font-mono font-bold tracking-tighter text-hw-blue">
            {gpuLoad}%
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 opacity-60">
            <Network className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">NET_TRAFFIC</span>
          </div>
          <div className="h-8 bg-black/40 rounded border border-hw-blue/5 overflow-hidden">
             <MiniGraph data={networkHistory.map(n => (n.in + n.out) * 10)} color="#10b981" />
          </div>
          <div className="text-xl font-mono font-bold tracking-tighter text-hw-blue">
            {totalStats.network.toFixed(2)} MB/s
          </div>
        </div>
      </div>

      {/* Process Manager */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 flex items-center justify-between border-b border-hw-blue/5">
          <div className="flex items-center gap-4">
             <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60">Process_Tree</h3>
             <div className="flex items-center gap-2 bg-black/40 border border-hw-blue/10 rounded px-2 py-1">
                <Search className="w-3 h-3 opacity-40" />
                <input type="text" placeholder="Filter..." className="bg-transparent outline-none text-[10px] w-32" />
             </div>
          </div>
          <div className="flex gap-4 text-[9px] font-bold opacity-40 uppercase tracking-tighter">
             <span>Total Tasks: {windows.length + 2}</span>
             <span>Threads: 284</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-hw-black/90 backdrop-blur-md z-20 border-b border-hw-blue/10">
              <tr className="text-[9px] uppercase tracking-widest opacity-40">
                <th className="p-4 font-bold w-8"></th>
                <th className="p-4 font-bold">Process</th>
                <th className="p-4 font-bold text-right">CPU</th>
                <th className="p-4 font-bold text-right">RAM</th>
                <th className="p-4 font-bold text-right">NET</th>
                <th className="p-4 font-bold text-right">GPU</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-mono">
              {processGroups.map(group => (
                <React.Fragment key={group.id}>
                  <tr 
                    className={cn(
                      "border-b border-hw-blue/5 hover:bg-hw-blue/5 transition-colors cursor-pointer group",
                      expandedGroups[group.id] && "bg-hw-blue/5"
                    )}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <td className="p-4 text-center">
                      {group.instances.length > 1 ? (
                        expandedGroups[group.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                      ) : null}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-hw-blue/10 flex items-center justify-center">
                          <Layers size={12} className="text-hw-blue" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold tracking-tight">{group.name}</span>
                          <span className="text-[8px] opacity-40 uppercase">{group.instances.length} instance(s)</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-hw-blue">{group.cpu.toFixed(1)}%</td>
                    <td className="p-4 text-right">{(group.ram).toFixed(0)} MB</td>
                    <td className="p-4 text-right">{group.network.toFixed(2)} MB/s</td>
                    <td className="p-4 text-right opacity-60">{group.gpu.toFixed(1)}%</td>
                    <td className="p-4 text-center">
                      {group.appId !== 'kernel' && group.appId !== 'system' && (
                        <button 
                          className="p-1.5 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 rounded transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            group.instances.forEach(i => onWindowAction(i.id, 'close'));
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                  
                  {/* Cascaded Instances */}
                  {expandedGroups[group.id] && group.instances.map((inst, idx) => (
                    <tr key={inst.id} className="bg-black/40 border-b border-hw-blue/5 text-[10px] opacity-70">
                      <td className="p-3"></td>
                      <td className="p-3 pl-12">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-hw-blue/20 rounded-full" />
                          <span>Instance #{idx + 1}</span>
                          <span className="text-[8px] opacity-30 font-mono">[{inst.id.split('-')[1]}]</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">{inst.cpu.toFixed(1)}%</td>
                      <td className="p-3 text-right">{inst.ram} MB</td>
                      <td className="p-3 text-right">{inst.network.toFixed(2)} MB/s</td>
                      <td className="p-3 text-right opacity-40">{(inst.cpu * 0.2).toFixed(1)}%</td>
                      <td className="p-3 text-center">
                        <button 
                          className="p-1 hover:text-red-500 transition-colors"
                          onClick={() => onWindowAction(inst.id, 'close')}
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Status */}
      <div className="px-6 py-3 bg-hw-blue/5 border-t border-hw-blue/10 flex justify-between items-center text-[9px] uppercase tracking-widest font-bold">
        <div className="flex gap-6">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            System_Healthy
          </span>
          <span className="opacity-40">Kernel_Ver: 4.2.0-hw-os</span>
        </div>
        <div className="flex gap-4 opacity-40">
          <span>Uptime: 04:12:44</span>
          <span>Load_Avg: 1.24 1.10 0.98</span>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 242, 255, 0.3); }
      `}</style>
    </div>
  );
};
