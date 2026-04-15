import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Folder, File, ChevronRight, ChevronLeft, Search, 
  Trash2, Download, Upload, Plus, MoreVertical, 
  FileText, Image as ImageIcon, Video, FileCode, 
  HardDrive, Home, Clock, Star, ArrowLeft, ArrowRight,
  FileDown, Loader2, Share2, Layout, Activity, Info
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
  const { theme, updateTheme } = useSettings();
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [iconSize, setIconSize] = useState<number>(64);
  const [history, setHistory] = useState<string[]>(['root']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Listen for file updates from other apps (like Properties)
  useEffect(() => {
    const handleUpdateFile = (e: any) => {
      const { fileId, updates } = e.detail;
      setItems(prev => {
        const next = prev.map(item => item.id === fileId ? { ...item, ...updates } : item);
        localStorage.setItem('hw_os_fs', JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('hw_os_update_file', handleUpdateFile);
    return () => window.removeEventListener('hw_os_update_file', handleUpdateFile);
  }, []);

  // Host Machine Connection
  const connectHost = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert("FILE SYSTEM ACCESS DENIED: Your browser does not support the File System Access API or you are not in a secure context. Please use a Chromium-based browser (Chrome, Edge) and ensure the site is served over HTTPS.");
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker();
      setHostHandle(handle);
      setCurrentFolderId('host-root');
      loadHostItems(handle);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Host connection failed", err);
      alert(`HOST_BRIDGE_ERROR: ${err.message}`);
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

  const handleContextMenu = (e: React.MouseEvent, item: any = null) => {
    console.log("MyFilesApp context menu", item);
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    setContextMenu({
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
      show: true,
      item
    });
  };

  const openFile = (item: any) => {
    if (item.type === 'folder') {
      navigateTo(item.id);
      return;
    }

    if (item.category === 'note' || item.category === 'tutorial' || item.type === 'file') {
      window.dispatchEvent(new CustomEvent('hw_os_open_app', { 
        detail: { appId: 'text_editor', initialProps: { file: item } } 
      }));
      return;
    }
  };

  const importHostFile = async (item: any) => {
    if (!item.isHost || item.type === 'folder') return;
    try {
      const file = await item.handle.getFile();
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const extension = file.name.split('.').pop()?.toLowerCase();
        const newItem: FileSystemItem = {
          id: crypto.randomUUID(),
          name: file.name.split('.')[0],
          type: 'file',
          extension,
          content,
          parentId: 'downloads', // Default to downloads
          createdAt: Date.now(),
          size: file.size,
          category: extension === 'pdf' ? 'pdf' : 'text'
        };
        saveFS([...items, newItem]);
        alert(`Imported ${file.name} to virtual database!`);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Import failed", err);
    }
  };

  const createShortcut = (item: any) => {
    const newShortcut = {
      id: crypto.randomUUID(),
      label: item.name,
      type: item.type,
      targetId: item.id,
      category: item.category
    };
    updateTheme(prev => ({
      ...prev,
      shortcuts: [...(prev.shortcuts || []), newShortcut]
    }));
    alert(`Shortcut for ${item.name} created on desktop!`);
  };

  const setAsWallpaper = (item: any) => {
    if (item.category !== 'image' || !item.content) return;
    updateTheme({ backgroundType: 'custom', customBackgroundUrl: item.content });
    alert("Wallpaper updated!");
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

  const pasteItem = () => {
    if (!clipboard) return;
    const newItem = { ...clipboard.item, id: crypto.randomUUID(), parentId: currentFolderId };
    const updated = [...items, newItem];
    if (clipboard.action === 'cut') {
      const filtered = updated.filter(i => i.id !== clipboard.item.id);
      saveFS(filtered);
      setClipboard(null);
    } else {
      saveFS(updated);
    }
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
      ref={containerRef}
      className="flex h-full select-none relative" 
      style={{ backgroundColor: 'var(--theme-panel-bg)', color: 'var(--theme-text)' }}
      onClick={() => setContextMenu(null)}
      onContextMenu={(e) => handleContextMenu(e)}
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
              {hostHandle ? hostHandle.name : 'Real PC'}
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
        <div className="h-12 border-b border-hw-blue/10 flex items-center px-4 gap-4 bg-hw-blue/5" style={{ borderColor: 'var(--theme-border-color)' }}>
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-hw-blue/5 rounded-lg p-0.5 border border-hw-blue/10">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewMode === 'grid' ? "bg-hw-blue/20 text-hw-blue" : "hover:bg-hw-blue/10 opacity-60"
                )}
              >
                <Layout size={14} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewMode === 'list' ? "bg-hw-blue/20 text-hw-blue" : "hover:bg-hw-blue/10 opacity-60"
                )}
              >
                <Activity size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 px-2 border-l border-hw-blue/10">
              <span className="text-[8px] uppercase opacity-40">Size</span>
              <input 
                type="range" 
                min="40" 
                max="120" 
                step="10"
                value={iconSize}
                onChange={(e) => setIconSize(parseInt(e.target.value))}
                className="w-16 h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
              />
            </div>

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
            <div 
              className={cn(
                "grid gap-4",
                viewMode === 'grid' 
                  ? "grid-cols-[repeat(auto-fill,minmax(var(--icon-size),1fr))]" 
                  : "grid-cols-1"
              )} 
              style={{ '--icon-size': `${iconSize}px` } as any}
              onContextMenu={(e) => handleContextMenu(e)}
            >
              {currentItems.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onDoubleClick={() => openFile(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className={cn(
                    "group relative flex items-center rounded-lg border border-transparent transition-all cursor-pointer",
                    viewMode === 'grid' ? "flex-col p-4 hover:bg-hw-blue/5 hover:border-hw-blue/10" : "flex-row gap-4 py-2 px-4 hover:bg-hw-blue/5"
                  )}
                >
                  <div className={cn(
                    "transition-transform group-hover:scale-110",
                    viewMode === 'grid' ? "mb-2" : "mb-0"
                  )} style={viewMode === 'grid' ? { width: iconSize * 0.6, height: iconSize * 0.6 } : {}}>
                    {getFileIcon(item)}
                  </div>
                  <div className={cn(
                    "w-full",
                    viewMode === 'grid' ? "text-center" : "text-left flex items-center justify-between flex-1"
                  )}>
                    <span className="text-[10px] font-bold uppercase tracking-tight truncate block">
                      {item.name}{item.extension ? `.${item.extension}` : ''}
                    </span>
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-6 text-[9px] uppercase opacity-40">
                        <span>{item.type}</span>
                        <span className="w-16 text-right">{item.size ? `${(item.size / 1024).toFixed(1)} KB` : '--'}</span>
                        <span className="w-24 text-right">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Context Actions (Hover) */}
                  <div className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                    viewMode === 'grid' ? "absolute top-1 right-1" : "ml-4"
                  )}>
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
            initial={{ opacity: 0, scale: 0.95, y: contextMenu.y > (containerRef.current?.clientHeight || window.innerHeight) - 250 ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: contextMenu.y > (containerRef.current?.clientHeight || window.innerHeight) - 250 ? 10 : -10 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "absolute z-[1000] shadow-2xl py-1 min-w-[180px] overflow-hidden origin-top-left",
              contextMenu.y > (containerRef.current?.clientHeight || window.innerHeight) - 250 && "origin-bottom-left",
              theme.globalTheme === 'glassy' ? "rounded-2xl backdrop-blur-md bg-black/40 border border-white/10" : "rounded-sm bg-hw-black border border-hw-blue/30"
            )}
            style={{ 
              left: Math.min(contextMenu.x, (containerRef.current?.clientWidth || window.innerWidth) - 190), 
              ...(contextMenu.y > (containerRef.current?.clientHeight || window.innerHeight) - 250 
                ? { bottom: (containerRef.current?.clientHeight || window.innerHeight) - contextMenu.y } 
                : { top: contextMenu.y })
            }}
          >
            {contextMenu.item ? (
              <div className="px-3 py-1 text-[8px] uppercase tracking-widest opacity-40 border-b border-hw-blue/10 mb-1 truncate">
                {contextMenu.item.name}
              </div>
            ) : (
              <div className="px-3 py-1 text-[8px] uppercase tracking-widest opacity-40 border-b border-hw-blue/10 mb-1 truncate">
                Files
              </div>
            )}
            
            {contextMenu.item && (
              <>
                <button 
                  onClick={() => { openFile(contextMenu.item); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <ArrowRight size={12} className="opacity-60" /> Open
                </button>

                {contextMenu.item.isHost && (
                  <button 
                    onClick={() => { importHostFile(contextMenu.item); setContextMenu(null); }}
                    className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors text-hw-blue"
                  >
                    <Download size={12} className="opacity-60" /> Import to DB
                  </button>
                )}

                {!contextMenu.item.isHost && contextMenu.item.type === 'file' && (
                  <button 
                    onClick={() => { 
                      const link = document.createElement('a');
                      link.href = contextMenu.item.content || '';
                      link.download = contextMenu.item.name || 'download';
                      link.click();
                      setContextMenu(null); 
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                  >
                    <FileDown size={12} className="opacity-60" /> Download to PC
                  </button>
                )}

                <button 
                  onClick={() => { createShortcut(contextMenu.item); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <Share2 size={12} className="opacity-60" /> Create Shortcut
                </button>

                {contextMenu.item.category === 'image' && (
                  <button 
                    onClick={() => { setAsWallpaper(contextMenu.item); setContextMenu(null); }}
                    className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                  >
                    <ImageIcon size={12} className="opacity-60" /> Set as Wallpaper
                  </button>
                )}

                <button className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors">
                  <MoreVertical size={12} className="opacity-60" /> Open With...
                </button>

                <button 
                  onClick={() => { window.dispatchEvent(new CustomEvent('hw_os_open_app', { detail: { id: 'properties', props: { file: contextMenu.item } } })); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <Info size={12} className="opacity-60" /> Properties
                </button>

                <div className="h-[1px] bg-hw-blue/10 my-1" />

                <button 
                  onClick={() => { setClipboard({ item: contextMenu.item, action: 'copy' }); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <ArrowRight size={12} className="opacity-60" /> Copy
                </button>

                <button 
                  onClick={() => { setClipboard({ item: contextMenu.item, action: 'cut' }); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <ArrowRight size={12} className="opacity-60" /> Cut
                </button>
              </>
            )}

            <button 
              disabled={!clipboard}
              onClick={() => { pasteItem(); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors disabled:opacity-20"
            >
              <ArrowRight size={12} className="opacity-60" /> Paste
            </button>

            {contextMenu.item && (
              <>
                <div className="h-[1px] bg-hw-blue/10 my-1" />
                <button 
                  onClick={() => { deleteItem(contextMenu.item.id); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-red-500/10 text-red-500 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <Trash2 size={12} className="opacity-60" /> Delete
                </button>
              </>
            )}
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
