import React, { useMemo } from 'react';
import { Info, Zap, Monitor, Trash2, Activity, Cpu, Database, Shield, Calendar, Tag, HardDrive, Globe, Lock as LockIcon, Wifi, Server, Box, File, Image as ImageIcon, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import { APPS } from '../../constants';
import { AppView } from '../../types';

interface PropertiesAppProps {
  appId?: string;
  file?: any;
  onClose: () => void;
  onOpenApp: (id: AppView) => void;
  onRemoveIcon: (id: string) => void;
  onOpenSettings: (tab: string) => void;
}

export const PropertiesApp: React.FC<PropertiesAppProps> = ({ 
  appId, 
  file,
  onClose, 
  onOpenApp, 
  onRemoveIcon, 
  onOpenSettings 
}) => {
  const { theme } = useSettings();
  const app = useMemo(() => appId ? APPS.find(a => a.id === appId) : null, [appId]);

  const [fileData, setFileData] = React.useState(file);

  React.useEffect(() => {
    if (file) setFileData(file);
  }, [file]);

  if (!app && !fileData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40" style={{ color: 'var(--theme-text)' }}>
        <Info size={48} />
        <span className="text-xs uppercase tracking-widest">Metadata not found</span>
      </div>
    );
  }

  const handleUpdateFile = (key: string, value: any) => {
    const updated = { ...fileData, [key]: value };
    setFileData(updated);
    window.dispatchEvent(new CustomEvent('hw_os_update_file', { 
      detail: { fileId: fileData.id, updates: { [key]: value } } 
    }));
  };

  if (fileData) {
    return (
      <div className="flex flex-col h-full font-sans select-none overflow-hidden" style={{ color: 'var(--theme-text)' }}>
        {/* Header */}
        <div className="p-6 border-b flex items-center gap-4" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
          <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)' }}>
            <File size={32} style={{ color: 'var(--theme-text)' }} />
          </div>
          <div className="flex flex-col flex-1">
            <input 
              type="text"
              value={fileData.name}
              onChange={(e) => handleUpdateFile('name', e.target.value)}
              className="text-xl font-bold uppercase tracking-[0.2em] bg-transparent border-b border-transparent outline-none transition-colors"
              style={{ color: 'var(--theme-text)' }}
            />
            <span className="text-[10px] opacity-40 uppercase tracking-widest">File Properties</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-8">
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
              <Tag size={12} /> General Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                <span className="text-[9px] uppercase opacity-40 block mb-1">Type</span>
                <span className="text-xs uppercase tracking-widest">{fileData.type}</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                <span className="text-[9px] uppercase opacity-40 block mb-1">Extension</span>
                <span className="text-xs uppercase tracking-widest">{fileData.extension || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                <span className="text-[9px] uppercase opacity-40 block mb-1">Size</span>
                <span className="text-xs font-mono">{fileData.size ? `${(fileData.size / 1024).toFixed(2)} KB` : 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                <span className="text-[9px] uppercase opacity-40 block mb-1">Created</span>
                <span className="text-xs font-mono">{new Date(fileData.createdAt).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-lg border flex items-center justify-between" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                <div>
                  <span className="text-[9px] uppercase opacity-40 block mb-1">Starred</span>
                  <span className="text-xs uppercase tracking-widest">{fileData.isStarred ? 'Yes' : 'No'}</span>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUpdateFile('isStarred', !fileData.isStarred);
                  }}
                  className={cn(
                    "p-2 rounded-lg border transition-all active:scale-90",
                    fileData.isStarred ? "bg-hw-blue/20 border-hw-blue text-hw-blue shadow-[0_0_10px_rgba(0,242,255,0.2)]" : "border-white/10 opacity-40 hover:opacity-100"
                  )}
                >
                  <Star size={14} className={cn("pointer-events-none", fileData.isStarred && "fill-hw-blue")} />
                </button>
              </div>
            </div>
          </section>

          {fileData.category === 'image' && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                <ImageIcon size={12} /> EXIF Metadata
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                  <span className="text-[9px] uppercase opacity-40 block mb-1">Camera Make</span>
                  <input 
                    type="text"
                    value={fileData.exif?.make || 'Unknown'}
                    onChange={(e) => handleUpdateFile('exif', { ...fileData.exif, make: e.target.value })}
                    className="w-full text-xs bg-transparent border-b border-transparent outline-none transition-colors"
                  />
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                  <span className="text-[9px] uppercase opacity-40 block mb-1">Camera Model</span>
                  <input 
                    type="text"
                    value={fileData.exif?.model || 'Unknown'}
                    onChange={(e) => handleUpdateFile('exif', { ...fileData.exif, model: e.target.value })}
                    className="w-full text-xs bg-transparent border-b border-transparent outline-none transition-colors"
                  />
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                  <span className="text-[9px] uppercase opacity-40 block mb-1">Aperture</span>
                  <input 
                    type="text"
                    value={fileData.exif?.aperture || 'f/1.8'}
                    onChange={(e) => handleUpdateFile('exif', { ...fileData.exif, aperture: e.target.value })}
                    className="w-full text-xs bg-transparent border-b border-transparent outline-none transition-colors"
                  />
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
                  <span className="text-[9px] uppercase opacity-40 block mb-1">Exposure Time</span>
                  <input 
                    type="text"
                    value={fileData.exif?.exposure || '1/100'}
                    onChange={(e) => handleUpdateFile('exif', { ...fileData.exif, exposure: e.target.value })}
                    className="w-full text-xs bg-transparent border-b border-transparent outline-none transition-colors"
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
          <button 
            onClick={onClose}
            className="hw-button px-6 py-2 text-[10px] font-bold uppercase tracking-widest"
          >
            Close
          </button>
        </div>
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
    <div className="flex flex-col h-full font-sans select-none overflow-hidden" style={{ color: 'var(--theme-text)' }}>
      {/* Header */}
      <div className="p-6 border-b flex items-center gap-4" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
        <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)' }}>
          <app.icon className="w-8 h-8" style={{ color: 'var(--theme-text)' }} />
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
            <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <span className="text-[9px] uppercase opacity-40 block mb-1">Process ID</span>
              <span className="text-xs font-mono">{app.id}</span>
            </div>
            <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <span className="text-[9px] uppercase opacity-40 block mb-1">Status</span>
              <span className="text-xs text-green-500 font-bold uppercase tracking-widest">Ready</span>
            </div>
            <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <span className="text-[9px] uppercase opacity-40 block mb-1">Type</span>
              <span className="text-xs uppercase tracking-widest">System Module</span>
            </div>
            <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
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
            <div className="flex flex-col items-center p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <Cpu size={14} className="mb-2 opacity-60" />
              <span className="text-xs font-mono">{stats.cpu}%</span>
              <span className="text-[8px] uppercase opacity-40 mt-1">CPU</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <Database size={14} className="mb-2 opacity-60" />
              <span className="text-xs font-mono">{stats.ram}MB</span>
              <span className="text-[8px] uppercase opacity-40 mt-1">RAM</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <Zap size={14} className="mb-2 opacity-60" />
              <span className="text-xs font-mono">{stats.threads}</span>
              <span className="text-[8px] uppercase opacity-40 mt-1">Threads</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
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
            <div className="p-3 rounded-lg border flex items-center gap-3" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <HardDrive size={16} className="opacity-40" />
              <div>
                <span className="text-[9px] uppercase opacity-40 block">Bundle Size</span>
                <span className="text-xs font-mono">{stats.bundleSize} KB</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border flex items-center gap-3" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <Calendar size={16} className="opacity-40" />
              <div>
                <span className="text-[9px] uppercase opacity-40 block">Last Modified</span>
                <span className="text-xs font-mono">{stats.lastModified}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border flex items-center gap-3" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <Wifi size={16} className="opacity-40" />
              <div>
                <span className="text-[9px] uppercase opacity-40 block">Latency</span>
                <span className="text-xs font-mono">{stats.latency}ms</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border flex items-center gap-3" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <Database size={16} className="opacity-40" />
              <div>
                <span className="text-[9px] uppercase opacity-40 block">Storage Quota</span>
                <span className="text-xs font-mono">{stats.storageQuota}MB</span>
              </div>
            </div>
            <div className="col-span-2 p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <span className="text-[9px] uppercase opacity-40 block mb-2 flex items-center gap-2">
                <Server size={10} /> API Endpoints
              </span>
              <div className="space-y-1">
                {stats.endpoints.map(e => (
                  <div key={e} className="text-[10px] font-mono opacity-80">{e}</div>
                ))}
              </div>
            </div>
            <div className="col-span-2 p-3 rounded-lg border flex items-center justify-between" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <div className="flex items-center gap-2">
                <Box size={14} className="opacity-40" />
                <span className="text-[9px] uppercase opacity-40">Cache Strategy</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--theme-text)' }}>{stats.cacheStatus}</span>
            </div>
            <div className="col-span-2 p-3 rounded-lg border space-y-3" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
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

            <div className="col-span-2 p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
              <span className="text-[9px] uppercase opacity-40 block mb-2 flex items-center gap-2">
                <LockIcon size={10} /> Active Permissions
              </span>
              <div className="flex flex-wrap gap-2">
                {stats.permissions.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded text-[8px] uppercase tracking-widest border" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)' }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--theme-border-color)' }}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Available Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => onOpenApp(app.id)}
              className="flex items-center gap-3 p-3 rounded-lg transition-colors group border hover:bg-white/5"
              style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)' }}
            >
              <Zap size={16} className="group-hover:scale-110 transition-transform" style={{ color: 'var(--theme-text)' }} />
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest block">Launch Application</span>
                <span className="text-[8px] opacity-40 uppercase">Start process instance</span>
              </div>
            </button>
            <button 
              onClick={() => onOpenSettings('desktop')}
              className="flex items-center gap-3 p-3 rounded-lg transition-colors group border hover:bg-white/5"
              style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 10%, transparent)' }}
            >
              <Monitor size={16} className="group-hover:scale-110 transition-transform" style={{ color: 'var(--theme-text)' }} />
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
      <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--theme-border-color)', backgroundColor: 'color-mix(in srgb, var(--theme-text) 5%, transparent)' }}>
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
