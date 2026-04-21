import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  X, 
  Plus, 
  Download,
  MoreVertical,
  Maximize,
  Loader2
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useSettings } from "../../contexts/SettingsContext";
import { UniversalFilePicker } from "../common/UniversalFilePicker";
import { AnimatePresence } from "motion/react";

interface PdfViewerProps {
  file?: any;
  onClose: () => void;
}

interface Tab {
  id: string;
  title: string;
  url: string;
  isBlob?: boolean;
}

export const PdfViewerApp: React.FC<PdfViewerProps> = ({ file, onClose }) => {
  const { theme } = useSettings();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const tabsRef = React.useRef<Tab[]>([]);
  
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const [activeTabId, setActiveTabId] = useState<string>('');
  const [showPicker, setShowPicker] = useState<'open' | 'save' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createPdfUrl = async (fileItem: any): Promise<string> => {
    if (!fileItem) return '';
    
    if (fileItem.isHost && fileItem.path) {
      try {
        if ((window as any).electron && (window as any).electron.fs) {
          const base64 = await (window as any).electron.fs.readFile(fileItem.path, 'base64');
          // Convert base64 to Blob for more reliable rendering
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          return URL.createObjectURL(blob);
        }
      } catch (err) {
        console.error("Failed to load host PDF:", err);
      }
    } else if (fileItem.content) {
      // Content in DB might be data URL or raw string
      if (fileItem.content.startsWith('data:')) {
        const base64 = fileItem.content.split(',')[1];
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      }
      // If it's raw binary string (not ideal), try to make blob
      const blob = new Blob([fileItem.content], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    }
    return '';
  };

  const addFileToTabs = async (fileItem: any) => {
    if (!fileItem) return;

    // Prevent duplicates by checking path or name
    const existingTab = tabsRef.current.find(t => t.title === (fileItem.name || 'Document.pdf'));
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    setIsLoading(true);
    const url = await createPdfUrl(fileItem);
    if (url) {
      const id = Math.random().toString(36).substr(2, 9);
      const newTab: Tab = { 
        id, 
        title: fileItem.name || 'Document.pdf', 
        url,
        isBlob: url.startsWith('blob:')
      };
      setTabs(prev => {
        // If only empty tab exists, replace it
        if (prev.length === 1 && prev[0].url === '') return [newTab];
        return [...prev, newTab];
      });
      setActiveTabId(id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const handleGlobalOpen = (e: any) => {
      if (e.detail?.file) {
        addFileToTabs(e.detail.file);
      }
    };
    window.addEventListener('pdf_viewer_open_file', handleGlobalOpen);
    return () => window.removeEventListener('pdf_viewer_open_file', handleGlobalOpen);
  }, []); // Remove dependency on tabs, use tabsRef instead

  const lastProcessedFileRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (file) {
      const fileId = file.path || file.id;
      if (lastProcessedFileRef.current === fileId) return;
      lastProcessedFileRef.current = fileId;
      
      addFileToTabs(file);
    } else if (tabs.length === 0) {
      const id = Date.now().toString();
      setTabs([{ id, title: 'New Tab', url: '' }]);
      setActiveTabId(id);
    }
  }, [file]);

  useEffect(() => {
    return () => {
      // Clear iframes before unmount to prevent GPU errors
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.src = 'about:blank';
        } catch (e) {}
      });
      
      tabsRef.current.forEach(tab => {
        if (tab.isBlob) {
          URL.revokeObjectURL(tab.url);
        }
      });
    };
  }, []); // Only on mount/unmount

  const activeTab = tabs.find(t => t.id === activeTabId);

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabToClose = tabs.find(t => t.id === id);
    if (tabToClose?.isBlob) URL.revokeObjectURL(tabToClose.url);

    if (tabs.length === 1) {
      onClose();
      return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleSaveAs = async (destination: any) => {
    if (!activeTab || !activeTab.url) return;
    
    try {
      let content = '';
      if (activeTab.url.startsWith('blob:')) {
        const response = await fetch(activeTab.url);
        const blob = await response.blob();
        // Use FileReader to get base64/binary string for saving
        content = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } else {
        content = activeTab.url;
      }

      if (destination.isHost) {
        const fullPath = `${destination.path}/${destination.name}${destination.name.toLowerCase().endsWith('.pdf') ? '' : '.pdf'}`;
        // Extract base64 if it's a data URL
        const base64 = content.includes('base64,') ? content.split('base64,')[1] : btoa(content);
        await (window as any).electron.fs.writeFile(fullPath, base64, 'base64');
        alert(`Saved to ${fullPath}`);
      } else {
        // Save to Virtual DB
        const newItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: destination.name.replace('.pdf', ''),
          type: 'file',
          extension: 'pdf',
          category: 'pdf',
          content: content,
          parentId: destination.id,
          createdAt: Date.now(),
          size: content.length // rough estimate
        };
        const savedFs = localStorage.getItem('hw_os_fs');
        const fs = savedFs ? JSON.parse(savedFs) : [];
        fs.push(newItem);
        localStorage.setItem('hw_os_fs', JSON.stringify(fs));
        window.dispatchEvent(new CustomEvent('hw_os_fs_updated'));
        alert(`Saved to virtual folder`);
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save file");
    }
    setShowPicker(null);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--theme-panel-bg)] text-[var(--theme-text)] overflow-hidden">
      {/* Tabs Bar */}
      <div className="flex items-center gap-1 p-1 bg-black/40 border-b border-[var(--theme-border-color)] shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px] cursor-pointer transition-all border-t-2",
              activeTabId === tab.id 
                ? "bg-hw-blue/10 border-hw-blue opacity-100" 
                : "bg-transparent border-transparent opacity-50 hover:opacity-80"
            )}
          >
            <BookOpen className="w-3 h-3 shrink-0" />
            <span className="text-[10px] font-bold uppercase truncate flex-1">{tab.title}</span>
            <X 
              className="w-3 h-3 hover:text-red-500 transition-colors" 
              onClick={(e) => closeTab(tab.id, e)} 
            />
          </div>
        ))}
        <button 
          onClick={() => setShowPicker('open')}
          className="p-1.5 hover:bg-hw-blue/10 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--theme-border-color)] shrink-0 bg-black/20">
        <div className="flex items-center gap-4 pl-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
            PDF Reader
          </div>
          {activeTab?.title && (
            <div className="h-4 w-[1px] bg-[var(--theme-border-color)] opacity-20" />
          )}
          <div className="text-xs font-bold truncate max-w-[300px]">
            {activeTab?.title || 'No document open'}
          </div>
          {isLoading && <Loader2 size={14} className="animate-spin text-hw-blue" />}
        </div>
        
        <div className="flex gap-2">
          {activeTab?.url && (
            <button 
              className="flex items-center gap-2 px-3 py-1.5 bg-hw-blue/10 hover:bg-hw-blue/20 rounded text-[9px] font-bold uppercase tracking-widest transition-all border border-hw-blue/20"
              onClick={() => setShowPicker('save')}
            >
              <Download size={12} /> Save As
            </button>
          )}
          <button className="p-1.5 hover:bg-hw-blue/10 rounded transition-colors">
            <Maximize size={14} />
          </button>
          <button className="p-1.5 hover:bg-hw-blue/10 rounded transition-colors">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Viewer Content */}
      <div className="flex-1 relative bg-white/5 overflow-hidden">
        {activeTab?.url ? (
          <iframe
            key={activeTab.id}
            src={activeTab.url}
            className="w-full h-full border-none"
            title={activeTab.title}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <BookOpen size={64} className="mb-6 text-hw-blue/40" />
            <h3 className="text-lg font-black uppercase tracking-tighter mb-2">No Document Loaded</h3>
            <p className="text-[10px] uppercase tracking-widest max-w-[200px] text-center leading-relaxed">
              Open a PDF from the system files or click the <span className="text-hw-blue font-bold">+</span> to browse.
            </p>
            <button 
              onClick={() => setShowPicker('open')}
              className="mt-8 px-8 py-3 bg-hw-blue text-hw-black rounded font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)]"
            >
              Select Document
            </button>
          </div>
        )}
      </div>

      {/* File Picker Overlays */}
      <AnimatePresence>
        {showPicker === 'open' && (
          <UniversalFilePicker 
            mode="open"
            title="Open PDF Document"
            allowedExtensions={['.pdf']}
            onSelect={(item) => {
              addFileToTabs(item);
              setShowPicker(null);
            }}
            onCancel={() => setShowPicker(null)}
          />
        )}
        {showPicker === 'save' && (
          <UniversalFilePicker 
            mode="save"
            title="Save PDF As"
            defaultFileName={activeTab?.title || 'document.pdf'}
            onSelect={handleSaveAs}
            onCancel={() => setShowPicker(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
