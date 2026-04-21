import React, { useState, useEffect, useRef } from 'react';
import { Info, Edit3, Save, X, Plus, Trash2, ArrowUp, ArrowDown, Copy, Bold, Italic, Link, List, ListOrdered, Quote, Minus, Code, Image as ImageIcon, Video, LayoutGrid, AlertCircle, Paperclip, Loader2, FileText, Upload, AlignLeft, Heading } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppInfo, TutorialBlock, BlockType } from '../../types';
import { BlockRenderer } from '../shared/BlockRenderer';

interface InfoCardProps {
  appId: string;
  onClose: () => void;
}

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

export const InfoCard: React.FC<InfoCardProps> = ({ appId, onClose }) => {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [blocks, setBlocks] = useState<TutorialBlock[]>([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const blockImageInputRef = useRef<HTMLInputElement>(null);
  const [activeBlockUpload, setActiveBlockUpload] = useState<{ id: string, index?: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchInfo();
  }, [appId]);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/app-info/${appId}`);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        try {
          const parsed = JSON.parse(data.content);
          setBlocks(Array.isArray(parsed) ? parsed : []);
        } catch {
          setBlocks([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch app info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!info) return;
    setSaving(true);
    try {
      const res = await fetch('/api/app-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...info,
          content: JSON.stringify(blocks)
        })
      });
      if (res.ok) {
        setIsEditing(false);
        await fetchInfo();
      }
    } catch (err) {
      console.error('Failed to save app info:', err);
    } finally {
      setSaving(false);
    }
  };

  const getDefaultDataForType = (type: BlockType) => {
    switch (type) {
      case 'markdown': return { text: '' };
      case 'code': return { language: 'cpp', code: '' };
      case 'image': return { url: '', caption: '', width: 100 };
      case 'sub_heading': return { text: '' };
      case 'divider': return {};
      case 'note': return { type: 'info', text: '' };
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

  const updateBlock = (id: string, data: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
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

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const active = document.activeElement;
    if (active && active.hasAttribute('contenteditable')) {
      const event = new Event('input', { bubbles: true });
      active.dispatchEvent(event);
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

  if (loading) {
    return (
      <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="animate-pulse text-hw-blue text-[10px] uppercase tracking-[0.3em]">Loading_App_Manual...</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md">
      <div className={cn(
        "relative w-full max-w-2xl max-h-full flex flex-col border shadow-2xl overflow-hidden",
        "bg-hw-black/90 border-hw-blue/30 rounded-sm"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-hw-blue/10 border-b border-hw-blue/20">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-hw-blue" />
            <div>
              <h2 className="text-sm font-black tracking-widest uppercase text-hw-blue">{info?.title || appId} // MANUAL</h2>
              <p className="text-[8px] text-hw-blue/40 uppercase tracking-widest">{info?.description || 'App Information'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-hw-blue/60 hover:text-hw-blue transition-colors"
                title="Edit Manual"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 text-green-500/60 hover:text-green-500 transition-colors disabled:opacity-50"
                title="Save Changes"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 text-hw-blue/40 hover:text-hw-blue transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
          {isEditing ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-hw-blue/20 pb-2">
                <label className="text-[9px] font-bold text-hw-blue/40 uppercase">Content Blocks</label>
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
                        { type: 'sub_heading', icon: Heading, label: 'SUB-HEADING' },
                        { type: 'divider', icon: Minus, label: 'DIVIDER' },
                        { type: 'note', icon: AlertCircle, label: 'NOTE / TIP' },
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

              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div key={block.id} className="border border-hw-blue/20 bg-hw-blue/5 rounded-sm overflow-hidden group">
                    <div className="flex items-center justify-between px-3 py-2 bg-hw-blue/10 border-b border-hw-blue/20">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue">{block.type.replace('_', ' ')}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1 text-hw-blue/40 hover:text-hw-blue disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                        <button onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-1 text-hw-blue/40 hover:text-hw-blue disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                        <button onClick={() => deleteBlock(block.id)} className="p-1 text-red-500/60 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="p-3">
                      {block.type === 'markdown' && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-1 border-b border-hw-blue/10 pb-2 mb-2">
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('bold')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors"><Bold className="w-3 h-3" /></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('italic')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors"><Italic className="w-3 h-3" /></button>
                            <button onMouseDown={e => e.preventDefault()} onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-hw-blue/10 rounded text-hw-blue/60 hover:text-hw-blue transition-colors"><List className="w-3 h-3" /></button>
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
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                      {block.type === 'sub_heading' && (
                        <input
                          type="text"
                          value={block.data.text}
                          onChange={(e) => updateBlock(block.id, { ...block.data, text: e.target.value })}
                          className="w-full bg-transparent border-none outline-none text-[14px] font-bold text-hw-blue py-1"
                        />
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
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleSave}
                className="w-full hw-button py-3 text-[10px] bg-hw-blue text-hw-black flex items-center justify-center gap-2 mt-4"
              >
                <Save className="w-3 h-3" />
                SAVE_TO_DATABASE
              </button>
            </div>
          ) : (
            <BlockRenderer blocks={blocks} />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-hw-blue/5 border-t border-hw-blue/10 flex justify-between items-center shrink-0">
          <span className="text-[8px] text-hw-blue/30 uppercase tracking-[0.2em]">Manual_Version: 2026.04 // NexusJournal_OS</span>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[9px] font-bold text-hw-blue/40 hover:text-hw-blue uppercase tracking-widest flex items-center gap-2"
            >
              <Edit3 className="w-3 h-3" /> EDIT_MANUAL
            </button>
          )}
        </div>
      </div>

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
