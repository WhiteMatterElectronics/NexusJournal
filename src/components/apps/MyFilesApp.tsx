import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Folder, File, ChevronRight, ChevronLeft, Search, 
  Trash2, Download, Upload, Plus, MoreVertical, 
  FileText, Image as ImageIcon, Video, FileCode, 
  HardDrive, Home, Clock, Star, ArrowLeft, ArrowRight,
  FileDown, Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';

export interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  content?: string;
  parentId: string | null;
  createdAt: number;
  size?: number;
  category?: 'note' | 'tutorial' | 'pdf' | 'image' | 'video' | 'text';
  isVirtual?: boolean; // For synced notes/tutorials
}

const DEFAULT_STRUCTURE: FileSystemItem[] = [
  { id: 'root', name: 'Home', type: 'folder', parentId: null, createdAt: Date.now() },
  { id: 'downloads', name: 'Downloads', type: 'folder', parentId: 'root', createdAt: Date.now() },
  { id: 'pictures', name: 'Pictures', type: 'folder', parentId: 'root', createdAt: Date.now() },
  { id: 'videos', name: 'Videos', type: 'folder', parentId: 'root', createdAt: Date.now() },
  { id: 'documents', name: 'Documents', type: 'folder', parentId: 'root', createdAt: Date.now() },
  { id: 'notes', name: 'Notes', type: 'folder', parentId: 'documents', createdAt: Date.now() },
  { id: 'tutorials', name: 'Tutorials', type: 'folder', parentId: 'documents', createdAt: Date.now() },
];

export const MyFilesApp: React.FC = () => {
  const { theme } = useSettings();
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [history, setHistory] = useState<string[]>(['root']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Host Machine State
  const [hostHandle, setHostHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [hostItems, setHostItems] = useState<any[]>([]);
  const [isHostLoading, setIsHostLoading] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
    item: FileSystemItem | any;
    isHost?: boolean;
  } | null>(null);

  const [clipboard, setClipboard] = useState<{
    item: FileSystemItem;
    action: 'copy' | 'cut';
  } | null>(null);

  // Dynamic content states
  const [syncedNotes, setSyncedNotes] = useState<FileSystemItem[]>([]);
  const [syncedTutorials, setSyncedTutorials] = useState<FileSystemItem[]>([]);

  // Load File System
  useEffect(() => {
    const saved = localStorage.getItem('hw_os_fs');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        setItems(DEFAULT_STRUCTURE);
      }
    } else {
      setItems(DEFAULT_STRUCTURE);
      localStorage.setItem('hw_os_fs', JSON.stringify(DEFAULT_STRUCTURE));
    }
  }, []);

  // Host Machine Connection
  const connectHost = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setHostHandle(handle);
      setCurrentFolderId('host-root');
      loadHostItems(handle);
    } catch (err) {
      console.error("Host connection failed", err);
    }
  };

  const loadHostItems = async (handle: FileSystemDirectoryHandle) => {
    setIsHostLoading(true);
    try {
      const entries: any[] = [];
      for await (const entry of (handle as any).values()) {
        entries.push(entry);
      }
      setHostItems(entries);
    } catch (err) {
      console.error("Failed to load host items", err);
    } finally {
      setIsHostLoading(false);
    }
  };

  // Sync Notes
  useEffect(() => {
    const syncNotes = () => {
      const saved = localStorage.getItem('hw_os_notes');
      if (saved) {
        try {
          const notes = JSON.parse(saved);
          const virtualNotes: FileSystemItem[] = notes.map((n: any) => ({
            id: `note-${n.id}`,
            name: n.title,
            type: 'file',
            extension: 'note',
            parentId: 'notes',
            createdAt: n.timestamp,
            category: 'note',
            isVirtual: true,
            content: n.content
          }));
          setSyncedNotes(virtualNotes);
        } catch (e) {
          console.error("Sync notes failed", e);
        }
      }
    };

    syncNotes();
    window.addEventListener('hw_os_notes_updated', syncNotes);
    return () => window.removeEventListener('hw_os_notes_updated', syncNotes);
  }, []);

  // Sync Tutorials
  useEffect(() => {
    const syncTutorials = async () => {
      try {
        const res = await fetch('/api/tutorials');
        const data = await res.json();
        const virtualTutorials: FileSystemItem[] = data.map((t: any) => ({
          id: `tutorial-${t.id}`,
          name: t.title,
          type: 'file',
          extension: 'tutorial',
          parentId: 'tutorials',
          createdAt: Date.now(),
          category: 'tutorial',
          isVirtual: true,
          content: t.content
        }));
        setSyncedTutorials(virtualTutorials);
      } catch (e) {
        console.error("Sync tutorials failed", e);
      }
    };

    syncTutorials();
  }, []);

  // Save File System
  const saveFS = useCallback((newItems: FileSystemItem[]) => {
    setItems(newItems);
    localStorage.setItem('hw_os_fs', JSON.stringify(newItems));
    window.dispatchEvent(new Event('hw_os_fs_updated'));
  }, []);

  // Listen for external save requests
  useEffect(() => {
    const handleExternalSave = (e: any) => {
      const { file } = e.detail;
      if (!file) return;

      setItems(prev => {
        const newItem: FileSystemItem = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          ...file
        };
        const updated = [...prev, newItem];
        localStorage.setItem('hw_os_fs', JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener('hw_os_save_file', handleExternalSave);
    return () => window.removeEventListener('hw_os_save_file', handleExternalSave);
  }, []);

  const currentFolder = useMemo(() => {
    if (currentFolderId === 'host-root') return { name: hostHandle?.name || 'Host Root', id: 'host-root' };
    return items.find(i => i.id === currentFolderId);
  }, [items, currentFolderId, hostHandle]);
  
  const currentItems = useMemo(() => {
    if (currentFolderId === 'host-root') {
      return hostItems.map(entry => ({
        id: entry.name,
        name: entry.name,
        type: entry.kind === 'directory' ? 'folder' : 'file',
        parentId: 'host-root',
        createdAt: Date.now(),
        isHost: true,
        handle: entry
      }));
    }

    let combined = [...items];
    if (currentFolderId === 'notes') combined = [...combined, ...syncedNotes];
    if (currentFolderId === 'tutorials') combined = [...combined, ...syncedTutorials];

    let filtered = combined.filter(i => i.parentId === currentFolderId);
    
    if (searchTerm) {
      filtered = combined.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) && i.type === 'file');
    }
    
    return filtered.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  }, [items, currentFolderId, searchTerm, syncedNotes, syncedTutorials, hostItems]);

  const breadcrumbs = useMemo(() => {
    if (currentFolderId === 'host-root') return [{ id: 'host-root', name: hostHandle?.name || 'Host Machine' }];
    const path: FileSystemItem[] = [];
    let current = currentFolder as FileSystemItem;
    while (current) {
      path.unshift(current);
      current = items.find(i => i.id === current?.parentId) as FileSystemItem;
    }
    return path;
  }, [items, currentFolder, currentFolderId, hostHandle]);

  const navigateTo = (folderId: string) => {
    if (folderId === currentFolderId) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(folderId);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentFolderId(folderId);
    setSearchTerm('');
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentFolderId(history[historyIndex - 1]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentFolderId(history[historyIndex + 1]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      show: true,
      item
    });
  };

  const deleteItem = (id: string) => {
    if (id.startsWith('note-') || id.startsWith('tutorial-')) {
      alert("Cannot delete synced system files from here. Use the respective app.");
      return;
    }
    if (DEFAULT_STRUCTURE.some(i => i.id === id)) {
      alert("Cannot delete system folders.");
      return;
    }
    const updated = items.filter(i => i.id !== id && i.parentId !== id);
    saveFS(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      let category: FileSystemItem['category'] = 'text';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) category = 'image';
      if (['mp4', 'webm', 'ogg'].includes(extension || '')) category = 'video';
      if (extension === 'pdf') category = 'pdf';

      const newItem: FileSystemItem = {
        id: crypto.randomUUID(),
        name: file.name.split('.')[0],
        type: 'file',
        extension,
        content,
        parentId: currentFolderId,
        createdAt: Date.now(),
        size: file.size,
        category
      };

      saveFS([...items, newItem]);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const getFileIcon = (item: any) => {
    if (item.type === 'folder') return <Folder className="text-hw-blue/60" />;
    switch (item.category) {
      case 'note': return <FileText className="text-hw-blue" />;
      case 'tutorial': return <FileCode className="text-green-400" />;
      case 'pdf': return <FileDown className="text-red-400" />;
      case 'image': return <ImageIcon className="text-purple-400" />;
      case 'video': return <Video className="text-orange-400" />;
      default: return <File className="text-hw-blue/40" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div 
      className="flex h-full select-none relative" 
      style={{ backgroundColor: 'var(--theme-panel-bg)', color: 'var(--theme-text)' }}
      onClick={() => setContextMenu(null)}
    >
      {/* Sidebar */}
      <div className="w-48 border-r border-hw-blue/10 flex flex-col bg-hw-blue/5" style={{ borderColor: 'var(--theme-border-color)' }}>
        <div className="p-4 space-y-1">
          <div className="text-[9px] uppercase tracking-widest opacity-40 mb-2 px-2">Quick Access</div>
          {[
            { id: 'root', label: 'Home', icon: Home },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'downloads', label: 'Downloads', icon: Download },
            { id: 'pictures', label: 'Pictures', icon: ImageIcon },
            { id: 'videos', label: 'Videos', icon: Video },
          ].map(link => (
            <button
              key={link.id}
              onClick={() => navigateTo(link.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-colors",
                currentFolderId === link.id ? "bg-hw-blue/20 text-hw-blue" : "hover:bg-hw-blue/10 opacity-70 hover:opacity-100"
              )}
            >
              <link.icon size={14} />
              {link.label}
            </button>
          ))}

          <div className="pt-4">
            <div className="text-[9px] uppercase tracking-widest opacity-40 mb-2 px-2">Host Machine</div>
            <button
              onClick={connectHost}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-colors",
                currentFolderId === 'host-root' ? "bg-hw-blue/20 text-hw-blue" : "hover:bg-hw-blue/10 opacity-70 hover:opacity-100"
              )}
            >
              <HardDrive size={14} />
              {hostHandle ? hostHandle.name : 'Connect PC'}
            </button>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-hw-blue/10" style={{ borderColor: 'var(--theme-border-color)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase opacity-40">Storage</span>
            <span className="text-[9px] font-mono">1.2 GB / 5 GB</span>
          </div>
          <div className="h-1 bg-hw-blue/10 rounded-full overflow-hidden">
            <div className="h-full bg-hw-blue w-[24%]" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 border-b border-hw-blue/10 flex items-center px-4 gap-4" style={{ borderColor: 'var(--theme-border-color)' }}>
          <div className="flex items-center gap-1">
            <button 
              onClick={goBack} 
              disabled={historyIndex === 0}
              className="p-1.5 hover:bg-hw-blue/10 rounded disabled:opacity-20 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={goForward} 
              disabled={historyIndex === history.length - 1}
              className="p-1.5 hover:bg-hw-blue/10 rounded disabled:opacity-20 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight size={12} className="opacity-30 shrink-0" />}
                <button 
                  onClick={() => navigateTo(crumb.id)}
                  className="text-[10px] font-bold uppercase tracking-widest hover:text-hw-blue transition-colors truncate"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" />
              <input 
                type="text" 
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-hw-blue/5 border border-hw-blue/10 rounded-full py-1.5 pl-8 pr-4 text-[10px] outline-none focus:border-hw-blue/40 transition-colors"
                style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
              />
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-hw-blue text-hw-black px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all shadow-[0_0_10px_rgba(0,242,255,0.2)]"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>
        </div>

        {/* File Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isHostLoading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Loader2 size={32} className="animate-spin mb-4" />
              <span className="text-[10px] uppercase tracking-widest">Accessing Host Filesystem...</span>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Folder size={48} className="mb-4" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Folder is empty</span>
            </div>
          ) : (
            <div className={cn(
              "grid gap-4",
              viewMode === 'grid' ? "grid-cols-[repeat(auto-fill,minmax(100px,1fr))]" : "grid-cols-1"
            )}>
              {currentItems.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onDoubleClick={() => item.type === 'folder' ? navigateTo(item.id) : null}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className={cn(
                    "group relative flex flex-col items-center p-4 rounded-lg border border-transparent transition-all cursor-pointer",
                    viewMode === 'grid' ? "hover:bg-hw-blue/5 hover:border-hw-blue/10" : "flex-row gap-4 py-2"
                  )}
                >
                  <div className={cn(
                    "mb-2 transition-transform group-hover:scale-110",
                    viewMode === 'list' && "mb-0"
                  )}>
                    {getFileIcon(item)}
                  </div>
                  <div className={cn(
                    "text-center w-full",
                    viewMode === 'list' && "text-left flex items-center justify-between"
                  )}>
                    <span className="text-[10px] font-bold uppercase tracking-tight truncate block">
                      {item.name}{item.extension ? `.${item.extension}` : ''}
                    </span>
                    {viewMode === 'list' && (
                      <span className="text-[9px] opacity-40 font-mono">{formatSize(item.size)}</span>
                    )}
                  </div>

                  {/* Context Actions (Hover) */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {!item.isVirtual && !item.isHost && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                        className="p-1 hover:bg-red-500/20 text-red-500 rounded"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                    {item.isVirtual && (
                      <div className="px-1.5 py-0.5 bg-hw-blue/20 text-hw-blue text-[7px] font-bold rounded uppercase tracking-tighter">
                        Synced
                      </div>
                    )}
                    {item.isHost && (
                      <div className="px-1.5 py-0.5 bg-green-500/20 text-green-500 text-[7px] font-bold rounded uppercase tracking-tighter">
                        Host
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-8 border-t border-hw-blue/10 px-4 flex items-center justify-between text-[9px] uppercase tracking-widest opacity-40" style={{ borderColor: 'var(--theme-border-color)' }}>
          <span>{currentItems.length} Items</span>
          <span>{currentFolder?.name}</span>
        </div>
      </div>

      {/* Custom Context Menu */}
      <AnimatePresence>
        {contextMenu?.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-[1000] bg-hw-black border border-hw-blue/30 shadow-2xl rounded-sm py-1 min-w-[160px]"
            style={{ left: contextMenu.x - 20, top: contextMenu.y - 20 }}
          >
            <div className="px-3 py-1 text-[8px] uppercase tracking-widest opacity-40 border-b border-hw-blue/10 mb-1">
              {contextMenu.item.name}
            </div>
            
            <button className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors">
              <ArrowRight size={12} className="opacity-60" /> Open
            </button>

            <button className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors">
              <MoreVertical size={12} className="opacity-60" /> Open With...
            </button>

            <div className="h-[1px] bg-hw-blue/10 my-1" />

            <button 
              onClick={() => setClipboard({ item: contextMenu.item, action: 'copy' })}
              className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
            >
              <ArrowRight size={12} className="opacity-60" /> Copy
            </button>

            <button 
              onClick={() => setClipboard({ item: contextMenu.item, action: 'cut' })}
              className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
            >
              <ArrowRight size={12} className="opacity-60" /> Cut
            </button>

            <button 
              disabled={!clipboard}
              className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors disabled:opacity-20"
            >
              <ArrowRight size={12} className="opacity-60" /> Paste
            </button>

            <div className="h-[1px] bg-hw-blue/10 my-1" />

            <button 
              onClick={() => deleteItem(contextMenu.item.id)}
              className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-red-500/10 text-red-500 flex items-center gap-2 uppercase tracking-widest transition-colors"
            >
              <Trash2 size={12} className="opacity-60" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 242, 255, 0.2); }
      `}</style>
    </div>
  );
};
