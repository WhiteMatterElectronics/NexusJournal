import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tutorial, TutorialBlock, BlockType } from '../types';
import { ArrowLeft, Clock, Share2, Terminal, FileText, Download, ExternalLink, Zap, Edit3, Save, X, Plus, Trash2, ArrowUp, ArrowDown, Bold, Italic, Code, List, AlignLeft, Image as ImageIcon, Heading, Minus, Video, LayoutGrid, AlertCircle, Upload, Link, Table, CheckSquare, Strikethrough, Copy, Clipboard, Type, ListOrdered, Quote } from 'lucide-react';
import { cn } from '../lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'motion/react';

interface TutorialDetailProps {
  tutorial: Tutorial;
  onBack: () => void;
  onFlashFirmware?: (firmwareId: string) => void;
  onUpdate?: (tutorial: Tutorial) => Promise<void>;
}

// Reusable Rich Text Editor component for blocks
const BlockEditor = React.memo(({ 
  initialContent, 
  onChange,
  onFocus
}: { 
  initialContent: string, 
  onChange: (content: string) => void,
  onFocus?: () => void
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastContent = useRef(initialContent);

  useEffect(() => {
    if (editorRef.current && initialContent !== editorRef.current.innerHTML) {
      // Only update if the change is external (not from our own input)
      if (initialContent !== lastContent.current) {
        editorRef.current.innerHTML = initialContent;
        lastContent.current = initialContent;
      }
    }
  }, [initialContent]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    lastContent.current = content;
    onChange(content);
  };

  return (
    <div 
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onFocus={onFocus}
      className="w-full bg-black/20 border border-hw-blue/10 p-3 outline-none text-[11px] text-hw-blue/90 min-h-[100px] prose prose-invert prose-sm max-w-none focus:border-hw-blue/40 transition-colors"
      dangerouslySetInnerHTML={{ __html: initialContent }}
      style={{ caretColor: '#00f2ff' }}
    />
  );
});

export const TutorialDetail: React.FC<TutorialDetailProps> = ({ tutorial, onBack, onFlashFirmware, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTutorial, setEditedTutorial] = useState<Tutorial>(tutorial);
  const [blocks, setBlocks] = useState<TutorialBlock[]>([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const blockImageInputRef = React.useRef<HTMLInputElement>(null);
  const [activeBlockUpload, setActiveBlockUpload] = useState<{ id: string, index?: number } | null>(null);

  useEffect(() => {
    setEditedTutorial(tutorial);
    try {
      const parsed = JSON.parse(tutorial.content);
      if (Array.isArray(parsed)) {
        setBlocks(parsed);
      } else {
        setBlocks([{ id: 'legacy', type: 'markdown', data: { text: tutorial.content } }]);
      }
    } catch {
      setBlocks([{ id: 'legacy', type: 'markdown', data: { text: tutorial.content } }]);
    }
  }, [tutorial]);

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      const updated = {
        ...editedTutorial,
        content: JSON.stringify(blocks)
      };
      await onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save tutorial:', err);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const updateBlock = (id: string, data: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data } : b));
  };

  const addBlock = (type: BlockType) => {
    const newBlock: TutorialBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: getDefaultDataForType(type)
    };
    setBlocks([...blocks, newBlock]);
    setShowBlockMenu(false);
  };

  const getDefaultDataForType = (type: BlockType) => {
    switch (type) {
      case 'markdown': return { text: '' };
      case 'code': return { language: 'cpp', code: '' };
      case 'image': return { url: '', caption: '', width: 100 };
      case 'file_download': return { url: '', name: '' };
      case 'sub_heading': return { text: '' };
      case 'divider': return {};
      case 'video_embed': return { url: '' };
      case 'image_gallery': return { urls: [''] };
      case 'note': return { type: 'info', text: '' };
      case 'attached_note': return { noteId: '' };
      default: return {};
    }
  };

  const duplicateBlock = (index: number) => {
    const block = blocks[index];
    const newBlock: TutorialBlock = {
      ...block,
      id: Math.random().toString(36).substr(2, 9),
      data: JSON.parse(JSON.stringify(block.data))
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const copyBlockContent = (block: TutorialBlock) => {
    let content = '';
    if (block.type === 'markdown') content = block.data.text;
    else if (block.type === 'code') content = block.data.code;
    else content = JSON.stringify(block.data, null, 2);
    
    navigator.clipboard.writeText(content);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newBlocks = [...blocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      setBlocks(newBlocks);
    } else if (direction === 'down' && index < blocks.length - 1) {
      const newBlocks = [...blocks];
      [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
      setBlocks(newBlocks);
    }
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Force a re-render/sync for the active element if it's one of our editors
    const active = document.activeElement;
    if (active && active.hasAttribute('contenteditable')) {
      const event = new Event('input', { bubbles: true });
      active.dispatchEvent(event);
    }
  };

  const handleBlockImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBlockUpload) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.url) {
        const block = blocks.find(b => b.id === activeBlockUpload.id);
        if (block) {
          if (block.type === 'image') {
            updateBlock(block.id, { ...block.data, url: data.url });
          } else if (block.type === 'image_gallery' && typeof activeBlockUpload.index === 'number') {
            const newUrls = [...block.data.urls];
            newUrls[activeBlockUpload.index] = data.url;
            updateBlock(block.id, { ...block.data, urls: newUrls });
          }
        }
      }
    } catch (err) {
      console.error('Block image upload failed:', err);
    } finally {
      setActiveBlockUpload(null);
      if (blockImageInputRef.current) blockImageInputRef.current.value = '';
    }
  };

  const renderBlockEditor = (block: TutorialBlock, index: number) => {
    return (
      <div key={block.id} className="border border-hw-blue/20 bg-hw-blue/5 rounded-sm overflow-hidden mb-4 group">
        <div className="flex items-center justify-between px-3 py-2 bg-hw-blue/10 border-b border-hw-blue/20">
          <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue">{block.type.replace('_', ' ')}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => copyBlockContent(block)} className="p-1 text-hw-blue/40 hover:text-hw-blue" title="Copy Content"><Clipboard className="w-3 h-3" /></button>
            <button onClick={() => duplicateBlock(index)} className="p-1 text-hw-blue/40 hover:text-hw-blue" title="Duplicate Block"><Copy className="w-3 h-3" /></button>
            <div className="w-px h-3 bg-hw-blue/20 mx-1" />
            <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1 text-hw-blue/40 hover:text-hw-blue disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
            <button onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-1 text-hw-blue/40 hover:text-hw-blue disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
            <div className="w-px h-3 bg-hw-blue/20 mx-1" />
            <button onClick={() => deleteBlock(block.id)} className="p-1 text-red-500/60 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        <div className="p-3">
          {block.type === 'markdown' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1 border-b border-hw-blue/10 pb-2 mb-2">
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('formatBlock', 'H1')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="H1"><span className="text-[10px] font-bold">H1</span></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('formatBlock', 'H2')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="H2"><span className="text-[10px] font-bold">H2</span></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('formatBlock', 'H3')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="H3"><span className="text-[10px] font-bold">H3</span></button>
                <div className="w-px h-3 bg-hw-blue/10 mx-1" />
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('bold')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Bold"><Bold className="w-3 h-3" /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('italic')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Italic"><Italic className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('strikeThrough')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Strikethrough"><Strikethrough className="w-3 h-3" /></button>
                <div className="w-px h-3 bg-hw-blue/10 mx-1" />
                <button onMouseDown={e => e.preventDefault()} onClick={() => {
                  const url = prompt('Enter URL:');
                  if (url) execCommand('createLink', url);
                }} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Link"><Link className="w-3 h-3" /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Bullet List"><List className="w-3 h-3" /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('insertOrderedList')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Ordered List"><ListOrdered className="w-3 h-3" /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Quote"><Quote className="w-3 h-3" /></button>
                <div className="w-px h-3 bg-hw-blue/10 mx-1" />
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('insertHorizontalRule')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Horizontal Rule"><Minus className="w-3 h-3" /></button>
              </div>
              <BlockEditor 
                initialContent={block.data.text}
                onChange={(content) => updateBlock(block.id, { ...block.data, text: content })}
              />
            </div>
          )}
          {block.type === 'code' && (
            <div className="space-y-2">
              <select
                value={block.data.language}
                onChange={(e) => updateBlock(block.id, { ...block.data, language: e.target.value })}
                className="bg-hw-blue/10 border border-hw-blue/20 text-[10px] text-hw-blue px-2 py-1 outline-none"
              >
                <option value="cpp">C++ / Arduino</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="json">JSON</option>
              </select>
              <textarea
                value={block.data.code}
                onChange={(e) => updateBlock(block.id, { ...block.data, code: e.target.value })}
                className="w-full bg-black/40 border border-hw-blue/20 p-2 outline-none text-[10px] text-hw-blue font-mono resize-y min-h-[100px]"
                placeholder="Paste code here..."
              />
            </div>
          )}
          {block.type === 'image' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={block.data.url}
                  onChange={(e) => updateBlock(block.id, { ...block.data, url: e.target.value })}
                  className="flex-1 bg-transparent border-b border-hw-blue/20 outline-none text-[10px] text-hw-blue py-1"
                  placeholder="Image URL..."
                />
                <button 
                  onClick={() => {
                    setActiveBlockUpload({ id: block.id });
                    blockImageInputRef.current?.click();
                  }}
                  className="p-1 text-hw-blue/40 hover:text-hw-blue"
                  title="Upload Local Image"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[8px] text-hw-blue/40 uppercase block mb-1">Scale / Width (%)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      step="5"
                      value={block.data.width || 100}
                      onChange={(e) => updateBlock(block.id, { ...block.data, width: parseInt(e.target.value) })}
                      className="flex-1 accent-hw-blue h-1 bg-hw-blue/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[10px] text-hw-blue font-mono w-8">{block.data.width || 100}%</span>
                  </div>
                </div>
                <div className="text-[8px] text-hw-blue/40 uppercase">
                  {block.data.width < 100 ? 'Side-by-side enabled' : 'Full width'}
                </div>
              </div>
              <input
                type="text"
                value={block.data.caption}
                onChange={(e) => updateBlock(block.id, { ...block.data, caption: e.target.value })}
                className="w-full bg-transparent border-b border-hw-blue/20 outline-none text-[10px] text-hw-blue py-1"
                placeholder="Caption (optional)..."
              />
            </div>
          )}
          {block.type === 'sub_heading' && (
            <input
              type="text"
              value={block.data.text}
              onChange={(e) => updateBlock(block.id, { ...block.data, text: e.target.value })}
              className="w-full bg-transparent border-none outline-none text-[14px] font-bold text-hw-blue py-1"
              placeholder="Sub-heading text..."
            />
          )}
          {block.type === 'file_download' && (
            <div className="space-y-2">
              <input
                type="text"
                value={block.data.url}
                onChange={(e) => updateBlock(block.id, { ...block.data, url: e.target.value })}
                className="w-full bg-transparent border-b border-hw-blue/20 outline-none text-[10px] text-hw-blue py-1"
                placeholder="File URL..."
              />
              <input
                type="text"
                value={block.data.name}
                onChange={(e) => updateBlock(block.id, { ...block.data, name: e.target.value })}
                className="w-full bg-transparent border-b border-hw-blue/20 outline-none text-[10px] text-hw-blue py-1"
                placeholder="Display Name..."
              />
            </div>
          )}
          {block.type === 'video_embed' && (
            <input
              type="text"
              value={block.data.url}
              onChange={(e) => updateBlock(block.id, { ...block.data, url: e.target.value })}
              className="w-full bg-transparent border-b border-hw-blue/20 outline-none text-[10px] text-hw-blue py-1"
              placeholder="Video Embed URL..."
            />
          )}
          {block.type === 'image_gallery' && (
            <div className="space-y-2">
              {block.data.urls.map((url: string, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...block.data.urls];
                      newUrls[i] = e.target.value;
                      updateBlock(block.id, { ...block.data, urls: newUrls });
                    }}
                    className="flex-1 bg-transparent border-b border-hw-blue/20 outline-none text-[10px] text-hw-blue py-1"
                    placeholder={`Image URL ${i + 1}...`}
                  />
                  <button 
                    onClick={() => {
                      setActiveBlockUpload({ id: block.id, index: i });
                      blockImageInputRef.current?.click();
                    }}
                    className="p-1 text-hw-blue/40 hover:text-hw-blue"
                    title="Upload Local Image"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      const newUrls = block.data.urls.filter((_: any, idx: number) => idx !== i);
                      updateBlock(block.id, { ...block.data, urls: newUrls });
                    }}
                    className="p-1 text-red-500/60 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => updateBlock(block.id, { ...block.data, urls: [...block.data.urls, ''] })}
                className="text-[9px] font-bold text-hw-blue/60 hover:text-hw-blue uppercase tracking-widest mt-2"
              >
                + ADD IMAGE URL
              </button>
            </div>
          )}
          {block.type === 'note' && (
            <div className="space-y-2">
              <select
                value={block.data.type}
                onChange={(e) => updateBlock(block.id, { ...block.data, type: e.target.value })}
                className="bg-hw-blue/10 border border-hw-blue/20 text-[10px] text-hw-blue px-2 py-1 outline-none"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="tip">Tip</option>
              </select>
              <textarea
                value={block.data.text}
                onChange={(e) => updateBlock(block.id, { ...block.data, text: e.target.value })}
                className="w-full bg-transparent border-none outline-none text-[10px] text-hw-blue resize-y min-h-[50px]"
                placeholder="Note content..."
              />
            </div>
          )}
          {block.type === 'attached_note' && (
            <div className="space-y-3">
              <div className="text-[10px] text-hw-blue/40 uppercase mb-1">Select Note to Attach</div>
              <select
                value={block.data.noteId || ''}
                onChange={(e) => updateBlock(block.id, { ...block.data, noteId: e.target.value })}
                className="w-full bg-hw-blue/10 border border-hw-blue/20 text-[10px] text-hw-blue px-2 py-2 outline-none"
              >
                <option value="">-- Choose a note --</option>
                {(() => {
                  const saved = localStorage.getItem('hw_os_notes');
                  if (saved) {
                    try {
                      const notes = JSON.parse(saved);
                      return notes.map((n: any) => (
                        <option key={n.id} value={n.id}>{n.title}</option>
                      ));
                    } catch (e) { return null; }
                  }
                  return null;
                })()}
              </select>
              <div className="text-[8px] text-hw-blue/30 uppercase italic">
                Note: Changes in the Notes app will reflect here automatically.
              </div>
            </div>
          )}
          {block.type === 'divider' && (
            <div className="w-full h-px bg-hw-blue/20 my-2" />
          )}
        </div>
      </div>
    );
  };
  const attachments = (() => {
    try {
      const parsed = tutorial.attachments ? JSON.parse(tutorial.attachments) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const renderBlock = (block: TutorialBlock) => {
    switch (block.type) {
      case 'markdown':
        return (
          <div 
            className="prose prose-invert max-w-none 
              prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:text-hw-blue prose-headings:hw-glow
              prose-p:text-hw-blue/80 prose-p:leading-relaxed prose-p:text-sm
              prose-code:text-hw-blue prose-code:bg-hw-blue/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-[''] prose-code:after:content-['']
              prose-pre:bg-black/60 prose-pre:border prose-pre:border-hw-blue/20 prose-pre:p-8 prose-pre:rounded-none
              prose-li:text-hw-blue/70 prose-li:text-sm
              prose-strong:text-hw-blue prose-strong:font-bold
              prose-hr:border-hw-blue/10
              prose-img:border prose-img:border-hw-blue/20 prose-img:p-2 prose-img:bg-hw-blue/5
            "
            dangerouslySetInnerHTML={{ __html: block.data.text }}
          />
        );
      case 'code':
        return (
          <div className="my-6 group/code relative">
            <div className="bg-hw-blue/10 border border-hw-blue/20 border-b-0 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                {block.data.language}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(block.data.code)}
                className="opacity-0 group-hover/code:opacity-100 transition-opacity hover:text-hw-blue"
                title="Copy Code"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <SyntaxHighlighter 
                language={block.data.language || 'text'} 
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(0, 242, 255, 0.2)',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#00f2ff',
                    textShadow: '0 0 5px rgba(0, 242, 255, 0.3)'
                  }
                }}
              >
                {block.data.code}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      case 'image':
        const imgWidth = block.data.width || 100;
        const isInline = imgWidth < 100;
        return (
          <div className={cn(
            "my-8",
            isInline ? "inline-block align-top px-2" : "block"
          )} style={{ width: isInline ? `${imgWidth}%` : '100%' }}>
            <div className="relative group/img">
              <img 
                src={block.data.url} 
                alt={block.data.caption} 
                className="max-w-full h-auto border border-hw-blue/20 p-2 bg-hw-blue/5 mx-auto transition-transform duration-500 hover:scale-[1.02]" 
              />
              {block.data.caption && <p className="text-center text-[10px] text-hw-blue/40 mt-3 uppercase tracking-widest">{block.data.caption}</p>}
            </div>
          </div>
        );
      case 'attached_note':
        const note = (() => {
          const saved = localStorage.getItem('hw_os_notes');
          if (saved) {
            try {
              const notes = JSON.parse(saved);
              return notes.find((n: any) => n.id === block.data.noteId);
            } catch (e) { return null; }
          }
          return null;
        })();

        if (!note) return (
          <div className="my-6 p-4 border border-dashed border-hw-blue/20 text-hw-blue/40 text-[10px] uppercase tracking-widest text-center">
            Note not found or deleted
          </div>
        );

        return (
          <motion.div 
            initial={{ opacity: 0, y: 20, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            whileHover={{ rotate: 1, scale: 1.01 }}
            className="my-8 relative group/note"
          >
            <div className="absolute -inset-1 bg-hw-blue/20 blur-sm opacity-0 group-hover/note:opacity-100 transition-opacity" />
            <div className="relative bg-hw-blue/5 border border-hw-blue/30 p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-hw-blue/10 rotate-45 translate-x-6 -translate-y-6" />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-hw-blue animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue/60">ATTACHED_NOTE</span>
              </div>
              <h4 className="text-lg font-bold text-hw-blue mb-3">{note.title}</h4>
              <div 
                className="text-sm text-hw-blue/80 prose prose-invert prose-sm max-w-none line-clamp-4"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
              <div className="mt-4 pt-4 border-t border-hw-blue/10 flex justify-between items-center">
                <span className="text-[9px] text-hw-blue/40 uppercase tracking-widest">
                  {new Date(note.timestamp).toLocaleDateString()}
                </span>
                <button 
                  onClick={() => {
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(`
                        <html>
                          <head>
                            <title>${note.title}</title>
                            <style>
                              body { background: #0a0a0a; color: #00f2ff; font-family: sans-serif; padding: 40px; }
                              .prose { max-width: 800px; margin: 0 auto; line-height: 1.6; }
                              h1 { border-bottom: 1px solid #00f2ff33; padding-bottom: 20px; }
                            </style>
                          </head>
                          <body>
                            <div class="prose">
                              <h1>${note.title}</h1>
                              ${note.content}
                            </div>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  className="text-[10px] font-bold text-hw-blue hover:underline uppercase tracking-widest"
                >
                  READ_FULL_NOTE
                </button>
              </div>
            </div>
          </motion.div>
        );
      case 'sub_heading':
        return <h3 className="text-2xl font-black text-hw-blue hw-glow mt-12 mb-6 uppercase tracking-tighter">{block.data.text}</h3>;
      case 'file_download':
        return (
          <a href={block.data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 my-6 bg-hw-blue/10 border border-hw-blue/30 hover:bg-hw-blue/20 transition-colors group w-fit">
            <Download className="w-5 h-5 text-hw-blue group-hover:-translate-y-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest text-hw-blue">{block.data.name || 'Download File'}</span>
          </a>
        );
      case 'video_embed':
        return (
          <div className="my-8 aspect-video w-full border border-hw-blue/20 bg-black/50">
            <iframe 
              src={block.data.url} 
              className="w-full h-full" 
              allowFullScreen 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            />
          </div>
        );
      case 'image_gallery':
        return (
          <div className="my-8 grid grid-cols-2 md:grid-cols-3 gap-4">
            {block.data.urls.map((url: string, i: number) => (
              url ? <img key={i} src={url} alt={`Gallery image ${i + 1}`} className="w-full h-48 object-cover border border-hw-blue/20 bg-hw-blue/5" /> : null
            ))}
          </div>
        );
      case 'note':
        return (
          <div className={cn(
            "my-6 p-5 border-l-2 bg-hw-blue/5 text-sm leading-relaxed",
            block.data.type === 'warning' ? "border-yellow-500 text-yellow-500/90" :
            block.data.type === 'tip' ? "border-green-500 text-green-500/90" :
            "border-hw-blue text-hw-blue/90"
          )}>
            <div className="font-bold uppercase tracking-widest mb-2 text-[10px] opacity-70 flex items-center gap-2">
              {block.data.type}
            </div>
            {block.data.text}
          </div>
        );
      case 'divider':
        return <div className="w-full h-px bg-hw-blue/20 my-10" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-hw-blue/40 hover:text-hw-blue transition-all text-[10px] font-bold uppercase tracking-widest group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          RETURN_TO_DATABASE
        </button>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-hw-blue text-hw-black px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
              >
                {isSaving ? <span className="animate-spin">...</span> : <Save className="w-3.5 h-3.5" />}
                COMMIT_CHANGES
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                CANCEL
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-hw-blue/10 text-hw-blue border border-hw-blue/30 px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-hw-blue/20 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              QUICK_EDIT
            </button>
          )}
        </div>
      </div>

      <header className="mb-12 border-b border-hw-blue/20 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-hw-blue uppercase tracking-widest px-3 py-1 bg-hw-blue/10 border border-hw-blue/30">
              {tutorial.category}
            </span>
            <div className="flex items-center gap-2 text-hw-blue/40 text-[10px] font-bold uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              <span>10 MIN_READ</span>
            </div>
          </div>
          {tutorial.firmwareId && onFlashFirmware && !isEditing && (
            <button 
              onClick={() => onFlashFirmware(tutorial.firmwareId!)}
              className="hw-button py-2 px-6 flex items-center gap-2 bg-hw-blue text-hw-black hover:bg-hw-blue/90"
            >
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">FLASH_FIRMWARE</span>
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <input 
              value={editedTutorial.title}
              onChange={e => setEditedTutorial({...editedTutorial, title: e.target.value})}
              className="text-5xl font-black tracking-tighter w-full bg-transparent border-b border-hw-blue/20 outline-none uppercase hw-glow py-2"
              placeholder="TUTORIAL TITLE"
            />
            <textarea 
              value={editedTutorial.description}
              onChange={e => setEditedTutorial({...editedTutorial, description: e.target.value})}
              className="text-lg text-hw-blue/60 leading-relaxed w-full bg-transparent border-none outline-none resize-none h-24"
              placeholder="Tutorial description..."
            />
          </div>
        ) : (
          <>
            <h1 className="text-5xl font-black tracking-tighter mb-6 uppercase hw-glow">{tutorial.title}</h1>
            <p className="text-lg text-hw-blue/60 leading-relaxed max-w-2xl">
              {tutorial.description}
            </p>
          </>
        )}
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-hw-blue/30">
            <Terminal className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {isEditing ? 'Block_Editor // Active' : 'Document_Stream // Decrypted'}
            </span>
          </div>
          
          {isEditing && (
            <div className="relative">
              <button 
                onClick={() => setShowBlockMenu(!showBlockMenu)}
                className="flex items-center gap-2 text-[9px] font-bold text-hw-blue hover:hw-glow transition-all uppercase border border-hw-blue/40 px-3 py-1 rounded-sm"
              >
                <Plus className="w-3 h-3" /> ADD BLOCK
              </button>
              {showBlockMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-hw-black border border-hw-blue/30 shadow-[0_0_15px_rgba(0,242,255,0.1)] z-10 py-2">
                  {[
                    { type: 'markdown', icon: AlignLeft, label: 'RICH TEXT' },
                    { type: 'code', icon: Code, label: 'CODE SNIPPET' },
                    { type: 'image', icon: ImageIcon, label: 'IMAGE' },
                    { type: 'file_download', icon: FileText, label: 'FILE DOWNLOAD' },
                    { type: 'sub_heading', icon: Heading, label: 'SUB-HEADING' },
                    { type: 'divider', icon: Minus, label: 'DIVIDER' },
                    { type: 'video_embed', icon: Video, label: 'VIDEO EMBED' },
                    { type: 'image_gallery', icon: LayoutGrid, label: 'IMAGE GALLERY' },
                    { type: 'note', icon: AlertCircle, label: 'NOTE / TIP' },
                    { type: 'attached_note', icon: Copy, label: 'ATTACHED NOTE' },
                  ].map(item => (
                    <button
                      key={item.type}
                      onClick={() => addBlock(item.type as BlockType)}
                      className="w-full text-left px-4 py-2 text-[9px] font-bold uppercase text-hw-blue/60 hover:text-hw-blue hover:bg-hw-blue/10 flex items-center gap-3"
                    >
                      <item.icon className="w-3 h-3" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            {blocks.map((block, index) => renderBlockEditor(block, index))}
          </div>
        ) : (
          blocks.map(block => (
            <div key={block.id}>
              {renderBlock(block)}
            </div>
          ))
        )}
      </div>

      <input 
        type="file" 
        ref={blockImageInputRef} 
        onChange={handleBlockImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {attachments.length > 0 && (
        <div className="mt-16 space-y-6">
          <div className="flex items-center gap-2 text-hw-blue/40">
            <FileText className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Linked_Resources // Attachments</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attachments.map((file: any, i: number) => (
              <a 
                key={i}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-hw-blue/5 border border-hw-blue/20 rounded-sm hover:border-hw-blue transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-hw-blue/10 flex items-center justify-center">
                    <Download className="w-4 h-4 text-hw-blue/40 group-hover:text-hw-blue transition-colors" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-tight group-hover:hw-glow transition-all">{file.name}</span>
                    <span className="text-[8px] text-hw-blue/30 uppercase">{file.type}</span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-hw-blue/20 group-hover:text-hw-blue/40 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-20 pt-10 border-t border-hw-blue/20 flex justify-between items-center">
        <div className="text-[10px] font-bold text-hw-blue/40 uppercase tracking-widest">
          Difficulty: <span className="text-hw-blue hw-glow">{tutorial.difficulty}</span>
        </div>
      </footer>
    </div>
  );
};
