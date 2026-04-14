import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileUp, Plus, Settings, Trash2, Upload, Terminal, Activity, Save, X, Eye, Edit3, Bold, Italic, Code, List, Image as ImageIcon, Link as LinkIcon, Paperclip, Loader2, FileText, ArrowUp, ArrowDown, AlignLeft, Heading, Minus, Video, LayoutGrid, AlertCircle, Link, Table, CheckSquare, Strikethrough, Copy, Clipboard, ListOrdered, Quote } from 'lucide-react';
import { cn } from '../lib/utils';
import { Tutorial, TutorialBlock, BlockType, Firmware } from '../types';

interface SystemConfigProps {
  tutorials: Tutorial[];
  refreshTutorials: () => Promise<void>;
  loading: boolean;
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

export const SystemConfig: React.FC<SystemConfigProps> = ({ tutorials, refreshTutorials, loading }) => {
  const [activeTab, setActiveTab] = useState<'firmware' | 'tutorials'>('firmware');
  const [showAddForm, setShowAddForm] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string, name: string, type: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blockImageInputRef = useRef<HTMLInputElement>(null);
  const [activeBlockUpload, setActiveBlockUpload] = useState<{ id: string, index?: number } | null>(null);
  
  const [blocks, setBlocks] = useState<TutorialBlock[]>([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [newFirmware, setNewFirmware] = useState<Partial<Firmware>>({
    name: '',
    version: '',
    description: '',
    target: 'esp32'
  });
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [firmwareUploading, setFirmwareUploading] = useState(false);
  const firmwareFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFirmwares();
  }, []);

  const fetchFirmwares = async () => {
    try {
      const res = await fetch('/api/firmware');
      const data = await res.json();
      setFirmwares(data);
    } catch (err) {
      console.error('Failed to fetch firmwares:', err);
    }
  };

  const handleFirmwareUpload = async () => {
    if (!newFirmware.name || !newFirmware.version || !firmwareFile) return;
    
    setFirmwareUploading(true);
    const formData = new FormData();
    formData.append('file', firmwareFile);

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      const id = newFirmware.name.toLowerCase().replace(/\s+/g, '-') + '-' + newFirmware.version.replace(/\./g, '-');
      const firmwareRecord = {
        ...newFirmware,
        id,
        description: newFirmware.description || '',
        target: newFirmware.target || 'esp32',
        binaryUrl: uploadData.url,
        uploadedAt: new Date().toISOString().split('T')[0]
      };

      await fetch('/api/firmware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firmwareRecord)
      });

      setNewFirmware({ name: '', version: '', description: '', target: 'esp32' });
      setFirmwareFile(null);
      if (firmwareFileInputRef.current) firmwareFileInputRef.current.value = '';
      await fetchFirmwares();
    } catch (err) {
      console.error('Firmware upload failed:', err);
      alert('Failed to upload firmware: ' + String(err));
    } finally {
      setFirmwareUploading(false);
    }
  };

  const handleDeleteFirmware = async (id: string) => {
    try {
      await fetch(`/api/firmware/${id}`, { method: 'DELETE' });
      await fetchFirmwares();
    } catch (err) {
      console.error('Failed to delete firmware:', err);
    }
  };

  const [newTutorial, setNewTutorial] = useState<Partial<Tutorial>>({
    title: '',
    category: 'protocol',
    difficulty: 'beginner',
    description: '',
    content: '',
    firmwareId: ''
  });

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

  const addBlock = (type: BlockType) => {
    const newBlock: TutorialBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: getDefaultDataForType(type)
    };
    setBlocks([...blocks, newBlock]);
    setShowBlockMenu(false);
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

  const updateBlock = (id: string, data: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data } : b));
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

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleAddTutorial = async () => {
    if (!newTutorial.title || !newTutorial.description) return;
    
    const id = newTutorial.id || newTutorial.title.toLowerCase().replace(/\s+/g, '-');
    const contentToSave = JSON.stringify(blocks);

    try {
      const res = await fetch('/api/tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTutorial, id, content: contentToSave, attachments, firmwareId: newTutorial.firmwareId || null })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to add tutorial:', errorText);
        alert('Failed to save tutorial: ' + errorText);
        return;
      }

      setShowAddForm(false);
      setNewTutorial({ title: '', category: 'protocol', difficulty: 'beginner', description: '', content: '', firmwareId: '' });
      setBlocks([]);
      setAttachments([]);
      await refreshTutorials();
    } catch (err) {
      console.error('Failed to add tutorial:', err);
      alert('Failed to save tutorial: ' + String(err));
    }
  };

  const handleEditTutorial = (tutorial: Tutorial) => {
    setNewTutorial(tutorial);
    try {
      const parsedBlocks = JSON.parse(tutorial.content);
      if (Array.isArray(parsedBlocks)) {
        setBlocks(parsedBlocks);
      } else {
        setBlocks([{ id: 'legacy', type: 'markdown', data: { text: tutorial.content } }]);
      }
    } catch {
      setBlocks([{ id: 'legacy', type: 'markdown', data: { text: tutorial.content } }]);
    }
    try {
      const parsed = tutorial.attachments ? JSON.parse(tutorial.attachments) : [];
      setAttachments(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAttachments([]);
    }
    setShowAddForm(true);
  };

  const handleDeleteTutorial = async (id: string) => {
    try {
      await fetch(`/api/tutorials/${id}`, { method: 'DELETE' });
      await refreshTutorials();
    } catch (err) {
      console.error('Failed to delete tutorial:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setAttachments(prev => [...prev, data]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleBlockImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBlockUpload) return;

    setUploading(true);
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
      setUploading(false);
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
                <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('italic')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors" title="Italic"><Italic className="w-3 h-3" /></button>
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
                  disabled={uploading}
                  className="p-1 text-hw-blue/40 hover:text-hw-blue disabled:opacity-30"
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
                placeholder="Display Name (e.g., Download Schematic)..."
              />
            </div>
          )}
          {block.type === 'video_embed' && (
            <input
              type="text"
              value={block.data.url}
              onChange={(e) => updateBlock(block.id, { ...block.data, url: e.target.value })}
              className="w-full bg-transparent border-b border-hw-blue/20 outline-none text-[10px] text-hw-blue py-1"
              placeholder="Video Embed URL (e.g., YouTube)..."
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
                    disabled={uploading}
                    className="p-1 text-hw-blue/40 hover:text-hw-blue disabled:opacity-30"
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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-hw-blue/20 pb-4">
        <Settings className="w-6 h-6 text-hw-blue" />
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase hw-glow">System_Config</h2>
          <p className="text-[10px] text-hw-blue/40 uppercase tracking-[0.2em]">Accessing administrator control interface...</p>
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        {[
          { id: 'firmware', label: 'FIRMWARE_MGMT' },
          { id: 'tutorials', label: 'DOC_EDITOR' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "hw-button py-1 px-6",
              activeTab === tab.id ? "bg-hw-blue text-hw-black" : "bg-transparent text-hw-blue/60 border-transparent hover:border-hw-blue/30"
            )}
          >
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'firmware' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="hw-panel overflow-hidden">
              <div className="hw-panel-header">
                <span>ACTIVE_FIRMWARE_DATABASE</span>
              </div>
              <table className="w-full text-left text-[10px]">
                <thead className="bg-hw-blue/5 border-b border-hw-blue/20">
                  <tr>
                    <th className="px-6 py-3 font-bold uppercase tracking-widest text-hw-blue/40">Name</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-widest text-hw-blue/40">Version</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-widest text-hw-blue/40">Date</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-widest text-hw-blue/40 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hw-blue/10">
                  {firmwares.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-hw-blue/40 uppercase tracking-widest">
                        No firmware found in database.
                      </td>
                    </tr>
                  ) : (
                    firmwares.map((fw) => (
                      <tr key={fw.id} className="hover:bg-hw-blue/5 transition-colors group">
                        <td className="px-6 py-4 font-bold group-hover:hw-glow transition-all">{fw.name}</td>
                        <td className="px-6 py-4 text-hw-blue">{fw.version}</td>
                        <td className="px-6 py-4 text-hw-blue/40">{fw.uploadedAt}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteFirmware(fw.id)}
                            className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="hw-panel p-0 overflow-hidden">
              <div className="hw-panel-header">
                <span>UPLOAD_FIRMWARE</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Firmware Name</label>
                    <input 
                      type="text" 
                      value={newFirmware.name}
                      onChange={e => setNewFirmware({...newFirmware, name: e.target.value})}
                      className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue" 
                      placeholder="e.g. CUSTOM_OS" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Version</label>
                    <input 
                      type="text" 
                      value={newFirmware.version}
                      onChange={e => setNewFirmware({...newFirmware, version: e.target.value})}
                      className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue" 
                      placeholder="e.g. v1.0.0" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Description</label>
                  <input 
                    type="text" 
                    value={newFirmware.description}
                    onChange={e => setNewFirmware({...newFirmware, description: e.target.value})}
                    className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue" 
                    placeholder="Brief description..." 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Binary File (.bin)</label>
                  <div 
                    onClick={() => firmwareFileInputRef.current?.click()}
                    className="border-2 border-dashed border-hw-blue/10 rounded-sm p-8 text-center hover:border-hw-blue/30 transition-colors cursor-pointer group"
                  >
                    {firmwareFile ? (
                      <div className="text-hw-blue">
                        <FileUp className="w-8 h-8 text-hw-blue mx-auto mb-2" />
                        <span className="text-[10px] font-bold">{firmwareFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <FileUp className="w-8 h-8 text-hw-blue/20 mx-auto mb-2 group-hover:text-hw-blue/40 transition-colors" />
                        <span className="text-[9px] text-hw-blue/30 uppercase tracking-widest">Click or drag binary file</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept=".bin"
                    ref={firmwareFileInputRef}
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setFirmwareFile(e.target.files[0]);
                      }
                    }}
                    className="hidden" 
                  />
                </div>
                <button 
                  onClick={handleFirmwareUpload}
                  disabled={firmwareUploading || !newFirmware.name || !newFirmware.version || !firmwareFile}
                  className="w-full hw-button py-3 text-[10px] bg-hw-blue text-hw-black disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {firmwareUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {firmwareUploading ? 'UPLOADING...' : 'PUBLISH_FIRMWARE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {showAddForm ? (
              <div className="hw-panel p-0 overflow-hidden flex flex-col min-h-[600px]">
                <div className="hw-panel-header flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span>{newTutorial.id ? 'EDIT_DOCUMENT_ENTRY' : 'NEW_DOCUMENT_ENTRY'}</span>
                  </div>
                  <button onClick={() => { setShowAddForm(false); setBlocks([]); }} className="text-hw-blue/40 hover:text-hw-blue">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Title</label>
                      <input 
                        type="text" 
                        value={newTutorial.title}
                        onChange={e => setNewTutorial({...newTutorial, title: e.target.value})}
                        className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue" 
                        placeholder="e.g. SPI_PROTOCOL" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Category</label>
                      <select 
                        value={newTutorial.category}
                        onChange={e => setNewTutorial({...newTutorial, category: e.target.value as any})}
                        className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue appearance-none"
                      >
                        <option value="protocol">protocol</option>
                        <option value="component">component</option>
                        <option value="theory">theory</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Difficulty</label>
                      <select 
                        value={newTutorial.difficulty}
                        onChange={e => setNewTutorial({...newTutorial, difficulty: e.target.value as any})}
                        className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue appearance-none"
                      >
                        <option value="beginner">beginner</option>
                        <option value="intermediate">intermediate</option>
                        <option value="advanced">advanced</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Associated Firmware (Optional)</label>
                    <select 
                      value={newTutorial.firmwareId || ''}
                      onChange={e => setNewTutorial({...newTutorial, firmwareId: e.target.value})}
                      className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue appearance-none"
                    >
                      <option value="">-- No Firmware Associated --</option>
                      {firmwares.map(fw => (
                        <option key={fw.id} value={fw.id}>{fw.name} ({fw.version})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-hw-blue/40 uppercase mb-1">Description</label>
                    <input 
                      type="text" 
                      value={newTutorial.description}
                      onChange={e => setNewTutorial({...newTutorial, description: e.target.value})}
                      className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-[10px] focus:border-hw-blue outline-none text-hw-blue" 
                      placeholder="Brief overview..." 
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-hw-blue/20 pb-2">
                      <label className="block text-[9px] font-bold text-hw-blue/40 uppercase">Tutorial Blocks</label>
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
                              { type: 'file_download', icon: FileUp, label: 'FILE DOWNLOAD' },
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
                    </div>

                    <div className="space-y-2">
                      {blocks.length === 0 ? (
                        <div className="text-center py-8 text-hw-blue/20 text-[10px] uppercase border border-dashed border-hw-blue/20">
                          No blocks added. Click 'ADD BLOCK' to start.
                        </div>
                      ) : (
                        blocks.map((block, index) => renderBlockEditor(block, index))
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-hw-blue/20">
                    <div className="flex items-center justify-between">
                      <label className="block text-[9px] font-bold text-hw-blue/40 uppercase">Linked_Resources</label>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 text-[9px] font-bold text-hw-blue hover:hw-glow transition-all uppercase disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                        ATTACH_FILE
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {attachments.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-hw-blue/5 border border-hw-blue/10 rounded-sm group">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3 h-3 text-hw-blue/40 shrink-0" />
                            <span className="text-[9px] truncate text-hw-blue/60">{file.name}</span>
                          </div>
                          <button 
                            onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                            className="p-1 text-red-500/40 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleAddTutorial}
                    className="w-full hw-button py-3 text-[10px] bg-hw-blue text-hw-black flex items-center justify-center gap-2 mt-4"
                  >
                    <Save className="w-3 h-3" />
                    COMMIT_TO_DATABASE
                  </button>
                </div>
              </div>
            ) : (
              <div className="hw-panel p-0 overflow-hidden">
                <div className="hw-panel-header">
                  <span>ACTIVE_TUTORIALS</span>
                  <button 
                    onClick={() => {
                      setNewTutorial({ title: '', category: 'protocol', difficulty: 'beginner', description: '', content: '', firmwareId: '' });
                      setBlocks([]);
                      setAttachments([]);
                      setShowAddForm(true);
                    }}
                    className="flex items-center gap-2 bg-hw-blue/10 text-hw-blue border border-hw-blue/20 px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider hover:bg-hw-blue/20 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    NEW_DOC
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-hw-blue/20 animate-pulse uppercase text-[10px]">Syncing_Database...</div>
                  ) : tutorials.length === 0 ? (
                    <div className="text-center py-8 text-hw-blue/20 uppercase text-[10px]">No_Entries_Found</div>
                  ) : (
                    tutorials.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-4 bg-hw-blue/5 border border-hw-blue/20 rounded-sm hover:border-hw-blue transition-colors group">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs group-hover:hw-glow transition-all uppercase">{t.title}</span>
                          <span className="text-[8px] text-hw-blue/30 uppercase">{t.category} // {t.difficulty}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditTutorial(t)}
                            className="p-1.5 text-hw-blue/40 hover:text-hw-blue border border-transparent hover:border-hw-blue/30 transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTutorial(t.id)}
                            className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hw-panel p-0 overflow-hidden">
            <div className="hw-panel-header">
              <span>SYSTEM_STATS</span>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="hw-text-dim uppercase">Total Tutorials</span>
                  <span className="font-bold hw-glow">{tutorials.length}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="hw-text-dim uppercase">Total Views</span>
                  <span className="font-bold hw-glow">1,240</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="hw-text-dim uppercase">Avg. Completion</span>
                  <span className="font-bold hw-glow">84%</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-hw-blue/10">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-3 h-3 text-hw-blue" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-hw-blue">Access Logs</span>
                </div>
                <div className="space-y-2 font-mono text-[8px] text-hw-blue/30">
                  <div>[10:52] ADMIN_LOGIN_SUCCESS</div>
                  <div>[10:54] FIRMWARE_UPLOAD_INIT</div>
                  <div>[10:55] TUTORIAL_EDIT_SAVED</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <input 
        type="file" 
        ref={blockImageInputRef} 
        onChange={handleBlockImageUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};
