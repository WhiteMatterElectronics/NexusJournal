import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder, File, ChevronRight, Search, 
  HardDrive, Home, Clock, Star, ArrowLeft,
  Loader2, X, Check
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings, ThemeBase } from '../../contexts/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { FileSystemItem } from '../apps/MyFilesApp';

interface UniversalFilePickerProps {
  mode: 'open' | 'save';
  allowedExtensions?: string[];
  onSelect: (item: FileSystemItem | { path: string, name: string, isHost: boolean }) => void;
  onCancel: () => void;
  title?: string;
  initialPath?: string;
  defaultFileName?: string;
}

export const UniversalFilePicker: React.FC<UniversalFilePickerProps> = ({
  mode,
  allowedExtensions,
  onSelect,
  onCancel,
  title,
  initialPath,
  defaultFileName = 'document'
}) => {
  const { theme } = useSettings();
  const isGlassy = theme.globalTheme === 'glassy';

  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [hostPath, setHostPath] = useState<string>('/');
  const [hostItems, setHostItems] = useState<any[]>([]);
  const [isHostLoading, setIsHostLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [fileName, setFileName] = useState(defaultFileName);
  const fileNameRef = React.useRef<HTMLInputElement>(null);

  // Auto-select filename base on mount in save mode
  useEffect(() => {
    if (mode === 'save' && fileNameRef.current) {
      const input = fileNameRef.current;
      const lastDot = fileName.lastIndexOf('.');
      if (lastDot > 0) {
        input.setSelectionRange(0, lastDot);
      } else {
        input.select();
      }
      input.focus();
    }
  }, [mode]);

  // Load Virtual File System
  useEffect(() => {
    const loadFS = () => {
      const saved = localStorage.getItem('hw_os_fs');
      if (saved) {
        try {
          setItems(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load FS for picker");
        }
      }
    };
    loadFS();
    window.addEventListener('hw_os_fs_updated', loadFS);
    return () => window.removeEventListener('hw_os_fs_updated', loadFS);
  }, []);

  const loadHostItems = async (path: string) => {
    setIsHostLoading(true);
    try {
      if ((window as any).electron && (window as any).electron.fs) {
        const entries = await (window as any).electron.fs.readdir(path);
        const itemsWithStats = entries.map((entryObj: any) => {
          const entryPath = path === '/' ? `/${entryObj.name}` : `${path}/${entryObj.name}`;
          return {
            name: entryObj.name,
            kind: entryObj.isDirectory ? 'directory' : 'file',
            size: entryObj.size,
            path: entryPath,
            modifiedAt: entryObj.mtimeMs
          };
        });
        setHostItems(itemsWithStats);
      }
    } catch (err) {
      console.error("Failed to load host items", err);
    } finally {
      setIsHostLoading(false);
    }
  };

  const connectHost = async () => {
    setCurrentFolderId('host-root');
    let startPath = '/';
    if ((window as any).electron && (window as any).electron.fs?.getHomeDir) {
      startPath = await (window as any).electron.fs.getHomeDir();
    }
    setHostPath(startPath);
    loadHostItems(startPath);
  };

  const currentItems = useMemo(() => {
    if (currentFolderId === 'host-root') {
      const entries = hostItems.map(entry => ({
        id: `host-${entry.path}`,
        name: entry.name,
        type: entry.kind === 'directory' ? 'folder' : 'file',
        parentId: 'host-root',
        isHost: true,
        path: entry.path,
        size: entry.size
      } as any));

      if (hostPath !== '/') {
        entries.unshift({
          id: 'host-..',
          name: '..',
          type: 'folder',
          isHost: true,
          path: hostPath.substring(0, hostPath.lastIndexOf('/')) || '/'
        });
      }
      return entries;
    }

    return items.filter(i => i.parentId === currentFolderId);
  }, [items, currentFolderId, hostItems, hostPath]);

  const filteredItems = useMemo(() => {
    let base = currentItems;
    if (searchTerm) {
      base = base.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (mode === 'open' && allowedExtensions) {
      base = base.filter(i => {
        if (i.type === 'folder') return true;
        const name = i.name || '';
        const ext = i.extension || '';
        return allowedExtensions.some(allowedExt => {
          const cleanExt = allowedExt.startsWith('.') ? allowedExt.substring(1) : allowedExt;
          return name.toLowerCase().endsWith(`.${cleanExt.toLowerCase()}`) || ext.toLowerCase() === cleanExt.toLowerCase();
        });
      });
    }
    return base;
  }, [currentItems, searchTerm, mode, allowedExtensions]);

  const handleItemClick = (item: any) => {
    if (item.type === 'folder') {
      if (item.isHost) {
        setHostPath(item.path);
        loadHostItems(item.path);
      } else {
        setCurrentFolderId(item.id);
      }
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  };

  const handleConfirm = () => {
    if (mode === 'open' && selectedItem) {
      onSelect(selectedItem);
    } else if (mode === 'save') {
      // Return the current folder path + chosen filename
      if (currentFolderId === 'host-root') {
        onSelect({ path: hostPath, name: fileName, isHost: true } as any);
      } else {
        onSelect({ id: currentFolderId, name: fileName, isHost: false } as any);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "w-full max-w-2xl h-[550px] flex flex-col border shadow-2xl overflow-hidden",
          isGlassy ? "rounded-3xl bg-hw-black/90 border-white/10" : "rounded-sm bg-hw-black border-hw-blue/30"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-hw-blue/10 flex items-center justify-between bg-hw-blue/5">
          <div className="flex items-center gap-3">
            <Folder className="text-hw-blue" size={20} />
            <h3 className="text-sm font-bold uppercase tracking-widest text-hw-blue">
              {title || (mode === 'open' ? 'Select File' : 'Save As')}
            </h3>
          </div>
          <button onClick={onCancel} className="text-hw-blue/40 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-40 border-r border-hw-blue/10 p-2 space-y-1 bg-black/20">
            <button 
              onClick={() => setCurrentFolderId('root')}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold uppercase transition-all",
                currentFolderId !== 'host-root' ? "bg-hw-blue/20 text-hw-blue" : "hover:bg-hw-blue/10 opacity-60"
              )}
            >
              <Home size={14} /> Home
            </button>
            <button 
              onClick={connectHost}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold uppercase transition-all",
                currentFolderId === 'host-root' ? "bg-green-500/20 text-green-400" : "hover:bg-green-500/10 opacity-60"
              )}
            >
              <HardDrive size={14} /> Real PC
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Toolbar */}
            <div className="p-2 border-b border-hw-blue/10 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-30" />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-hw-blue/5 border border-hw-blue/10 rounded-full py-1 pl-8 pr-4 text-[10px] outline-none focus:border-hw-blue/40"
                  style={{ color: 'var(--theme-text)' }}
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-4 auto-rows-max custom-scrollbar">
              {isHostLoading ? (
                <div className="col-span-4 h-full flex items-center justify-center opacity-40">
                  <Loader2 className="animate-spin mr-2" size={16} />
                  <span className="text-[10px] uppercase tracking-widest">Reading...</span>
                </div>
              ) : filteredItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => {
                    if (item.type === 'folder') handleItemClick(item);
                    else {
                      if (mode === 'open') {
                        setSelectedItem(item);
                        onSelect(item);
                      } else {
                        // In save mode, clicking a file might mean "overwrite" or just select its name
                        setFileName(item.name);
                      }
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg cursor-pointer border border-transparent transition-all group",
                    (mode === 'open' && selectedItem?.id === item.id) ? "bg-hw-blue/20 border-hw-blue/30" : "hover:bg-hw-blue/5"
                  )}
                >
                  <div className="mb-2 transition-transform group-hover:scale-110">
                    {item.type === 'folder' ? (
                      <Folder size={32} className={cn(item.isHost ? "text-green-500/60" : "text-hw-blue/60")} />
                    ) : (
                      <File size={32} className="text-hw-blue/40" />
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-tight text-center line-clamp-2 break-all opacity-80 group-hover:opacity-100">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Save Filename Input */}
            {mode === 'save' && (
              <div className="p-4 bg-black/20 border-t border-hw-blue/10">
                <label className="block text-[8px] font-bold uppercase tracking-widest text-hw-blue/40 mb-2">File Name</label>
                <div className="flex gap-2">
                  <input 
                    ref={fileNameRef}
                    type="text"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleConfirm();
                    }}
                    className="flex-1 bg-hw-blue/5 border border-hw-blue/20 rounded px-3 py-2 text-xs font-bold outline-none focus:border-hw-blue transition-all"
                    style={{ color: 'var(--theme-text)' }}
                  />
                  <div className="flex items-center px-3 bg-hw-blue/10 border border-hw-blue/20 rounded text-[10px] font-bold uppercase text-hw-blue opacity-60">
                    {allowedExtensions?.[0] || '.pdf'}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-hw-blue/10 flex items-center justify-between bg-hw-blue/5">
              <div className="text-[9px] uppercase tracking-widest opacity-40 truncate flex-1 mr-4">
                {currentFolderId === 'host-root' ? hostPath : 'Virtual Database'}
                {selectedItem && ` > ${selectedItem.name}`}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={onCancel}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={mode === 'open' ? !selectedItem : !fileName}
                  className="px-6 py-2 bg-hw-blue text-hw-black text-[10px] font-bold uppercase tracking-widest rounded hover:bg-white transition-all disabled:opacity-20"
                >
                  {mode === 'open' ? 'Open' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
