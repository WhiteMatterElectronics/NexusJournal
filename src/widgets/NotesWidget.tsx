import React, { useState, useEffect, useRef } from 'react';
import { WidgetProps } from '../types/widgets';
import { cn } from '../lib/utils';
import { StickyNote, Trash2, ExternalLink, Save, Plus } from 'lucide-react';

export const NotesWidget: React.FC<WidgetProps> = ({ instanceId, mainColor, isDarkMode, globalTheme, config }) => {
  const [note, setNote] = useState(() => {
    const saved = localStorage.getItem('hw_os_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          if (config?.noteId) {
            const found = parsed.find((n: any) => n.id === config.noteId);
            if (found) return found;
          }
          return parsed[0];
        }
      } catch (e) {
        console.error("Failed to parse notes for widget", e);
      }
    }
    return { id: crypto.randomUUID(), title: 'SCRATCHPAD', content: 'Quick thoughts...', timestamp: Date.now(), tags: [] };
  });
  
  const isGlassy = globalTheme === 'glassy';
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('hw_os_notes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            let targetNote = parsed[0];
            if (config?.noteId) {
              const found = parsed.find((n: any) => n.id === config.noteId);
              if (found) targetNote = found;
            }
            
            setNote(targetNote);
            if (editorRef.current && editorRef.current.innerHTML !== targetNote.content) {
              editorRef.current.innerHTML = targetNote.content;
            }
          }
        } catch (e) {}
      }
    };
    window.addEventListener('hw_os_notes_updated', handleUpdate);
    return () => window.removeEventListener('hw_os_notes_updated', handleUpdate);
  }, []);

  const handleChange = (content: string) => {
    const updatedNote = { ...note, content, timestamp: Date.now() };
    setNote(updatedNote);
    
    const saved = localStorage.getItem('hw_os_notes');
    let notes = [];
    if (saved) {
      try {
        notes = JSON.parse(saved);
      } catch (e) {}
    }
    
    const idx = notes.findIndex((n: any) => n.id === note.id);
    if (idx !== -1) {
      notes[idx] = updatedNote;
    } else {
      notes.unshift(updatedNote);
    }
    
    localStorage.setItem('hw_os_notes', JSON.stringify(notes));
    window.dispatchEvent(new Event('hw_os_notes_updated'));
  };

  const deleteNote = () => {
    const saved = localStorage.getItem('hw_os_notes');
    if (saved) {
      try {
        let notes = JSON.parse(saved);
        notes = notes.filter((n: any) => n.id !== note.id);
        localStorage.setItem('hw_os_notes', JSON.stringify(notes));
        window.dispatchEvent(new Event('hw_os_notes_updated'));
        
        // Reset to empty state
        const newNote = { id: crypto.randomUUID(), title: 'SCRATCHPAD', content: 'Start typing...', timestamp: Date.now(), tags: [] };
        setNote(newNote);
        if (editorRef.current) editorRef.current.innerHTML = newNote.content;
      } catch (e) {}
    }
  };

  const openInNotes = () => {
    // We can't directly launch the app from here easily without passing handleStartApp,
    // but we can dispatch a custom event that App.tsx listens to.
    window.dispatchEvent(new CustomEvent('hw_os_open_app', { 
      detail: { appId: 'notes', morphFromId: instanceId } 
    }));
  };

  return (
    <div className={cn(
      "w-full h-full flex flex-col overflow-hidden group/widget",
      isGlassy ? "bg-white/5 backdrop-blur-md" : "bg-hw-blue/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-hw-blue/10 bg-hw-blue/5">
        <div className="flex items-center gap-2">
          <StickyNote className="w-3 h-3 text-hw-blue" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-hw-blue truncate max-w-[80px]">
            {note.title}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity">
          <button onClick={openInNotes} className="p-1 hover:bg-hw-blue/20 rounded text-hw-blue" title="Open in Notes">
            <ExternalLink size={10} />
          </button>
          <button onClick={deleteNote} className="p-1 hover:bg-red-500/20 rounded text-red-500/60 hover:text-red-500" title="Delete Note">
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <div 
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => handleChange(e.currentTarget.innerHTML)}
          className={cn(
            "flex-1 p-3 outline-none text-[11px] leading-relaxed custom-scrollbar overflow-y-auto",
            isGlassy ? "text-white/80" : ""
          )}
          style={{ color: isGlassy ? undefined : mainColor }}
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
        
        {/* Big Action Button - Improved positioning and visibility */}
        <div className="absolute bottom-0 left-0 w-full p-2 translate-y-full group-hover/widget:translate-y-0 transition-all duration-300 z-20 bg-gradient-to-t from-hw-black/80 to-transparent pt-8">
          <button 
            onClick={openInNotes}
            className="w-full bg-hw-blue text-hw-black py-2 rounded shadow-[0_0_20px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest hover:bg-white transition-colors border border-hw-blue/50"
          >
            <ExternalLink size={12} />
            Open in Full Editor
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1 flex justify-between items-center bg-black/20 border-t border-hw-blue/5">
        <span className="text-[7px] opacity-30 uppercase font-mono">
          Last Sync: {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="flex gap-1">
           <div className="w-1 h-1 rounded-full bg-hw-blue/40" />
           <div className="w-1 h-1 rounded-full bg-hw-blue/20" />
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};
