import React, { useMemo } from 'react';
import { Info, Zap, Monitor, Trash2, Activity, Cpu, Database, Shield, Calendar, Tag, HardDrive, Globe, Lock as LockIcon, Wifi, Server, Box } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import { APPS } from '../../constants';
import { AppView } from '../../types';

interface PropertiesAppProps {
  appId: string;
  onClose: () => void;
  onOpenApp: (id: AppView) => void;
  onRemoveIcon: (id: string) => void;
  onOpenSettings: (tab: string) => void;
}

export const PropertiesApp: React.FC<PropertiesAppProps> = ({ 
  appId, 
  onClose, 
  onOpenApp, 
  onRemoveIcon, 
  onOpenSettings 
}) => {
  const { theme } = useSettings();
  const app = useMemo(() => APPS.find(a => a.id === appId), [appId]);

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-hw-blue/40">
        <Info size={48} />
        <span className="text-xs uppercase tracking-widest">App metadata not found</span>
      </div>
    );
  }

  const stats = useMemo(() => ({
    cpu: (Math.random() * 2 + 0.5).toFixed(1),
    ram: Math.floor(Math.random() * 50 + 20),
    threads: Math.floor(Math.random() * 8 + 2),
    uptime: Math.floor(Math.random() * 3600 + 600),
    bundleSize: (Math.random() * 500 + 100).toFixed(1),
    lastModified: new Date(Date.now() - Math.random() * 1000000000).toLocaleDateString(),
    permissions: ['Storage', 'Network', 'Notifications'],
    latency: Math.floor(Math.random() * 50 + 5),
    storageQuota: Math.floor(Math.random() * 100 + 10),
    endpoints: [`/api/v1/${appId}`, `/ws/${appId}`],
    cacheStatus: Math.random() > 0.5 ? 'Optimized' : 'Bypassed',
    framework: 'React 18.2.0',
    runtime: 'Node.js 20.x',
    environment: 'Production (Cloud Run)',
    deploymentUrl: window.location.origin,
  }), [appId]);

  return (
    <div className="flex flex-col h-full bg-hw-black text-hw-blue/90 font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-hw-blue/10 flex items-center gap-4 bg-hw-blue/5">
        <div className="p-3 bg-hw-blue/10 rounded-xl border border-hw-blue/20">
          <app.icon className="w-8 h-8 text-hw-blue" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold uppercase tracking-[0.2em]">{app.label}</h2>
          <span className="text-[10px] opacity-40 uppercase tracking-widest">Application Properties</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-8">
        {/* General Info */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
            <Tag size={12} /> General Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <span className="text-[9px] uppercase opacity-40 block mb-1">Process ID</span>
              <span className="text-xs font-mono">{app.id}</span>
            </div>
            <div className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <span className="text-[9px] uppercase opacity-40 block mb-1">Status</span>
              <span className="text-xs text-green-500 font-bold uppercase tracking-widest">Ready</span>
            </div>
            <div className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <span className="text-[9px] uppercase opacity-40 block mb-1">Type</span>
              <span className="text-xs uppercase tracking-widest">System Module</span>
            </div>
            <div className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <span className="text-[9px] uppercase opacity-40 block mb-1">Version</span>
              <span className="text-xs font-mono">v1.4.2-stable</span>
            </div>
          </div>
        </section>

        {/* Runtime Stats */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
            <Activity size={12} /> Runtime Context
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <Cpu size={14} className="mb-2 opacity-60" />
              <span className="text-xs font-mono">{stats.cpu}%</span>
              <span className="text-[8px] uppercase opacity-40 mt-1">CPU</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <Database size={14} className="mb-2 opacity-60" />
              <span className="text-xs font-mono">{stats.ram}MB</span>
              <span className="text-[8px] uppercase opacity-40 mt-1">RAM</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <Zap size={14} className="mb-2 opacity-60" />
              <span className="text-xs font-mono">{stats.threads}</span>
              <span className="text-[8px] uppercase opacity-40 mt-1">Threads</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <Shield size={14} className="mb-2 opacity-60" />
              <span className="text-xs uppercase font-bold text-green-500">Safe</span>
              <span className="text-[8px] uppercase opacity-40 mt-1">Security</span>
            </div>
          </div>
        </section>

        {/* Web & Storage Info */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
            <Globe size={12} /> Web & Storage Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center gap-3">
              <HardDrive size={16} className="opacity-40" />
              <div>
                <span className="text-[9px] uppercase opacity-40 block">Bundle Size</span>
                <span className="text-xs font-mono">{stats.bundleSize} KB</span>
              </div>
            </div>
            <div className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center gap-3">
              <Calendar size={16} className="opacity-40" />
              <div>
                <span className="text-[9px] uppercase opacity-40 block">Last Modified</span>
                <span className="text-xs font-mono">{stats.lastModified}</span>
              </div>
            </div>
            <div className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center gap-3">
              <Wifi size={16} className="opacity-40" />
              <div>
                <span className="text-[9px] uppercase opacity-40 block">Latency</span>
                <span className="text-xs font-mono">{stats.latency}ms</span>
              </div>
            </div>
            <div className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center gap-3">
              <Database size={16} className="opacity-40" />
              <div>
                <span className="text-[9px] uppercase opacity-40 block">Storage Quota</span>
                <span className="text-xs font-mono">{stats.storageQuota}MB</span>
              </div>
            </div>
            <div className="col-span-2 p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <span className="text-[9px] uppercase opacity-40 block mb-2 flex items-center gap-2">
                <Server size={10} /> API Endpoints
              </span>
              <div className="space-y-1">
                {stats.endpoints.map(e => (
                  <div key={e} className="text-[10px] font-mono opacity-80">{e}</div>
                ))}
              </div>
            </div>
            <div className="col-span-2 p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box size={14} className="opacity-40" />
                <span className="text-[9px] uppercase opacity-40">Cache Strategy</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue">{stats.cacheStatus}</span>
            </div>
            <div className="col-span-2 p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg space-y-3">
              <span className="text-[9px] uppercase opacity-40 block flex items-center gap-2">
                <Globe size={10} /> Deployment & Environment
              </span>
              <div className="grid grid-cols-2 gap-y-2">
                <div>
                  <span className="text-[8px] uppercase opacity-30 block">Framework</span>
                  <span className="text-[10px] font-mono">{stats.framework}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase opacity-30 block">Runtime</span>
                  <span className="text-[10px] font-mono">{stats.runtime}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[8px] uppercase opacity-30 block">Deployment URL</span>
                  <span className="text-[10px] font-mono truncate block">{stats.deploymentUrl}</span>
                </div>
              </div>
            </div>

            <div className="col-span-2 p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg">
              <span className="text-[9px] uppercase opacity-40 block mb-2 flex items-center gap-2">
                <LockIcon size={10} /> Active Permissions
              </span>
              <div className="flex flex-wrap gap-2">
                {stats.permissions.map(p => (
                  <span key={p} className="px-2 py-0.5 bg-hw-blue/10 border border-hw-blue/20 rounded text-[8px] uppercase tracking-widest">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-4 pt-4 border-t border-hw-blue/10">
          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Available Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => onOpenApp(app.id)}
              className="flex items-center gap-3 p-3 bg-hw-blue/10 hover:bg-hw-blue/20 border border-hw-blue/20 rounded-lg transition-colors group"
            >
              <Zap size={16} className="text-hw-blue group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest block">Launch Application</span>
                <span className="text-[8px] opacity-40 uppercase">Start process instance</span>
              </div>
            </button>
            <button 
              onClick={() => onOpenSettings('desktop')}
              className="flex items-center gap-3 p-3 bg-hw-blue/10 hover:bg-hw-blue/20 border border-hw-blue/20 rounded-lg transition-colors group"
            >
              <Monitor size={16} className="text-hw-blue group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest block">Desktop Settings</span>
                <span className="text-[8px] opacity-40 uppercase">Configure icon & layout</span>
              </div>
            </button>
            <button 
              onClick={() => onRemoveIcon(app.id)}
              className="flex items-center gap-3 p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors group"
            >
              <Trash2 size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest block text-red-500">Delete Icon</span>
                <span className="text-[8px] opacity-40 uppercase text-red-500/60">Hide from desktop grid</span>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 bg-hw-blue/5 border-t border-hw-blue/10 flex justify-end">
        <button 
          onClick={onClose}
          className="hw-button px-6 py-2 text-[10px] font-bold uppercase tracking-widest"
        >
          Close
        </button>
      </div>
    </div>
  );
};
