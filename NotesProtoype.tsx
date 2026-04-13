import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Save, Trash2, Bold, Italic, List, Code, 
  Image as ImageIcon, Type, Activity, StopCircle, PlayCircle,
  FileText, AlignLeft, AlignCenter, AlignRight, Share2, Terminal
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  tags: string[];
}

export const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCapturingSerial, setIsCapturingSerial] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Load notes on mount
  useEffect(() => {
    const saved = localStorage.getItem('hw_os_notes');
    if (saved) {
      const parsed = JSON.parse(saved);
      setNotes(parsed);
      if (parsed.length > 0) setActiveNoteId(parsed[0].id);
    }
  }, []);

  // Save notes on change
  const saveToDisk = (updatedNotes: Note[]) => {
    localStorage.setItem('hw_os_notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

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
    handleContentChange();
  };

  const handleContentChange = () => {
    if (!activeNoteId || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const updated = notes.map(n => 
      n.id === activeNoteId ? { ...n, content, timestamp: Date.now() } : n
    );
    saveToDisk(updated);
  };

  const updateTitle = (val: string) => {
    if (!activeNoteId) return;
    const updated = notes.map(n => 
      n.id === activeNoteId ? { ...n, title: val } : n
    );
    saveToDisk(updated);
  };

  // UI for the Serial Redirecter Block
  const insertSerialBlock = () => {
    const blockHtml = `
      <div class="serial-block border-2 border-hw-blue/40 bg-hw-blue/10 p-4 my-4 rounded font-mono text-[10px] relative" contenteditable="false">
        <div class="flex justify-between items-center mb-2 border-b border-hw-blue/20 pb-1">
          <span class="flex items-center gap-2"><Activity size={12}/> SERIAL_STREAM_BUFFER</span>
          <span class="text-[8px] opacity-50">ESP32-C3 FEED</span>
        </div>
        <div class="text-hw-blue/80 italic mb-2">[Waiting for stream connection...]</div>
        <div class="flex gap-2">
           <button class="bg-hw-blue text-hw-black px-2 py-0.5 rounded text-[10px] font-bold">START CAPTURE</button>
           <button class="border border-hw-blue/40 px-2 py-0.5 rounded text-[10px]">CLEAR</button>
        </div>
      </div>
      <p><br></p>
    `;
    exec('insertHTML', blockHtml);
  };

  const insertCodeBlock = () => {
    const codeHtml = `
      <pre class="bg-hw-black border border-hw-blue/30 p-3 my-2 rounded font-mono text-xs text-hw-blue overflow-x-auto">
        <code>// Paste code here</code>
      </pre>
      <p><br></p>
    `;
    exec('insertHTML', codeHtml);
  };

  return (
    <div className="flex h-full bg-hw-black text-hw-blue overflow-hidden select-none">
      {/* Sidebar */}
      <div className="w-64 border-r border-hw-blue/20 flex flex-col bg-hw-blue/5">
        <div className="p-4 border-b border-hw-blue/20">
          <button 
            onClick={createNote}
            className="w-full bg-hw-blue text-hw-black py-2 rounded flex items-center justify-center gap-2 font-bold text-xs hover:bg-white transition-colors"
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
              className="w-full bg-hw-black border border-hw-blue/20 rounded py-1.5 pl-8 pr-2 text-[10px] outline-none focus:border-hw-blue"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredNotes.map(note => (
            <div 
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={`p-3 border-b border-hw-blue/10 cursor-pointer transition-all group ${activeNoteId === note.id ? 'bg-hw-blue/20' : 'hover:bg-hw-blue/10'}`}
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
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div 
                className="text-[9px] opacity-40 line-clamp-1"
                dangerouslySetInnerHTML={{ __html: note.content.substring(0, 50) }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <>
            {/* Main Toolbar */}
            <div className="bg-hw-blue/10 border-b border-hw-blue/20 p-1 flex flex-wrap gap-1 items-center">
              <div className="flex items-center gap-0.5 border-r border-hw-blue/20 pr-1 mr-1">
                <button onClick={() => exec('bold')} title="Bold" className="p-1.5 hover:bg-hw-blue/20 rounded"><Bold size={14}/></button>
                <button onClick={() => exec('italic')} title="Italic" className="p-1.5 hover:bg-hw-blue/20 rounded"><Italic size={14}/></button>
                <button onClick={() => exec('strikeThrough')} title="Strikethrough" className="p-1.5 hover:bg-hw-blue/20 rounded text-[10px] font-bold px-2">S</button>
              </div>

              <div className="flex items-center gap-0.5 border-r border-hw-blue/20 pr-1 mr-1">
                <select 
                  onChange={(e) => exec('fontSize', e.target.value)}
                  className="bg-hw-black text-hw-blue text-[10px] border border-hw-blue/20 rounded px-1 py-0.5 outline-none"
                >
                  <option value="1">Small</option>
                  <option value="3" selected>Normal</option>
                  <option value="5">Large</option>
                  <option value="7">Giant</option>
                </select>
                <select 
                  onChange={(e) => exec('foreColor', e.target.value)}
                  className="bg-hw-black text-hw-blue text-[10px] border border-hw-blue/20 rounded px-1 py-0.5 outline-none ml-1"
                >
                  <option value="#00f3ff">Blue</option>
                  <option value="#ffffff">White</option>
                  <option value="#ff0000">Red</option>
                  <option value="#00ff00">Green</option>
                  <option value="#ffff00">Yellow</option>
                </select>
              </div>

              <div className="flex items-center gap-0.5 border-r border-hw-blue/20 pr-1 mr-1">
                <button onClick={() => exec('justifyLeft')} className="p-1.5 hover:bg-hw-blue/20 rounded"><AlignLeft size={14}/></button>
                <button onClick={() => exec('justifyCenter')} className="p-1.5 hover:bg-hw-blue/20 rounded"><AlignCenter size={14}/></button>
                <button onClick={() => exec('insertUnorderedList')} className="p-1.5 hover:bg-hw-blue/20 rounded"><List size={14}/></button>
              </div>

              <div className="flex items-center gap-0.5 border-r border-hw-blue/20 pr-1 mr-1">
                <button onClick={insertCodeBlock} title="Code Block" className="p-1.5 hover:bg-hw-blue/20 rounded flex items-center gap-1">
                  <Code size={14}/>
                </button>
                <button onClick={() => {
                  const url = prompt('Enter Image URL:');
                  if(url) exec('insertImage', url);
                }} className="p-1.5 hover:bg-hw-blue/20 rounded"><ImageIcon size={14}/></button>
              </div>

              <div className="flex items-center gap-1 ml-auto pr-2">
                <button 
                  onClick={insertSerialBlock}
                  className="bg-hw-blue/20 border border-hw-blue/40 text-[9px] px-2 py-1 rounded flex items-center gap-1 hover:bg-hw-blue hover:text-hw-black transition-all"
                >
                  <Terminal size={12}/> ATTACH SERIAL FEED
                </button>
              </div>
            </div>

            {/* Title Bar */}
            <input 
              value={activeNote.title}
              onChange={(e) => updateTitle(e.target.value)}
              className="bg-transparent text-xl font-bold p-6 pb-2 outline-none uppercase tracking-widest text-hw-blue border-b border-hw-blue/5"
              placeholder="NOTE TITLE"
            />

            {/* Rich Editor */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar outline-none">
              <div 
                ref={editorRef}
                contentEditable
                onInput={handleContentChange}
                className="min-h-full prose prose-invert prose-hw text-hw-blue/90 focus:outline-none editor-content"
                dangerouslySetInnerHTML={{ __html: activeNote.content }}
                style={{ caretColor: '#00f3ff' }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 select-none">
            <FileText size={80} />
            <p className="mt-4 font-bold tracking-widest">SELECT OR CREATE A DATA SLAB</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 243, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 243, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 243, 255, 0.4); }
        
        .editor-content {
          font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.6;
        }
        .editor-content pre {
          background: #050505 !important;
          border: 1px solid rgba(0, 243, 255, 0.1) !important;
        }
        .editor-content blockquote {
          border-left: 3px solid #00f3ff;
          padding-left: 1rem;
          font-style: italic;
          opacity: 0.8;
        }
        .editor-content img {
          max-width: 100%;
          border: 1px solid rgba(0, 243, 255, 0.2);
          border-radius: 4px;
        }
        .prose-hw h1, .prose-hw h2, .prose-hw h3 {
          color: #00f3ff;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
};