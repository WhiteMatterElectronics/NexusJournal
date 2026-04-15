import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tutorial, TutorialBlock, BlockType } from '../types';
import { ArrowLeft, Clock, Share2, Terminal, FileText, Download, ExternalLink, Zap, Edit3, Save, X, Plus, Trash2, ArrowUp, ArrowDown, Bold, Italic, Code, List, AlignLeft, Image as ImageIcon, Heading, Minus, Video, LayoutGrid, AlertCircle, Upload, Link, Table, CheckSquare, Strikethrough, Copy, Clipboard, Type, ListOrdered, Quote } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BlockRenderer } from './shared/BlockRenderer';
import { BlockEditor } from './shared/BlockEditor';

interface TutorialDetailProps {
  tutorial: Tutorial;
  onBack: () => void;
  onFlashFirmware?: (firmwareId: string) => void;
  onUpdate?: (tutorial: Tutorial) => Promise<void>;
}

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
    return <BlockRenderer blocks={[block]} />;
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
