import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Folder, File, ChevronRight, ChevronLeft, Search, 
  Trash2, Download, Upload, Plus, MoreVertical, 
  FileText, Image as ImageIcon, Video, FileCode, 
  HardDrive, Home, Clock, Star, ArrowLeft, ArrowRight,
  FileDown, Loader2, Share2, Layout, Activity, Info,
  BookOpen, Globe, ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import { useTrash } from '../../contexts/TrashContext';
import { motion, AnimatePresence } from 'motion/react';
import { AppView } from '../../types';

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
  isHost?: boolean;
  isStarred?: boolean;
  defaultApp?: AppView;
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
  const { trashFile } = useTrash();
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [iconSize, setIconSize] = useState<number>(120);
  const [history, setHistory] = useState<string[]>(['root']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const [inputDialog, setInputDialog] = useState<{
    show: boolean;
    title: string;
    defaultValue: string;
    onConfirm: (value: string) => void;
    type: 'folder' | 'file';
  } | null>(null);

  // Host Machine State
  const [hostHandle, setHostHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [hostItems, setHostItems] = useState<any[]>([]);
  const [isHostLoading, setIsHostLoading] = useState(false);
  const instanceId = useMemo(() => crypto.randomUUID(), []);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
    item: FileSystemItem | any;
    isHost?: boolean;
  } | null>(null);

  const [clipboard, setClipboard] = useState<{
    items: FileSystemItem[];
    action: 'copy' | 'cut';
  } | null>(() => {
    const saved = localStorage.getItem('hw_os_clipboard');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync clipboard and file system with other instances
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hw_os_clipboard') {
        try {
          setClipboard(e.newValue ? JSON.parse(e.newValue) : null);
        } catch (err) {
          console.error("Clipboard sync failed", err);
        }
      }
      if (e.key === 'hw_os_fs' && e.newValue) {
        try {
          setItems(JSON.parse(e.newValue));
        } catch (err) {
          console.error("FS sync failed", err);
        }
      }
    };

    const handleLocalSync = (e: any) => {
      // Ignore events from this instance
      if (e.detail?.sourceId === instanceId) return;
      
      const saved = localStorage.getItem('hw_os_fs');
      if (saved) {
        try {
          setItems(JSON.parse(saved));
        } catch (err) {
          console.error("Local sync failed", err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('hw_os_fs_updated', handleLocalSync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('hw_os_fs_updated', handleLocalSync);
    };
  }, [instanceId]);

  const updateClipboard = (newClipboard: { items: FileSystemItem[], action: 'copy' | 'cut' } | null) => {
    setClipboard(newClipboard);
    if (newClipboard) {
      localStorage.setItem('hw_os_clipboard', JSON.stringify(newClipboard));
    } else {
      localStorage.removeItem('hw_os_clipboard');
    }
    // Dispatch local event for same-window instances if any
    window.dispatchEvent(new CustomEvent('hw_os_clipboard_updated', { detail: newClipboard }));
  };

  useEffect(() => {
    const handleLocalClipboard = (e: any) => {
      setClipboard(e.detail);
    };
    window.addEventListener('hw_os_clipboard_updated', handleLocalClipboard);
    return () => window.removeEventListener('hw_os_clipboard_updated', handleLocalClipboard);
  }, []);

  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

  // Dynamic content states
  const [syncedNotes, setSyncedNotes] = useState<FileSystemItem[]>([]);
  const [syncedTutorials, setSyncedTutorials] = useState<FileSystemItem[]>([]);

  const allFileSystemItems = useMemo(() => {
    return [...items, ...syncedNotes, ...syncedTutorials];
  }, [items, syncedNotes, syncedTutorials]);

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

  // Listen for file restorations from Trash
  useEffect(() => {
    const handleRestoreFile = (e: any) => {
      const item = e.detail;
      setItems(prev => {
        // Only add if it doesn't already exist
        if (prev.find(i => i.id === item.id)) return prev;
        const next = [...prev, { ...item, parentId: item.originalParentId || 'root' }];
        localStorage.setItem('hw_os_fs', JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('hw_os_restore_file', handleRestoreFile);
    return () => window.removeEventListener('hw_os_restore_file', handleRestoreFile);
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
            content: n.content,
            size: new Blob([n.content || '']).size
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
          content: t.content,
          size: new Blob([t.content || '']).size
        }));
        setSyncedTutorials(virtualTutorials);
      } catch (e) {
        console.error("Sync tutorials failed", e);
      }
    };

    syncTutorials();
  }, []);

  // Save File System
  const saveFS = useCallback((newItemsOrUpdater: FileSystemItem[] | ((prev: FileSystemItem[]) => FileSystemItem[])) => {
    setItems(prev => {
      const next = typeof newItemsOrUpdater === 'function' ? newItemsOrUpdater(prev) : newItemsOrUpdater;
      localStorage.setItem('hw_os_fs', JSON.stringify(next));
      // Use setTimeout to avoid "Cannot update a component while rendering a different component"
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('hw_os_fs_updated', { detail: { sourceId: instanceId } }));
      }, 0);
      return next;
    });
  }, [instanceId]);

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
    let baseItems: FileSystemItem[] = [];

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

    if (currentFolderId === 'recent') {
      baseItems = [...items, ...syncedNotes, ...syncedTutorials]
        .filter(i => i.type === 'file');
    } else if (currentFolderId === 'starred') {
      baseItems = items.filter(i => i.isStarred);
    } else {
      let combined = [...items];
      if (currentFolderId === 'notes') combined = [...combined, ...syncedNotes];
      if (currentFolderId === 'tutorials') combined = [...combined, ...syncedTutorials];
      baseItems = combined.filter(i => i.parentId === currentFolderId);
    }

    if (searchTerm) {
      baseItems = [...items, ...syncedNotes, ...syncedTutorials].filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) && i.type === 'file'
      );
    }

    const sorted = [...baseItems].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'date') comparison = a.createdAt - b.createdAt;
      else if (sortBy === 'size') comparison = getItemSize(a) - getItemSize(b);

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return currentFolderId === 'recent' ? sorted.slice(0, 20) : sorted;
  }, [items, currentFolderId, searchTerm, syncedNotes, syncedTutorials, hostItems, sortBy, sortOrder]);

  const breadcrumbs = useMemo(() => {
    if (currentFolderId === 'host-root') return [{ id: 'host-root', name: hostHandle?.name || 'Host Machine' }];
    if (currentFolderId === 'recent') return [{ id: 'recent', name: 'Recent' }];
    if (currentFolderId === 'starred') return [{ id: 'starred', name: 'Starred' }];
    
    const path: FileSystemItem[] = [];
    let current = items.find(i => i.id === currentFolderId);
    while (current) {
      path.unshift(current);
      current = items.find(i => i.id === current?.parentId) as FileSystemItem;
    }
    if (path.length === 0 && currentFolderId === 'root') {
      path.push({ id: 'root', name: 'Home', type: 'folder', parentId: null, createdAt: 0 });
    }
    return path;
  }, [items, currentFolderId, hostHandle]);

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

  const openFile = (item: any, forceAppId?: AppView) => {
    if (item.type === 'folder') {
      navigateTo(item.id);
      return;
    }

    let appId: AppView = forceAppId || item.defaultApp || 'text_editor';
    
    if (!forceAppId && !item.defaultApp) {
      if (item.extension === 'note' || item.category === 'note') appId = 'notes';
      else if (item.extension === 'tutorial' || item.category === 'tutorial') appId = 'tutorials';
      else if (item.category === 'image') appId = 'text_editor';
    }

    window.dispatchEvent(new CustomEvent('hw_os_open_app', { 
      detail: { appId, initialProps: { file: item } } 
    }));
  };

  const setDefaultApp = (itemId: string, appId: AppView) => {
    saveFS(prev => prev.map(i => i.id === itemId ? { ...i, defaultApp: appId } : i));
    alert(`Default app updated!`);
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
        saveFS(prev => [...prev, newItem]);
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

   const createNewFile = (type: 'text' | 'tutorial') => {
    setInputDialog({
      show: true,
      title: `Create New ${type === 'text' ? 'Note' : 'Tutorial'}`,
      defaultValue: `New ${type === 'text' ? 'Note' : 'Tutorial'}`,
      type: 'file',
      onConfirm: (name) => {
        const newItem: FileSystemItem = {
          id: crypto.randomUUID(),
          name: name,
          type: 'file',
          extension: type === 'text' ? 'txt' : 'tutorial',
          parentId: currentFolderId,
          createdAt: Date.now(),
          category: type === 'text' ? 'note' : 'tutorial',
          content: '',
          size: 0
        };
        saveFS(prev => [...prev, newItem]);
        setInputDialog(null);
      }
    });
  };

  const createNewFolder = () => {
    console.log("Creating new folder. Current items count:", items.length);
    setInputDialog({
      show: true,
      title: "Create New Folder",
      defaultValue: "New Folder",
      type: 'folder',
      onConfirm: (name) => {
        // Ensure we don't create folders in virtual views
        const targetParentId = ['recent', 'starred', 'host-root'].includes(currentFolderId) ? 'root' : currentFolderId;

        const newItem: FileSystemItem = {
          id: crypto.randomUUID(),
          name: name,
          type: 'folder',
          parentId: targetParentId,
          createdAt: Date.now()
        };
        
        saveFS(prev => {
          // Check if folder with exact name already exists in target parent to prevent visual duplicates
          const nameExists = prev.some(i => i.parentId === targetParentId && i.name.toLowerCase() === name.toLowerCase() && i.type === 'folder');
          if (nameExists) return prev;
          
          const exists = prev.some(i => i.id === newItem.id);
          if (exists) return prev;
          const next = [...prev, newItem];
          console.log("Folder added. New count:", next.length);
          return next;
        });
        
        // If we were in a virtual view, navigate to root to see the new folder
        if (targetParentId !== currentFolderId) {
          navigateTo('root');
        }
        setInputDialog(null);
      }
    });
  };

  const renameItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (DEFAULT_STRUCTURE.some(i => i.id === id)) {
      alert("Cannot rename system folders.");
      return;
    }

    const newName = prompt("Enter new name:", item.name);
    if (!newName || newName === item.name) return;

    saveFS(prev => prev.map(i => i.id === id ? { ...i, name: newName } : i));
  };

  const setAsWallpaper = (item: any) => {
    if (item.category !== 'image' || !item.content) return;
    updateTheme({ backgroundType: 'custom', customBackgroundUrl: item.content });
    alert("Wallpaper updated!");
  };

  const deleteItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    if (DEFAULT_STRUCTURE.some(ds => ds.id === id)) {
      alert("Cannot delete system folders.");
      return;
    }

    trashFile(item);

    const getAllDescendantIds = (parentId: string, allItems: FileSystemItem[]): string[] => {
      const children = allItems.filter(i => i.parentId === parentId);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        if (c.type === 'folder') {
          ids = [...ids, ...getAllDescendantIds(c.id, allItems)];
        }
      });
      return ids;
    };

    const idsToRemove = new Set([id]);
    if (item.type === 'folder') {
      getAllDescendantIds(id, items).forEach(descId => idsToRemove.add(descId));
    }

    saveFS(prev => prev.filter(i => !idsToRemove.has(i.id)));
  };

  const deleteSelected = () => {
    const itemsToDelete = items.filter(i => selectedItems.includes(i.id));
    if (itemsToDelete.length === 0) return;

    // Check for system folders
    if (itemsToDelete.some(i => DEFAULT_STRUCTURE.some(ds => ds.id === i.id))) {
      alert("Cannot delete system folders.");
      return;
    }

    // Trash them
    itemsToDelete.forEach(item => trashFile(item));

    // Remove from FS (including all descendants if folder)
    const getAllDescendantIds = (parentId: string, allItems: FileSystemItem[]): string[] => {
      const children = allItems.filter(i => i.parentId === parentId);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        if (c.type === 'folder') {
          ids = [...ids, ...getAllDescendantIds(c.id, allItems)];
        }
      });
      return ids;
    };

    const idsToRemove = new Set(selectedItems);
    itemsToDelete.forEach(item => {
      if (item.type === 'folder') {
        getAllDescendantIds(item.id, items).forEach(id => idsToRemove.add(id));
      }
    });

    saveFS(prev => prev.filter(i => !idsToRemove.has(i.id)));
    setSelectedItems([]);
  };

  const copySelected = () => {
    const itemsToCopy = allFileSystemItems.filter(item => selectedItems.includes(item.id));
    updateClipboard({ items: itemsToCopy, action: 'copy' });
  };

  const cutSelected = () => {
    const itemsToCut = allFileSystemItems.filter(item => selectedItems.includes(item.id));
    updateClipboard({ items: itemsToCut, action: 'cut' });
  };

  const pasteItem = () => {
    if (!clipboard) return;

    if (clipboard.action === 'copy') {
      const newItems = clipboard.items.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        parentId: currentFolderId,
        createdAt: Date.now()
      }));
      saveFS(prev => [...prev, ...newItems]);
    } else if (clipboard.action === 'cut') {
      // Move: update parentId of existing items
      saveFS(prev => prev.map(item => {
        if (clipboard.items.some(c => c.id === item.id)) {
          return { ...item, parentId: currentFolderId };
        }
        return item;
      }));
      updateClipboard(null);
    }
    
    setSelectedItems([]);
  };

  const uploadFile = (file: File, targetParentId?: string) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      let category: FileSystemItem['category'] = 'text';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) category = 'image';
      else if (['mp4', 'webm', 'ogg'].includes(extension || '')) category = 'video';
      else if (extension === 'pdf') category = 'pdf';
      else if (extension === 'note') category = 'note';
      else if (extension === 'tutorial') category = 'tutorial';

      const newItem: FileSystemItem = {
        id: crypto.randomUUID(),
        name: file.name.split('.')[0],
        type: 'file',
        extension,
        content,
        parentId: targetParentId || currentFolderId,
        createdAt: Date.now(),
        size: file.size,
        category
      };

      saveFS(prev => [...prev, newItem]);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (contextMenu?.show) setContextMenu(null);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on an item
    const target = e.target as HTMLElement;
    if (target.closest('.file-item')) return;

    setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedItems([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionBox(prev => prev ? { ...prev, x2: x, y2: y } : null);

    // Calculate selection
    const xMin = Math.min(selectionBox.x1, x);
    const xMax = Math.max(selectionBox.x1, x);
    const yMin = Math.min(selectionBox.y1, y);
    const yMax = Math.max(selectionBox.y1, y);

    const newSelected: string[] = [];
    const itemElements = containerRef.current?.querySelectorAll('.file-item');
    itemElements?.forEach((el: any) => {
      const itemRect = el.getBoundingClientRect();
      const relativeItemRect = {
        left: itemRect.left - rect.left,
        right: itemRect.right - rect.left,
        top: itemRect.top - rect.top,
        bottom: itemRect.bottom - rect.top
      };

      if (
        relativeItemRect.left < xMax &&
        relativeItemRect.right > xMin &&
        relativeItemRect.top < yMax &&
        relativeItemRect.bottom > yMin
      ) {
        newSelected.push(el.dataset.id);
      }
    });

    setSelectedItems(newSelected);
  };

  const handleMouseUp = () => {
    setSelectionBox(null);
  };

  const toggleStar = (ids: string[]) => {
    saveFS(prev => prev.map(item => {
      if (ids.includes(item.id)) {
        return { ...item, isStarred: !item.isStarred };
      }
      return item;
    }));
  };

  const handleDragStart = (e: React.DragEvent, item: FileSystemItem) => {
    const ids = selectedItems.includes(item.id) ? selectedItems : [item.id];
    const data = JSON.stringify(ids);
    
    e.dataTransfer.setData('text/plain', data);
    e.dataTransfer.effectAllowed = 'move';

    if (!selectedItems.includes(item.id)) {
      setSelectedItems([item.id]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const data = e.dataTransfer.getData('text/plain');
    if (data) {
      try {
        const draggedIds = JSON.parse(data);
        if (Array.isArray(draggedIds)) {
          // Map virtual views to root
          const finalTargetId = ['recent', 'starred', 'host-root'].includes(targetFolderId) ? 'root' : targetFolderId;
          
          if (draggedIds.includes(finalTargetId)) return;

          saveFS(prev => prev.map(item => {
            if (draggedIds.includes(item.id)) {
              return { ...item, parentId: finalTargetId };
            }
            return item;
          }));
          setSelectedItems([]);
        }
      } catch (err) {
        // Not our data
      }
    } else if (e.dataTransfer.files.length > 0) {
      const finalTargetId = ['recent', 'starred', 'host-root'].includes(targetFolderId) ? 'root' : targetFolderId;
      Array.from(e.dataTransfer.files).forEach((file: any) => {
        uploadFile(file, finalTargetId);
      });
    }
  };

  const getItemSize = (item: FileSystemItem): number => {
    if (item.type === 'file') return item.size || 0;
    
    // For folders, sum up all items that have this folder as parent
    const children = allFileSystemItems.filter(i => i.parentId === item.id);
    return children.reduce((acc, child) => acc + getItemSize(child), 0);
  };

  const formatSize = (size: number) => {
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCompatibleApps = (item: FileSystemItem) => {
    const apps = [
      { id: 'text_editor', label: 'Text Editor', icon: FileText, color: 'text-hw-blue' },
      { id: 'notes', label: 'Notes App', icon: FileCode, color: 'text-purple-400' },
      { id: 'tutorials', label: 'Tutorials App', icon: BookOpen, color: 'text-green-400' },
      { id: 'browser', label: 'Web Browser', icon: Globe, color: 'text-orange-400' }
    ];

    return apps.filter(app => {
      if (app.id === 'text_editor') return true; // Text editor is universal
      if (app.id === 'notes') return item.category === 'note' || item.extension === 'txt' || item.extension === 'note';
      if (app.id === 'tutorials') return item.category === 'tutorial' || item.extension === 'tutorial';
      if (app.id === 'browser') return item.category === 'image' || item.category === 'pdf' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(item.extension || '');
      return false;
    });
  };

  const getFileIcon = (item: any, size: number = 24) => {
    if (item.type === 'folder') return <Folder size={size} className="text-hw-blue/60" />;
    switch (item.category) {
      case 'note': return <FileText size={size} className="text-hw-blue" />;
      case 'tutorial': return <FileCode size={size} className="text-green-400" />;
      case 'pdf': return <FileDown size={size} className="text-red-400" />;
      case 'image': return <ImageIcon size={size} className="text-purple-400" />;
      case 'video': return <Video size={size} className="text-orange-400" />;
      default: return <File size={size} className="text-hw-blue/40" />;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex h-full select-none relative" 
      style={{ backgroundColor: 'var(--theme-panel-bg)', color: 'var(--theme-text)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => handleContextMenu(e)}
    >
      {/* Sidebar */}
      <div className="w-48 border-r border-hw-blue/10 flex flex-col bg-hw-black/20 backdrop-blur-sm" style={{ borderColor: 'var(--theme-border-color)' }}>
        <div className="p-4 space-y-1">
          <div className="text-[9px] uppercase tracking-widest opacity-40 mb-2 px-2">Quick Access</div>
          {[
            { id: 'root', label: 'Home', icon: Home },
            { id: 'recent', label: 'Recent', icon: Clock },
            { id: 'starred', label: 'Starred', icon: Star },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'downloads', label: 'Downloads', icon: Download },
            { id: 'pictures', label: 'Pictures', icon: ImageIcon },
            { id: 'videos', label: 'Videos', icon: Video },
          ].map(link => (
            <button
              key={link.id}
              onClick={() => navigateTo(link.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, link.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                currentFolderId === link.id ? "bg-hw-blue/20 text-hw-blue shadow-[0_0_10px_rgba(0,242,255,0.1)]" : "hover:bg-hw-blue/10 opacity-70 hover:opacity-100"
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
            <div className="flex items-center gap-2">
              <div className="relative group/new">
                <button 
                  className="bg-hw-blue text-hw-black px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all shadow-[0_0_10px_rgba(0,242,255,0.2)]"
                >
                  <Plus size={14} />
                  New
                </button>
                <div className="absolute top-full left-0 mt-1 w-40 bg-hw-black border border-hw-blue/20 rounded-lg shadow-xl opacity-0 invisible group-hover/new:opacity-100 group-hover/new:visible transition-all z-50 py-1">
                  <button 
                    onClick={() => createNewFolder()}
                    className="w-full text-left px-3 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-hw-blue/10 flex items-center gap-2"
                  >
                    <Folder size={12} className="text-hw-blue/60" /> New Folder
                  </button>
                  <button 
                    onClick={() => createNewFile('text')}
                    className="w-full text-left px-3 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-hw-blue/10 flex items-center gap-2"
                  >
                    <FileText size={12} className="text-hw-blue/60" /> New Text Note
                  </button>
                  <button 
                    onClick={() => createNewFile('tutorial')}
                    className="w-full text-left px-3 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-hw-blue/10 flex items-center gap-2"
                  >
                    <FileCode size={12} className="text-hw-blue/60" /> New Tutorial
                  </button>
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div className="flex items-center gap-1 border-l border-hw-blue/10 pl-2">
                  <button 
                    onClick={copySelected}
                    className="p-1.5 hover:bg-hw-blue/10 rounded transition-colors"
                    title="Copy"
                  >
                    <Share2 size={14} className="rotate-180" />
                  </button>
                  <button 
                    onClick={cutSelected}
                    className="p-1.5 hover:bg-hw-blue/10 rounded transition-colors"
                    title="Cut"
                  >
                    <ArrowRight size={14} className="rotate-45" />
                  </button>
                  <button 
                    onClick={deleteSelected}
                    className="p-1.5 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-l border-hw-blue/10 pl-2">
              <span className="text-[8px] uppercase opacity-40">Sort</span>
              <div className="flex items-center gap-1 bg-hw-blue/10 rounded px-2 py-1">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-[10px] uppercase font-bold outline-none cursor-pointer appearance-none"
                >
                  <option value="name" className="bg-hw-black">Name</option>
                  <option value="date" className="bg-hw-black">Date</option>
                  <option value="size" className="bg-hw-black">Size</option>
                </select>
                <div className="w-[1px] h-3 bg-hw-blue/20 mx-1" />
                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-hw-blue/20 rounded transition-colors"
                  title={sortOrder === 'asc' ? "Ascending" : "Descending"}
                >
                  {sortOrder === 'asc' ? <ChevronRight size={12} className="rotate-90" /> : <ChevronRight size={12} className="-rotate-90" />}
                </button>
              </div>
            </div>

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
                min="60" 
                max="180" 
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
        <div 
          className="flex-1 overflow-y-auto p-6 custom-scrollbar"
          onDragOver={(e) => handleDragOver(e)}
          onDrop={(e) => handleDrop(e, currentFolderId)}
        >
          {isHostLoading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Loader2 size={32} className="animate-spin mb-4" />
              <span className="text-[10px] uppercase tracking-widest">Accessing Host Filesystem...</span>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Folder size={48} className="mb-4" />
              <span className="text-[10px] uppercase tracking-[0.2em] mb-4">Folder is empty</span>
              <button 
                onClick={() => createNewFolder()}
                className="px-4 py-2 bg-hw-blue/10 border border-hw-blue/20 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-hw-blue/20 transition-all pointer-events-auto"
              >
                Create New Folder
              </button>
            </div>
          ) : (
            <div 
              className={cn(
                "grid gap-8",
                viewMode === 'grid' 
                  ? "grid-cols-[repeat(auto-fill,minmax(180px,1fr))]" 
                  : "grid-cols-1"
              )} 
            >
              {currentItems.map(item => (
                <div
                  key={item.id}
                  data-id={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => {
                    if (item.type === 'folder') {
                      e.stopPropagation();
                      handleDrop(e, item.id);
                    }
                  }}
                  onDoubleClick={() => openFile(item)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.metaKey || e.ctrlKey) {
                      setSelectedItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                    } else {
                      setSelectedItems([item.id]);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!selectedItems.includes(item.id)) setSelectedItems([item.id]);
                    handleContextMenu(e, item);
                  }}
                  className={cn(
                    "file-item group relative flex items-center rounded-lg border border-transparent transition-all cursor-pointer",
                    selectedItems.includes(item.id) ? "bg-hw-blue/20 border-hw-blue/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]" : "",
                    viewMode === 'grid' ? "flex-col p-4 items-center justify-center hover:bg-hw-blue/5 hover:border-hw-blue/10 w-[180px] h-[220px]" : "flex-row gap-4 py-2 px-4 hover:bg-hw-blue/5"
                  )}
                >
                  {item.isStarred && (
                    <div className="absolute top-2 left-2 z-10">
                      <Star size={10} className="fill-hw-blue text-hw-blue drop-shadow-[0_0_5px_rgba(0,242,255,0.5)]" />
                    </div>
                  )}
                  <div className={cn(
                    "transition-transform group-hover:scale-110 flex items-center justify-center",
                    viewMode === 'grid' ? "mb-3" : "mb-0"
                  )} style={viewMode === 'grid' ? { width: iconSize * 0.9, height: iconSize * 0.9 } : {}}>
                    {getFileIcon(item, viewMode === 'grid' ? iconSize * 0.8 : 16)}
                  </div>
                  <div className={cn(
                    "w-full overflow-hidden flex flex-col items-center",
                    viewMode === 'grid' ? "text-center" : "text-left flex-row items-center justify-between flex-1"
                  )}>
                    {renamingId === item.id ? (
                      <input 
                        autoFocus
                        defaultValue={item.name}
                        onBlur={(e) => {
                          const newName = e.target.value;
                          if (newName && newName !== item.name) {
                            saveFS(prev => prev.map(i => i.id === item.id ? { ...i, name: newName } : i));
                          }
                          setRenamingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-hw-blue/20 border border-hw-blue/40 text-[10px] font-bold uppercase text-center outline-none rounded px-1"
                      />
                    ) : (
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-tight block leading-tight",
                        viewMode === 'grid' ? "line-clamp-2 break-all px-2 w-full" : "truncate"
                      )}>
                        {item.name}{item.extension ? `.${item.extension}` : ''}
                      </span>
                    )}
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-6 text-[9px] uppercase opacity-40">
                        <span>{item.type}</span>
                        <span className="w-16 text-right">{formatSize(getItemSize(item))}</span>
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-8 border-t border-hw-blue/10 px-4 flex items-center justify-between text-[9px] uppercase tracking-widest opacity-40" style={{ borderColor: 'var(--theme-border-color)' }}>
          <div className="flex items-center gap-4">
            <span>{currentItems.length} Items</span>
            {selectedItems.length > 0 && <span>{selectedItems.length} Selected</span>}
          </div>
          <span>{currentFolder?.name || currentFolderId}</span>
        </div>
      </div>

      {/* Selection Box */}
      {selectionBox && (
        <div 
          className="absolute border border-hw-blue bg-hw-blue/10 pointer-events-none z-50"
          style={{
            left: Math.min(selectionBox.x1, selectionBox.x2),
            top: Math.min(selectionBox.y1, selectionBox.y2),
            width: Math.abs(selectionBox.x2 - selectionBox.x1),
            height: Math.abs(selectionBox.y2 - selectionBox.y1)
          }}
        />
      )}

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
            
            {/* New items */}
            {!contextMenu.item && (
              <>
                <button 
                  onClick={() => { createNewFolder(); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <Folder size={12} className="opacity-60" /> New Folder
                </button>
                <button 
                  onClick={() => { createNewFile('text'); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <FileText size={12} className="opacity-60" /> New Text Note
                </button>
                <button 
                  onClick={() => { createNewFile('tutorial'); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <FileCode size={12} className="opacity-60" /> New Tutorial File
                </button>
                <div className="h-[1px] bg-hw-blue/10 my-1" />
              </>
            )}
            
            {contextMenu.item && (
              <>
                <button 
                  onClick={() => { openFile(contextMenu.item); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <ArrowRight size={12} className="opacity-60" /> Open
                </button>

                {contextMenu.item.type === 'file' && (
                  <div className="relative group/openwith">
                    <button 
                      className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center justify-between uppercase tracking-widest transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Layout size={12} className="opacity-60" /> Open With...
                      </div>
                      <ChevronRight size={10} />
                    </button>
                    <div className={cn(
                      "absolute top-0 w-48 bg-hw-black border border-hw-blue/20 rounded shadow-xl opacity-0 invisible group-hover/openwith:opacity-100 group-hover/openwith:visible transition-all z-[100] py-1",
                      contextMenu.x > (containerRef.current?.clientWidth || window.innerWidth) - 400 ? "right-full mr-1" : "left-full ml-1"
                    )}>
                      {getCompatibleApps(contextMenu.item).map(app => (
                        <div key={app.id} className="flex items-center justify-between hover:bg-hw-blue/10 pr-2">
                          <button 
                            onClick={() => { openFile(contextMenu.item, app.id as AppView); setContextMenu(null); }}
                            className="flex-1 text-left px-3 py-2 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2"
                          >
                            <app.icon size={10} className={app.color} />
                            {app.label}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDefaultApp(contextMenu.item.id, app.id as AppView); setContextMenu(null); }}
                            className="p-1 hover:text-hw-blue text-[7px] opacity-40 hover:opacity-100 uppercase font-bold"
                            title="Set as default"
                          >
                            Default
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                <button 
                  onClick={() => { setRenamingId(contextMenu.item.id); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <MoreVertical size={12} className="opacity-60" /> Rename
                </button>

                <button 
                  onClick={() => { 
                    window.dispatchEvent(new CustomEvent('hw_os_open_app', { 
                      detail: { 
                        appId: 'properties', 
                        initialProps: { file: contextMenu.item } 
                      } 
                    })); 
                    setContextMenu(null); 
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <Info size={12} className="opacity-60" /> Properties
                </button>

                <div className="h-[1px] bg-hw-blue/10 my-1" />

                <button 
                  onClick={() => { copySelected(); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-colors"
                >
                  <ArrowRight size={12} className="opacity-60" /> Copy
                </button>

                <button 
                  onClick={() => { cutSelected(); setContextMenu(null); }}
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
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleStar(selectedItems.includes(contextMenu.item.id) ? selectedItems : [contextMenu.item.id]); 
                    setContextMenu(null); 
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-hw-blue/10 flex items-center gap-2 uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  <Star size={12} className={cn("opacity-60 pointer-events-none", contextMenu.item.isStarred && "fill-hw-blue text-hw-blue opacity-100")} /> 
                  {contextMenu.item.isStarred ? 'Unstar' : 'Star'}
                </button>
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

      {/* Input Dialog Modal */}
      <AnimatePresence>
        {inputDialog?.show && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setInputDialog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-sm p-6 border shadow-2xl flex flex-col gap-4",
                theme.globalTheme === 'glassy' ? "rounded-2xl bg-hw-black/80 border-white/10" : "rounded-sm bg-hw-black border-hw-blue/30"
              )}
              style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-hw-blue/10 border border-hw-blue/20 flex items-center justify-center rounded-lg">
                  {inputDialog.type === 'folder' ? <Folder className="text-hw-blue" /> : <FileText className="text-hw-blue" />}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tighter text-hw-blue">{inputDialog.title}</h3>
                  <p className="text-[8px] uppercase tracking-widest opacity-40">Enter a name for the new {inputDialog.type}</p>
                </div>
              </div>

              <input 
                autoFocus
                type="text"
                defaultValue={inputDialog.defaultValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    inputDialog.onConfirm(e.currentTarget.value);
                  }
                  if (e.key === 'Escape') {
                    setInputDialog(null);
                  }
                }}
                className="w-full bg-hw-blue/5 border border-hw-blue/20 p-3 text-xs uppercase font-bold tracking-widest outline-none focus:border-hw-blue transition-colors"
                style={{ color: 'var(--theme-text)' }}
              />

              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setInputDialog(null)}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const input = containerRef.current?.querySelector('input[type="text"]') as HTMLInputElement;
                    if (input) inputDialog.onConfirm(input.value);
                  }}
                  className="px-6 py-2 bg-hw-blue text-hw-black text-[10px] font-bold uppercase tracking-widest rounded hover:bg-white transition-all"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
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
