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

  return (
    <div className={cn(
      "w-full h-full flex flex-col overflow-hidden group/widget",
      isGlassy ? "bg-white/5 backdrop-blur-md" : "bg-hw-blue/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hw-blue/10 bg-hw-blue/5" style={{ padding: 'max(4px, 2cqmin) max(8px, 4cqmin)' }}>
        <div className="flex items-center gap-1">
          <StickyNote className="text-hw-blue" style={{ width: 'max(8px, 6cqmin)', height: 'max(8px, 6cqmin)' }} />
          <span className="font-bold uppercase tracking-widest text-hw-blue truncate max-w-[80px]" style={{ fontSize: 'max(6px, 5cqmin)' }}>
            {note.title}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity">
          <button onClick={deleteNote} className="p-1 hover:bg-red-500/20 rounded text-red-500/60 hover:text-red-500" title="Delete Note">
            <Trash2 style={{ width: 'max(8px, 6cqmin)', height: 'max(8px, 6cqmin)' }} />
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
            "flex-1 outline-none leading-relaxed custom-scrollbar overflow-y-auto",
            isGlassy ? "text-white/80" : ""
          )}
          style={{ color: isGlassy ? undefined : mainColor, padding: 'max(8px, 4cqmin)', fontSize: 'max(8px, 6cqmin)' }}
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center bg-black/20 border-t border-hw-blue/5" style={{ padding: 'max(2px, 1cqmin) max(8px, 4cqmin)' }}>
        <span className="opacity-30 uppercase font-mono" style={{ fontSize: 'max(5px, 4cqmin)' }}>
          Last Sync: {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="flex gap-1">
           <div className="rounded-full bg-hw-blue/40" style={{ width: 'max(2px, 1cqmin)', height: 'max(2px, 1cqmin)' }} />
           <div className="rounded-full bg-hw-blue/20" style={{ width: 'max(2px, 1cqmin)', height: 'max(2px, 1cqmin)' }} />
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
