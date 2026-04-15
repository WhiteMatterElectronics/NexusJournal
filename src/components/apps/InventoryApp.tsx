import React, { useState, useRef } from 'react';
import { Package, Plus, Edit2, Trash2, Upload, Download, Image as ImageIcon, X } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { InventoryItem } from '../../types/inventory';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const InventoryApp: React.FC = () => {
  const { items, addItem, updateItem, deleteItem, importItems } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [filterCategory, setFilterCategory] = useState<'all' | 'tool' | 'challenge'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: 'New Item',
      description: '',
      images: [],
      stock: 1,
      category: 'tool',
      type: 'hardware'
    };
    addItem(newItem);
    setEditingId(newItem.id);
    setEditForm(newItem);
  };

  const handleSave = () => {
    if (editingId) {
      updateItem(editingId, editForm);
      setEditingId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    Promise.all(files.map(f => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(f);
      });
    })).then(base64Images => {
      setEditForm(prev => ({
        ...prev,
        images: [...(prev.images || []), ...base64Images]
      }));
    });
  };

  const handleRemoveImage = (index: number) => {
    setEditForm(prev => {
      const newImages = [...(prev.images || [])];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "hw_inventory.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          importItems(imported);
        }
      } catch (err) {
        console.error("Failed to parse imported inventory", err);
      }
    };
    reader.readAsText(file);
  };

  const filteredItems = items.filter(i => filterCategory === 'all' || i.category === filterCategory);

  return (
    <div className="flex h-full bg-black/80 font-mono text-hw-blue">
      {/* Sidebar - Item List */}
      <div className="w-1/3 border-r border-hw-blue/20 flex flex-col bg-black/40">
        <div className="p-4 border-b border-hw-blue/20 flex justify-between items-center bg-hw-blue/5">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="font-bold tracking-widest uppercase text-xs">Inventory</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => importInputRef.current?.click()} className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors" title="Import">
              <Upload className="w-3 h-3" />
            </button>
            <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" />
            
            <button onClick={handleExport} className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors" title="Export">
              <Download className="w-3 h-3" />
            </button>
            <button onClick={handleCreate} className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors" title="Add Item">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex border-b border-hw-blue/20 text-[9px] uppercase tracking-widest font-bold">
          <button 
            onClick={() => setFilterCategory('all')}
            className={cn("flex-1 py-2 transition-colors", filterCategory === 'all' ? "bg-hw-blue/20 text-hw-blue" : "opacity-50 hover:bg-hw-blue/10")}
          >
            All
          </button>
          <button 
            onClick={() => setFilterCategory('tool')}
            className={cn("flex-1 py-2 transition-colors border-l border-hw-blue/20", filterCategory === 'tool' ? "bg-hw-blue/20 text-hw-blue" : "opacity-50 hover:bg-hw-blue/10")}
          >
            Tools
          </button>
          <button 
            onClick={() => setFilterCategory('challenge')}
            className={cn("flex-1 py-2 transition-colors border-l border-hw-blue/20", filterCategory === 'challenge' ? "bg-hw-blue/20 text-hw-blue" : "opacity-50 hover:bg-hw-blue/10")}
          >
            Challenges
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          <AnimatePresence>
            {filteredItems.length === 0 ? (
              <div className="text-center p-8 opacity-40 text-xs italic">
                No items found.
              </div>
            ) : (
              filteredItems.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={item.id} 
                  className={cn(
                    "p-3 rounded border transition-all cursor-pointer group flex gap-3",
                    editingId === item.id ? "bg-hw-blue/20 border-hw-blue" : "bg-hw-blue/5 border-hw-blue/10 hover:bg-hw-blue/10 hover:border-hw-blue/30"
                  )}
                  onClick={() => {
                    setEditingId(item.id);
                    setEditForm(item);
                  }}
                >
                  <div className="w-12 h-12 shrink-0 bg-black/40 border border-hw-blue/20 rounded flex items-center justify-center overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 opacity-30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-xs truncate pr-2">{item.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-hw-blue/10 border border-hw-blue/20">
                        x{item.stock}
                      </span>
                    </div>
                    <div className="text-[9px] opacity-60 flex justify-between items-center uppercase tracking-widest">
                      <span>{item.type}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteItem(item.id); if(editingId===item.id) setEditingId(null); }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-red-400 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Area - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {editingId ? (
          <>
            <div className="p-4 border-b border-hw-blue/20 flex justify-between items-center bg-hw-blue/5">
              <span className="font-bold tracking-widest uppercase text-xs">Edit Item</span>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[10px] uppercase font-bold hover:bg-white/10 rounded transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} className="px-3 py-1.5 text-[10px] uppercase font-bold bg-hw-blue/20 hover:bg-hw-blue/30 text-hw-blue rounded transition-colors">
                  Save
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Name</label>
                  <input 
                    type="text" 
                    value={editForm.name || ''} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Category</label>
                  <select 
                    value={editForm.category || 'tool'} 
                    onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                    className="w-full bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                  >
                    <option value="tool">Tool</option>
                    <option value="challenge">Challenge Component</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Type</label>
                  <select 
                    value={editForm.type || 'hardware'} 
                    onChange={e => setEditForm({...editForm, type: e.target.value as any})}
                    className="w-full bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                  >
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stock Quantity</label>
                  <input 
                    type="number" 
                    value={editForm.stock || 0} 
                    onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value)})}
                    className="w-full bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Description</label>
                <textarea 
                  value={editForm.description || ''} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="w-full h-32 bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue custom-scrollbar resize-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-hw-blue/10 pb-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Images</label>
                  <button onClick={() => fileInputRef.current?.click()} className="text-[10px] uppercase font-bold flex items-center gap-1 hover:text-white transition-colors">
                    <Plus className="w-3 h-3" /> Add Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  {editForm.images?.map((img, idx) => (
                    <div key={idx} className="relative aspect-square bg-black/40 border border-hw-blue/20 rounded overflow-hidden group">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(!editForm.images || editForm.images.length === 0) && (
                    <div className="col-span-4 text-center p-8 border border-dashed border-hw-blue/20 rounded opacity-30 text-xs italic">
                      No images uploaded.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-hw-blue/20 space-y-4">
            <Package className="w-16 h-16 opacity-10" />
            <p className="text-sm tracking-widest uppercase">Select an item to edit or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};
