import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Search, Trash2, Bold, Italic, List, Code, 
  Image as ImageIcon, FileText, AlignLeft, AlignCenter, Terminal,
  Strikethrough, Download, X, Loader2, Layout
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';
import { useSerial } from '../../contexts/SerialContext';
import { SerialConnectionSelector } from '../common/SerialConnectionSelector';
import html2pdf from 'html2pdf.js';

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  tags: string[];
}

// Memoized editor to prevent re-renders on keystrokes (fixes backwards typing)
const Editor = React.memo(({ 
  initialContent, 
  onChange, 
  onClick, 
  editorRef 
}: { 
  initialContent: string, 
  onChange: (content: string) => void, 
  onClick: (e: React.MouseEvent) => void,
  editorRef: React.RefObject<HTMLDivElement>
}) => {
  return (
    <div 
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
      onClick={onClick}
      className="min-h-full prose prose-invert prose-hw text-hw-blue/90 focus:outline-none editor-content max-w-none"
      dangerouslySetInnerHTML={{ __html: initialContent }}
      style={{ caretColor: '#00f2ff' }}
    />
  );
}, () => true); // Never re-render, we manage DOM manually or remount via key

export const NotesApp: React.FC<{ initialNoteId?: string, connectionId?: string }> = ({ initialNoteId, connectionId: initialConnId }) => {
  const [selectedConnId, setSelectedConnId] = useState(initialConnId || 'shared');
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialNoteId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { subscribe } = useSerial(selectedConnId);
  const { updateTheme, theme } = useSettings();

  // Load notes on mount and listen for cross-instance updates
  useEffect(() => {
    const loadNotes = () => {
      const saved = localStorage.getItem('hw_os_notes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotes(parsed);
          // Only set active note if we don't have one and initialNoteId is not provided
          if (parsed.length > 0 && !activeNoteId && !initialNoteId) {
            setActiveNoteId(parsed[0].id);
          }
        } catch (e) {
          console.error("Failed to parse notes", e);
        }
      }
    };

    loadNotes();

    const handleStorageChange = (e: Event) => {
      loadNotes();
    };

    window.addEventListener('hw_os_notes_updated', handleStorageChange);
    return () => window.removeEventListener('hw_os_notes_updated', handleStorageChange);
  }, [activeNoteId]);

  // Save notes on change
  const saveToDisk = useCallback((updatedNotes: Note[]) => {
    localStorage.setItem('hw_os_notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
    window.dispatchEvent(new Event('hw_os_notes_updated'));
  }, []);

  const createNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'New Cipher Note',
      content: '<div>Start documenting...</div>',
      timestamp: Date.now(),
      tags: []
    };
    const updated = [newNote, ...notes];
    saveToDisk(updated);
    setActiveNoteId(newNote.id);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    saveToDisk(updated);
    if (activeNoteId === id) {
      setActiveNoteId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  // Search logic: checks both title and content
  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Rich Text Execution
  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleContentChange(editorRef.current.innerHTML);
    }
  };

  const handleContentChange = useCallback((content: string) => {
    if (!activeNoteId) return;
    setNotes(prev => {
      const updated = prev.map(n => 
        n.id === activeNoteId ? { ...n, content, timestamp: Date.now() } : n
      );
      localStorage.setItem('hw_os_notes', JSON.stringify(updated));
      window.dispatchEvent(new Event('hw_os_notes_updated'));
      return updated;
    });
  }, [activeNoteId]);

  const updateTitle = (val: string) => {
    if (!activeNoteId) return;
    setNotes(prev => {
      const updated = prev.map(n => 
        n.id === activeNoteId ? { ...n, title: val } : n
      );
      localStorage.setItem('hw_os_notes', JSON.stringify(updated));
      window.dispatchEvent(new Event('hw_os_notes_updated'));
      return updated;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        exec('insertImage', data.url);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const triggerImageInsert = () => {
    const choice = confirm('Upload local image? (Cancel to enter URL)');
    if (choice) {
      imageInputRef.current?.click();
    } else {
      const url = prompt('Enter Image URL:');
      if (url) exec('insertImage', url);
    }
  };

  // Sync editor content if it was updated from another instance
  useEffect(() => {
    if (activeNote && editorRef.current) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content;
      }
    }
  }, [activeNote?.content]);

  // Serial Subscription
  useEffect(() => {
    const unsubscribe = subscribe((data: string) => {
      if (!editorRef.current) return;
      let updated = false;
      const blocks = editorRef.current.querySelectorAll('.serial-block');
      
      blocks.forEach(block => {
        const btn = block.querySelector('.serial-action-btn');
        if (btn && btn.getAttribute('data-action') === 'stop') {
          const content = block.querySelector('.serial-content');
          if (content) {
            if (content.innerHTML.includes('[Waiting')) content.innerHTML = '';
            // Append data, convert newlines to <br>
            const textNode = document.createTextNode(data);
            const span = document.createElement('span');
            span.appendChild(textNode);
            content.appendChild(span);
            content.scrollTop = content.scrollHeight;
            updated = true;
          }
        }
      });

      if (updated && activeNoteId) {
        handleContentChange(editorRef.current.innerHTML);
      }
    });

    return () => unsubscribe();
  }, [subscribe, activeNoteId, handleContentChange]);

  // UI for the Serial Redirecter Block
  const insertSerialBlock = () => {
    const blockId = `serial-${Date.now()}`;
    const blockHtml = `
      <div class="serial-block border-2 border-hw-blue/40 bg-hw-blue/5 p-4 my-4 rounded font-mono text-xs relative group" contenteditable="false" id="${blockId}">
        <button class="block-delete-btn absolute top-2 right-2 p-1 bg-red-500/20 text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white" data-target="${blockId}" title="Delete Block">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <div class="flex justify-between items-center mb-2 border-b border-hw-blue/20 pb-2 pr-8">
          <span class="flex items-center gap-2 font-bold text-hw-blue">
            <span class="w-2 h-2 rounded-full bg-hw-blue/50 status-dot transition-colors"></span>
            SERIAL_STREAM_BUFFER
          </span>
          <span class="text-[10px] opacity-50">ID: ${blockId}</span>
        </div>
        <div class="serial-content text-hw-blue/80 italic mb-3 min-h-[60px] max-h-[250px] overflow-y-auto custom-scrollbar bg-black/60 p-3 rounded border border-hw-blue/10 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
          [Waiting for stream connection...]
        </div>
        <div class="flex gap-2">
           <button class="serial-action-btn bg-hw-blue text-hw-black px-3 py-1.5 rounded text-[10px] font-bold hover:bg-white transition-colors flex items-center gap-1" data-action="start" data-target="${blockId}">
             ▶ START CAPTURE
           </button>
           <button class="serial-clear-btn border border-hw-blue/40 px-3 py-1.5 rounded text-[10px] hover:bg-hw-blue/20 transition-colors" data-action="clear" data-target="${blockId}">
             CLEAR
           </button>
        </div>
      </div>
      <p><br></p>
    `;
    exec('insertHTML', blockHtml);
  };

  const insertCodeBlock = () => {
    const blockId = `code-${Date.now()}`;
    const codeHtml = `
      <div class="relative group my-3" id="${blockId}" contenteditable="false">
        <button class="block-delete-btn absolute top-2 right-2 p-1 bg-red-500/20 text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white z-10" data-target="${blockId}" title="Delete Block">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <pre class="bg-black/60 border border-hw-blue/30 p-4 rounded font-mono text-xs text-hw-blue overflow-x-auto m-0"><code contenteditable="true" class="outline-none block min-h-[20px]">// Paste code here</code></pre>
      </div>
      <p><br></p>
    `;
    exec('insertHTML', codeHtml);
  };

  // Handle clicks inside the editor for interactive elements
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('block-delete-btn')) {
      e.preventDefault();
      const blockId = btn.getAttribute('data-target');
      const block = editorRef.current?.querySelector(`#${blockId}`);
      if (block) {
        block.remove();
        if (editorRef.current) handleContentChange(editorRef.current.innerHTML);
      }
    } else if (btn.classList.contains('serial-action-btn')) {
      e.preventDefault();
      const action = btn.getAttribute('data-action');
      const blockId = btn.getAttribute('data-target');
      const block = editorRef.current?.querySelector(`#${blockId}`);
      if (!block) return;

      const statusDot = block.querySelector('.status-dot');
      const content = block.querySelector('.serial-content');

      if (action === 'start') {
        btn.setAttribute('data-action', 'stop');
        btn.innerHTML = '■ STOP CAPTURE';
        btn.classList.replace('bg-hw-blue', 'bg-red-500');
        btn.classList.replace('text-hw-black', 'text-white');
        btn.classList.replace('hover:bg-white', 'hover:bg-red-400');
        
        if (statusDot) {
          statusDot.classList.replace('bg-hw-blue/50', 'bg-red-500');
          statusDot.classList.add('animate-pulse');
        }
        if (content && content.innerHTML.includes('[Waiting')) {
          content.innerHTML = '<div class="text-hw-blue mb-1">-- SERIAL CAPTURE STARTED --</div>';
        }
      } else {
        btn.setAttribute('data-action', 'start');
        btn.innerHTML = '▶ START CAPTURE';
        btn.classList.replace('bg-red-500', 'bg-hw-blue');
        btn.classList.replace('text-white', 'text-hw-black');
        btn.classList.replace('hover:bg-red-400', 'hover:bg-white');
        
        if (statusDot) {
          statusDot.classList.replace('bg-red-500', 'bg-hw-blue/50');
          statusDot.classList.remove('animate-pulse');
        }
        if (content) {
          content.innerHTML += '<div class="text-hw-blue/50 mt-1">-- SERIAL CAPTURE STOPPED --</div>';
        }
      }
      if (editorRef.current) handleContentChange(editorRef.current.innerHTML);
    } else if (btn.classList.contains('serial-clear-btn')) {
      e.preventDefault();
      const blockId = btn.getAttribute('data-target');
      const block = editorRef.current?.querySelector(`#${blockId}`);
      if (block) {
        const content = block.querySelector('.serial-content');
        if (content) content.innerHTML = '<div class="text-hw-blue/80 italic">[Waiting for stream connection...]</div>';
        
        // Reset start button if it was recording
        const startBtn = block.querySelector('.serial-action-btn');
        if (startBtn && startBtn.getAttribute('data-action') === 'stop') {
          startBtn.setAttribute('data-action', 'start');
          startBtn.innerHTML = '▶ START CAPTURE';
          startBtn.classList.replace('bg-red-500', 'bg-hw-blue');
          startBtn.classList.replace('text-white', 'text-hw-black');
          startBtn.classList.replace('hover:bg-red-400', 'hover:bg-white');
          const statusDot = block.querySelector('.status-dot');
          if (statusDot) {
            statusDot.classList.replace('bg-red-500', 'bg-hw-blue/50');
            statusDot.classList.remove('animate-pulse');
          }
        }
        if (editorRef.current) handleContentChange(editorRef.current.innerHTML);
      }
    }
  };

  const collapseToWidget = () => {
    if (!activeNote) return;
    
    const instanceId = `widget-${Date.now()}`;
    updateTheme({
      widgets: [...(theme.widgets || []), {
        instanceId,
        widgetId: 'notes',
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        isFloating: false,
        config: { noteId: activeNote.id }
      }]
    });
    
    // Optional: Close the app or show a message
    alert(`Note "${activeNote.title}" pinned to desktop!`);
  };

  const exportToPDF = () => {
    if (!activeNote || !editorRef.current) return;
    
    // Create a temporary container to format for PDF
    const printContainer = document.createElement('div');
    printContainer.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #000; padding: 20px; background: #fff;">
        <h1 style="font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; color: #000;">
          ${activeNote.title}
        </h1>
        <div style="font-size: 12px; color: #666; margin-bottom: 20px;">
          Generated: ${new Date().toLocaleString()}
        </div>
        <div style="font-size: 14px; line-height: 1.6; color: #000;">
          ${editorRef.current.innerHTML}
        </div>
      </div>
    `;

    // Strip out interactive buttons for the PDF
    const buttons = printContainer.querySelectorAll('button');
    buttons.forEach(b => b.remove());

    // Strip out classes to avoid oklab/oklch parsing issues in html2canvas (Tailwind v4 compatibility)
    // and apply basic inline styles so it still looks good in the PDF
    const allElements = printContainer.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.tagName === 'PRE') {
        el.setAttribute('style', 'background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace; font-size: 12px; margin: 15px 0; border: 1px solid #ddd; color: #000;');
      } else if (el.tagName === 'CODE') {
        el.setAttribute('style', 'font-family: monospace; font-size: 12px; color: #000;');
      } else if (el.tagName === 'BLOCKQUOTE') {
        el.setAttribute('style', 'border-left: 4px solid #ccc; padding-left: 15px; margin-left: 0; font-style: italic; color: #555; background-color: #f9f9f9; padding: 10px 15px;');
      } else if (el.classList.contains('serial-block')) {
        el.setAttribute('style', 'border: 2px solid #eee; background-color: #fafafa; padding: 15px; margin: 15px 0; font-family: monospace; font-size: 12px; border-radius: 5px; color: #000;');
      } else if (el.classList.contains('serial-content')) {
        el.setAttribute('style', 'background-color: #fff; border: 1px solid #ddd; padding: 10px; margin-top: 10px; white-space: pre-wrap; color: #333;');
      } else if (el.tagName === 'IMG') {
        el.setAttribute('style', 'max-width: 100%; height: auto; border: 1px solid #ddd; margin: 15px 0;');
      } else if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
        el.setAttribute('style', 'color: #000; margin-top: 20px; margin-bottom: 10px;');
      }
      
      // Remove class attribute to prevent html2canvas from computing Tailwind's oklab colors
      el.removeAttribute('class');
    });

    const opt = {
      margin:       15,
      filename:     `${activeNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    const triggerSave = () => {
      window.dispatchEvent(new CustomEvent('hw_os_trigger_save_dialog', {
        detail: {
          fileName: opt.filename,
          onSaveToDB: () => {
            // Save to virtual FS
            html2pdf().set(opt).from(printContainer).output('blob').then((blob: Blob) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                window.dispatchEvent(new CustomEvent('hw_os_save_file', {
                  detail: {
                    file: {
                      name: activeNote.title,
                      extension: 'pdf',
                      type: 'file',
                      category: 'pdf',
                      parentId: 'documents', // Default to documents
                      size: blob.size,
                      content: reader.result // Base64
                    }
                  }
                }));
              };
              reader.readAsDataURL(blob);
            });
          },
          onSaveToLocal: () => {
            // Standard browser download
            html2pdf().set(opt).from(printContainer).save();
          }
        }
      }));
    };

    triggerSave();
  };

  return (
    <div className="flex h-full overflow-hidden select-none" style={{ backgroundColor: 'var(--theme-panel-bg)', color: 'var(--theme-text)' }}>
      {/* Sidebar */}
      <div className="w-64 border-r border-hw-blue/20 flex flex-col bg-hw-blue/5" style={{ borderColor: 'var(--theme-border-color)' }}>
        <div className="p-4 border-b border-hw-blue/20" style={{ borderColor: 'var(--theme-border-color)' }}>
          <button 
            onClick={createNote}
            className="w-full bg-hw-blue text-hw-black py-2 rounded flex items-center justify-center gap-2 font-bold text-xs hover:bg-white transition-colors shadow-[0_0_10px_rgba(0,242,255,0.2)]"
          >
            <Plus size={16} /> NEW NOTE
          </button>
          
          <div className="mt-4 relative">
            <Search size={14} className="absolute left-2 top-2.5 opacity-50" />
            <input 
              type="text" 
              placeholder="Search index..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-hw-blue/20 rounded py-1.5 pl-8 pr-2 text-[10px] outline-none focus:border-hw-blue transition-colors"
              style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-[10px] opacity-50 italic">No notes found.</div>
          ) : (
            filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={cn(
                  "p-3 border-b border-hw-blue/10 cursor-pointer transition-all group",
                  activeNoteId === note.id ? 'bg-hw-blue/20 border-l-2 border-l-hw-blue' : 'hover:bg-hw-blue/10 border-l-2 border-l-transparent'
                )}
                style={{ borderColor: 'var(--theme-border-color)' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={12} className={activeNoteId === note.id ? 'text-hw-blue' : 'opacity-40'} />
                    <span className="text-[11px] font-bold truncate max-w-[140px] uppercase tracking-tighter">
                      {note.title}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                    title="Delete Note"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div 
                  className="text-[9px] opacity-40 line-clamp-2 mt-1"
                  dangerouslySetInnerHTML={{ __html: note.content.replace(/<[^>]*>?/gm, '').substring(0, 80) + '...' }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black/20">
        {activeNote ? (
          <>
            {/* Main Toolbar */}
            <div className="bg-hw-blue/10 border-b border-hw-blue/20 p-2 flex flex-wrap gap-2 items-center shadow-md z-10" style={{ borderColor: 'var(--theme-border-color)' }}>
              <div className="flex items-center gap-1 border-r border-hw-blue/20 pr-2" style={{ borderColor: 'var(--theme-border-color)' }}>
                <button onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} title="Bold" className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors"><Bold size={14}/></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} title="Italic" className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors"><Italic size={14}/></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => exec('strikeThrough')} title="Strikethrough" className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors"><Strikethrough size={14}/></button>
              </div>

              <div className="flex items-center gap-2 border-r border-hw-blue/20 pr-2" style={{ borderColor: 'var(--theme-border-color)' }}>
                <select 
                  onChange={(e) => exec('fontSize', e.target.value)}
                  defaultValue="3"
                  className="bg-black/60 text-hw-blue text-[10px] border border-hw-blue/20 rounded px-2 py-1 outline-none cursor-pointer hover:border-hw-blue/50 transition-colors"
                  style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                >
                  <option value="1">Small</option>
                  <option value="3">Normal</option>
                  <option value="5">Large</option>
                  <option value="7">Giant</option>
                </select>
                <select 
                  onChange={(e) => exec('foreColor', e.target.value)}
                  defaultValue="#00f2ff"
                  className="bg-black/60 text-hw-blue text-[10px] border border-hw-blue/20 rounded px-2 py-1 outline-none cursor-pointer hover:border-hw-blue/50 transition-colors"
                  style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                >
                  <option value="#00f2ff">Cyan</option>
                  <option value="#ffffff">White</option>
                  <option value="#ff0000">Red</option>
                  <option value="#00ff00">Green</option>
                  <option value="#ffff00">Yellow</option>
                </select>
              </div>

              <div className="flex items-center gap-1 border-r border-hw-blue/20 pr-2" style={{ borderColor: 'var(--theme-border-color)' }}>
                <button onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyLeft')} title="Align Left" className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors"><AlignLeft size={14}/></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyCenter')} title="Align Center" className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors"><AlignCenter size={14}/></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Bullet List" className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors"><List size={14}/></button>
              </div>

              <div className="flex items-center gap-1 border-r border-hw-blue/20 pr-2" style={{ borderColor: 'var(--theme-border-color)' }}>
                <button onMouseDown={e => e.preventDefault()} onClick={insertCodeBlock} title="Insert Code Block" className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors">
                  <Code size={14}/>
                </button>
                <button 
                  onMouseDown={e => e.preventDefault()} 
                  onClick={triggerImageInsert} 
                  disabled={isUploading}
                  title="Insert Image" 
                  className={cn("p-1.5 hover:bg-hw-blue/20 rounded transition-colors", isUploading && "animate-pulse opacity-50")}
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon size={14}/>}
                </button>
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <SerialConnectionSelector selectedConnId={selectedConnId} onSelect={setSelectedConnId} />
                <button 
                  onMouseDown={e => e.preventDefault()}
                  onClick={insertSerialBlock}
                  className="bg-hw-blue/10 border border-hw-blue/40 text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 hover:bg-hw-blue hover:text-hw-black transition-all shadow-[0_0_10px_rgba(0,242,255,0.1)]"
                >
                  <Terminal size={14}/> ATTACH SERIAL FEED
                </button>
                <button 
                  onMouseDown={e => e.preventDefault()}
                  onClick={collapseToWidget}
                  className="bg-hw-blue/10 border border-hw-blue/40 text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 hover:bg-hw-blue hover:text-hw-black transition-all shadow-[0_0_10px_rgba(0,242,255,0.1)]"
                  title="Pin current note to desktop as a widget"
                >
                  <Layout size={14}/> PIN TO DESKTOP
                </button>
                <button 
                  onMouseDown={e => e.preventDefault()}
                  onClick={exportToPDF}
                  className="bg-hw-blue text-hw-black text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 hover:bg-white transition-all shadow-[0_0_10px_rgba(0,242,255,0.2)]"
                >
                  <Download size={14}/> EXPORT PDF
                </button>
              </div>
            </div>

            {/* Title Bar */}
            <div className="px-8 pt-8 pb-4 border-b border-hw-blue/10 bg-gradient-to-b from-hw-blue/5 to-transparent" style={{ borderColor: 'var(--theme-border-color)' }}>
              <input 
                value={activeNote.title}
                onChange={(e) => updateTitle(e.target.value)}
                className="w-full bg-transparent text-2xl font-bold outline-none uppercase tracking-widest text-hw-blue placeholder-hw-blue/30"
                placeholder="NOTE TITLE"
                style={{ color: 'var(--theme-text)' }}
              />
            </div>

            {/* Rich Editor */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar outline-none relative">
              <Editor 
                key={activeNote.id}
                initialContent={activeNote.content}
                onChange={handleContentChange}
                onClick={handleEditorClick}
                editorRef={editorRef}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
            <FileText size={64} className="mb-6" />
            <p className="font-bold tracking-widest text-sm uppercase">Select or Create a Data Slab</p>
            <p className="text-[10px] mt-2 font-mono">SYSTEM READY</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 242, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 242, 255, 0.4); }
        
        .editor-content {
          font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.7;
          color: var(--theme-text);
        }
        .editor-content:empty:before {
          content: 'Start typing...';
          color: rgba(0, 242, 255, 0.3);
          font-style: italic;
        }
        .editor-content pre {
          background: rgba(0,0,0,0.6) !important;
          border: 1px solid var(--theme-border-color) !important;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
          color: #fff;
        }
        .editor-content blockquote {
          border-left: 3px solid var(--theme-main);
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
          opacity: 0.8;
          background: rgba(0, 242, 255, 0.05);
          padding: 0.5rem 1rem;
          border-radius: 0 0.25rem 0.25rem 0;
          color: var(--theme-text);
        }
        .editor-content img {
          max-width: 100%;
          border: 1px solid var(--theme-border-color);
          border-radius: 0.5rem;
          margin: 1rem 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .editor-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .editor-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .editor-content li {
          margin-bottom: 0.25rem;
        }
        .prose-hw h1 { font-size: 2em; color: var(--theme-main); font-weight: 800; margin: 1em 0 0.5em; text-transform: uppercase; letter-spacing: -0.02em; }
        .prose-hw h2 { font-size: 1.5em; color: var(--theme-main); font-weight: 700; margin: 1em 0 0.5em; }
        .prose-hw h3 { font-size: 1.17em; color: var(--theme-main); font-weight: 600; margin: 1em 0 0.5em; }
      `}</style>
    </div>
  );
};
