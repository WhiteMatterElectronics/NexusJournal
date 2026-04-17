import React, { useState, useEffect } from "react";
import { Folder, File, FileCode, ChevronRight, ChevronDown, Plus, Trash2, FolderPlus, FilePlus, Hexagon, Database } from "lucide-react";
import { cn } from "../../lib/utils";

interface FileEntry {
  id: string;
  name: string;
  content: string | null;
  type: 'file' | 'folder';
  extension: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InternalFilePickerProps {
  onFileSelect?: (file: FileEntry) => void;
  allowedExtensions?: string[];
  className?: string;
  refreshTrigger?: number;
}

export const InternalFilePicker: React.FC<InternalFilePickerProps> = ({ 
  onFileSelect, 
  allowedExtensions, 
  className,
  refreshTrigger
}) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/files");
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setFiles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disk offline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleRefresh = () => fetchFiles();
    window.addEventListener('hw_os_nexus_disk_refresh', handleRefresh);
    return () => window.removeEventListener('hw_os_nexus_disk_refresh', handleRefresh);
  }, []);

  const toggleFolder = (id: string) => {
    const next = new Set(expandedFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedFolders(next);
  };

  const createFile = async (parentId: string | null = null, defaultName: string = "new_file.c", type: 'file' | 'folder' = 'file') => {
    const name = prompt(`Enter ${type} name:`, defaultName);
    if (!name) return;
    
    const id = crypto.randomUUID();
    const extension = type === 'file' ? name.split('.').pop() || 'txt' : null;
    const newFile = {
      id,
      name,
      type,
      extension,
      parentId,
      content: type === 'file' ? "// Write your code here" : null
    };

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFile)
      });
      if (response.ok) fetchFiles();
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
        const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
        if (response.ok) fetchFiles();
    } catch (err) {
        console.error("Delete failed", err);
    }
  };

  const renderEntry = (parentId: string | null = null, depth: number = 0) => {
    const layer = files.filter(f => f.parentId === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return layer.map(entry => {
      const isExpanded = expandedFolders.has(entry.id);
      const isFile = entry.type === 'file';
      const isAllowed = !isFile || !allowedExtensions || (entry.extension && allowedExtensions.includes(entry.extension));

      if (isFile && !isAllowed) return null;

      return (
        <div key={entry.id} className="flex flex-col">
          <div 
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 hover:bg-hw-blue/10 cursor-pointer group transition-colors",
              !isFile && "text-hw-blue font-medium"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => {
              if (isFile) {
                onFileSelect?.(entry);
                window.dispatchEvent(new CustomEvent('hw_os_nexus_file_selected', { detail: { file: entry } }));
              } else {
                toggleFolder(entry.id);
              }
            }}
          >
            {!isFile ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : null}
            
            {!isFile ? (
              <Folder size={14} className="shrink-0" />
            ) : (
              entry.extension === 'c' ? <Hexagon size={14} className="text-orange-400 shrink-0" /> : 
              entry.extension === 'asm' ? <FileCode size={14} className="text-hw-blue shrink-0" /> :
              <File size={14} className="shrink-0" />
            )}

            <span className="text-[11px] truncate flex-grow">{entry.name}</span>

            <div className="hidden group-hover:flex items-center gap-1">
               {!isFile && (
                 <>
                   <button 
                     onClick={(e) => { e.stopPropagation(); createFile(entry.id, "new_file.c", "file"); }}
                     className="p-1 hover:bg-hw-blue/20 rounded"
                     title="New File Here"
                   >
                     <FilePlus size={12} />
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); createFile(entry.id, "new_folder", "folder"); }}
                     className="p-1 hover:bg-hw-blue/20 rounded"
                     title="New Folder Here"
                   >
                     <FolderPlus size={12} />
                   </button>
                 </>
               )}
               <button 
                 onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                 className="p-1 hover:bg-red-500/20 text-red-400 rounded"
               >
                 <Trash2 size={12} />
               </button>
            </div>
          </div>
          
          {entry.type === 'folder' && isExpanded && (
            <div className="flex flex-col">
              {renderEntry(entry.id, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={cn("bg-[var(--theme-panel-bg)] border border-[var(--theme-border-color)] flex flex-col min-w-[200px] h-full overflow-hidden", className)}>
      <div className="flex items-center justify-between p-2 border-b border-[var(--theme-border-color)] bg-black/20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-content-text)] opacity-60">Nexus Disk</span>
        <div className="flex gap-1">
          <button onClick={() => createFile(null, "new_folder", "folder")} className="p-1 hover:bg-white/5 rounded text-[var(--theme-content-text)]" title="New Folder">
            <FolderPlus size={14} />
          </button>
          <button onClick={() => createFile(null, "main.c", "file")} className="p-1 hover:bg-white/5 rounded text-[var(--theme-content-text)]" title="New File">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto overflow-x-hidden p-1 scrollbar-hide">
        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center h-full opacity-40 text-[10px]">DISK INITIALIZING...</div>
        ) : error ? (
          <div className="p-4 text-[10px] text-red-400 text-center">{error}</div>
        ) : files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-[10px] gap-2">
            <Database size={24} />
            <span>DISK EMPTY</span>
            <button onClick={() => createFile(null, "main.c")} className="text-hw-blue underline mt-1">Initialize main.c</button>
          </div>
        ) : (
          renderEntry(null)
        )}
      </div>
    </div>
  );
};
