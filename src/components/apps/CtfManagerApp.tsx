import React, { useState, useEffect } from 'react';
import { Flag, Plus, Edit2, Trash2, Play, ChevronRight, ChevronDown, Save, X } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { useCtf } from '../../contexts/CtfContext';
import { CtfChallenge, SerialTrigger, CtfFlag } from '../../types/ctf';
import { cn } from '../../lib/utils';
import { Tutorial, TutorialBlock } from '../../types';
import Markdown from 'react-markdown';
import { BlockRenderer } from '../shared/BlockRenderer';

const CollapsibleSection: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-hw-blue/20 rounded-lg overflow-hidden mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex justify-between items-center bg-hw-blue/5 hover:bg-hw-blue/10 transition-colors"
      >
        <span className="font-bold text-xs uppercase tracking-widest">{title}</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="p-4 border-t border-hw-blue/20 bg-black/40">
          {children}
        </div>
      )}
    </div>
  );
};

export const CtfManagerApp: React.FC<{ 
  onLaunchChallenge?: (challengeId: string) => void;
  onStartApp?: (appId: string, props?: any) => void;
}> = ({ onLaunchChallenge, onStartApp }) => {
  const { challenges, addChallenge, updateChallenge, deleteChallenge } = useCtf();
  const { items: inventoryItems } = useInventory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CtfChallenge>>({});
  const [availableTutorials, setAvailableTutorials] = useState<Tutorial[]>([]);
  const [availableNotes, setAvailableNotes] = useState<any[]>([]);

  const renderDescription = (description: string) => {
    try {
      const parsed = JSON.parse(description);
      if (Array.isArray(parsed)) {
        return <BlockRenderer blocks={parsed as TutorialBlock[]} />;
      }
    } catch (e) {
      // Fallback to markdown block
    }
    return <BlockRenderer blocks={[{ id: 'legacy', type: 'markdown', data: { text: description } }]} />;
  };

  useEffect(() => {
    // Fetch tutorials from API
    fetch('/api/tutorials')
      .then(res => res.json())
      .then(data => setAvailableTutorials(data))
      .catch(err => console.error("Failed to fetch tutorials", err));

    const savedNotes = localStorage.getItem('hw_os_notes');
    if (savedNotes) {
      try { setAvailableNotes(JSON.parse(savedNotes)); } catch (e) {}
    }
  }, []);

  const handleCreate = () => {
    const newChallenge: CtfChallenge = {
      id: `ctf-${Date.now()}`,
      title: 'New Challenge',
      description: 'Describe the challenge here...',
      difficulty: 'easy',
      points: 100,
      category: 'hardware',
      tutorials: [],
      notes: [],
      flags: [],
      serialTriggers: [],
      customCode: '<h1>Custom Challenge UI</h1>\n<p>Write your HTML/JS here.</p>',
      inventoryItems: [],
      status: 'locked'
    };
    addChallenge(newChallenge);
    setEditingId(newChallenge.id);
    setEditForm(newChallenge);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateChallenge(editingId, editForm);
      setIsEditing(false);
    }
  };

  const handleAddTrigger = () => {
    const newTrigger: SerialTrigger = {
      id: `trigger-${Date.now()}`,
      matchRegex: '',
      action: 'complete'
    };
    setEditForm(prev => ({
      ...prev,
      serialTriggers: [...(prev.serialTriggers || []), newTrigger]
    }));
  };

  const handleUpdateTrigger = (index: number, updates: Partial<SerialTrigger>) => {
    setEditForm(prev => {
      const triggers = [...(prev.serialTriggers || [])];
      triggers[index] = { ...triggers[index], ...updates };
      return { ...prev, serialTriggers: triggers };
    });
  };

  const handleRemoveTrigger = (index: number) => {
    setEditForm(prev => {
      const triggers = [...(prev.serialTriggers || [])];
      triggers.splice(index, 1);
      return { ...prev, serialTriggers: triggers };
    });
  };

  const handleToggleTutorial = (tutId: string) => {
    setEditForm(prev => {
      const current = prev.tutorials || [];
      if (current.includes(tutId)) {
        return { ...prev, tutorials: current.filter(id => id !== tutId) };
      } else {
        return { ...prev, tutorials: [...current, tutId] };
      }
    });
  };

  const handleToggleNote = (noteId: string) => {
    setEditForm(prev => {
      const current = prev.notes || [];
      if (current.includes(noteId)) {
        return { ...prev, notes: current.filter(id => id !== noteId) };
      } else {
        return { ...prev, notes: [...current, noteId] };
      }
    });
  };

  const handleToggleInventoryItem = (itemId: string) => {
    setEditForm(prev => {
      const current = prev.inventoryItems || [];
      if (current.includes(itemId)) {
        return { ...prev, inventoryItems: current.filter(id => id !== itemId) };
      } else {
        return { ...prev, inventoryItems: [...current, itemId] };
      }
    });
  };

  const handleAddFlag = () => {
    const newFlag: CtfFlag = {
      id: `flag-${Date.now()}`,
      title: 'New Flag',
      value: 'FLAG{...}',
      points: 50
    };
    setEditForm(prev => ({
      ...prev,
      flags: [...(prev.flags || []), newFlag]
    }));
  };

  const handleUpdateFlag = (index: number, updates: Partial<CtfFlag>) => {
    setEditForm(prev => {
      const flags = [...(prev.flags || [])];
      flags[index] = { ...flags[index], ...updates };
      return { ...prev, flags };
    });
  };

  const handleRemoveFlag = (index: number) => {
    setEditForm(prev => {
      const flags = [...(prev.flags || [])];
      flags.splice(index, 1);
      return { ...prev, flags };
    });
  };

  const activeChallenge = challenges.find(c => c.id === editingId);

  return (
    <div className="flex h-full bg-black/80 font-mono text-hw-blue">
      {/* Sidebar - Challenge List */}
      <div className="w-1/3 border-r border-hw-blue/20 flex flex-col bg-black/40">
        <div className="p-4 border-b border-hw-blue/20 flex justify-between items-center bg-hw-blue/5">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4" />
            <span className="font-bold tracking-widest uppercase text-xs">CTF Manager</span>
          </div>
          <button 
            onClick={handleCreate}
            className="p-1.5 hover:bg-hw-blue/20 rounded transition-colors"
            title="Create Challenge"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {challenges.length === 0 ? (
            <div className="text-center p-8 opacity-40 text-xs italic">
              No challenges created yet.
            </div>
          ) : (
            challenges.map(c => (
              <div 
                key={c.id} 
                className={cn(
                  "p-3 rounded border transition-all cursor-pointer group",
                  editingId === c.id ? "bg-hw-blue/20 border-hw-blue" : "bg-hw-blue/5 border-hw-blue/10 hover:bg-hw-blue/10 hover:border-hw-blue/30"
                )}
                onClick={() => {
                  setEditingId(c.id);
                  setEditForm(c);
                  setIsEditing(false);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-xs truncate pr-2">{c.title}</span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded uppercase font-bold",
                    c.difficulty === 'easy' ? "bg-green-500/20 text-green-400" :
                    c.difficulty === 'medium' ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
                  )}>
                    {c.points} pts
                  </span>
                </div>
                <div className="text-[10px] opacity-60 flex justify-between items-center">
                  <span>{c.category}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onLaunchChallenge && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onLaunchChallenge(c.id); }}
                        className="p-1 hover:bg-hw-blue/20 rounded text-hw-blue"
                        title="Launch Challenge"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteChallenge(c.id); if(editingId===c.id) setEditingId(null); }}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area - Editor / Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {editingId && activeChallenge ? (
          isEditing ? (
            <>
              <div className="p-4 border-b border-hw-blue/20 flex justify-between items-center bg-hw-blue/5">
                <span className="font-bold tracking-widest uppercase text-xs">Edit Challenge</span>
                <div className="flex gap-2">
                  <button onClick={() => { setIsEditing(false); setEditForm(activeChallenge); }} className="px-3 py-1.5 text-[10px] uppercase font-bold hover:bg-white/10 rounded transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} className="px-3 py-1.5 text-[10px] uppercase font-bold bg-hw-blue/20 hover:bg-hw-blue/30 text-hw-blue rounded transition-colors flex items-center gap-2">
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Title</label>
                  <input 
                    type="text" 
                    value={editForm.title || ''} 
                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                    className="w-full bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Category</label>
                  <input 
                    type="text" 
                    value={editForm.category || ''} 
                    onChange={e => setEditForm({...editForm, category: e.target.value})}
                    className="w-full bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Difficulty</label>
                  <select 
                    value={editForm.difficulty || 'easy'} 
                    onChange={e => setEditForm({...editForm, difficulty: e.target.value as any})}
                    className="w-full bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Points</label>
                  <input 
                    type="number" 
                    value={editForm.points || 0} 
                    onChange={e => setEditForm({...editForm, points: parseInt(e.target.value)})}
                    className="w-full bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Description (Markdown)</label>
                <textarea 
                  value={editForm.description || ''} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="w-full h-32 bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue custom-scrollbar resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Custom UI Code (HTML/JS)</label>
                <textarea 
                  value={editForm.customCode || ''} 
                  onChange={e => setEditForm({...editForm, customCode: e.target.value})}
                  className="w-full h-48 bg-black/40 border border-hw-blue/20 rounded p-2 text-xs font-mono outline-none focus:border-hw-blue custom-scrollbar resize-none"
                  placeholder="<html>...</html>"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-hw-blue/10 pb-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Flags</label>
                  <button onClick={handleAddFlag} className="text-[10px] uppercase font-bold flex items-center gap-1 hover:text-white transition-colors">
                    <Plus className="w-3 h-3" /> Add Flag
                  </button>
                </div>
                
                {editForm.flags?.length === 0 && (
                  <div className="text-center p-4 opacity-30 text-[10px] italic border border-dashed border-hw-blue/20 rounded">
                    No flags defined.
                  </div>
                )}
                
                {editForm.flags?.map((flag, idx) => (
                  <div key={flag.id} className="bg-hw-blue/5 border border-hw-blue/20 rounded p-3 space-y-3 relative group">
                    <button 
                      onClick={() => handleRemoveFlag(idx)}
                      className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 rounded transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="grid grid-cols-3 gap-4 pr-6">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Flag Title</label>
                        <input 
                          type="text" 
                          value={flag.title} 
                          onChange={e => handleUpdateFlag(idx, { title: e.target.value })}
                          className="w-full bg-black/40 border border-hw-blue/20 rounded p-1.5 text-xs outline-none focus:border-hw-blue"
                          placeholder="e.g. User Flag"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Flag Value</label>
                        <input 
                          type="text" 
                          value={flag.value} 
                          onChange={e => handleUpdateFlag(idx, { value: e.target.value })}
                          className="w-full bg-black/40 border border-hw-blue/20 rounded p-1.5 text-xs outline-none focus:border-hw-blue"
                          placeholder="FLAG{...}"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Points</label>
                        <input 
                          type="number" 
                          value={flag.points} 
                          onChange={e => handleUpdateFlag(idx, { points: parseInt(e.target.value) })}
                          className="w-full bg-black/40 border border-hw-blue/20 rounded p-1.5 text-xs outline-none focus:border-hw-blue"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-hw-blue/10 pb-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Required Inventory Items</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {inventoryItems.length === 0 ? (
                    <div className="col-span-2 text-xs opacity-50 italic">No inventory items available. Create some in the Inventory App.</div>
                  ) : (
                    inventoryItems.map(item => (
                      <label key={item.id} className="flex items-center gap-2 p-2 border border-hw-blue/20 rounded hover:bg-hw-blue/5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={(editForm.inventoryItems || []).includes(item.id)}
                          onChange={() => handleToggleInventoryItem(item.id)}
                          className="accent-hw-blue"
                        />
                        <span className="text-xs">{item.name} <span className="opacity-50 text-[9px]">({item.category})</span></span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-hw-blue/10 pb-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Knowledge Base / Tutorials</label>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {availableTutorials.length === 0 ? (
                    <div className="col-span-2 text-xs opacity-50 italic">No tutorials available in Knowledge Base.</div>
                  ) : (
                    availableTutorials.map(tut => (
                      <label key={tut.id} className="flex items-center gap-2 p-2 border border-hw-blue/20 rounded hover:bg-hw-blue/5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={(editForm.tutorials || []).includes(tut.id)}
                          onChange={() => handleToggleTutorial(tut.id)}
                          className="accent-hw-blue"
                        />
                        <span className="text-xs truncate">{tut.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-hw-blue/10 pb-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Data Slabs / Notes</label>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {availableNotes.length === 0 ? (
                    <div className="col-span-2 text-xs opacity-50 italic">No notes available in Data Slabs.</div>
                  ) : (
                    availableNotes.map(note => (
                      <label key={note.id} className="flex items-center gap-2 p-2 border border-hw-blue/20 rounded hover:bg-hw-blue/5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={(editForm.notes || []).includes(note.id)}
                          onChange={() => handleToggleNote(note.id)}
                          className="accent-hw-blue"
                        />
                        <span className="text-xs truncate">{note.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-hw-blue/10 pb-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Serial Triggers</label>
                  <button onClick={handleAddTrigger} className="text-[10px] uppercase font-bold flex items-center gap-1 hover:text-white transition-colors">
                    <Plus className="w-3 h-3" /> Add Trigger
                  </button>
                </div>
                
                {editForm.serialTriggers?.length === 0 && (
                  <div className="text-center p-4 opacity-30 text-[10px] italic border border-dashed border-hw-blue/20 rounded">
                    No serial triggers defined.
                  </div>
                )}
                
                {editForm.serialTriggers?.map((trigger, idx) => (
                  <div key={trigger.id} className="bg-hw-blue/5 border border-hw-blue/20 rounded p-3 space-y-3 relative group">
                    <button 
                      onClick={() => handleRemoveTrigger(idx)}
                      className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 rounded transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="grid grid-cols-2 gap-4 pr-6">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Match Regex (Serial RX)</label>
                        <input 
                          type="text" 
                          value={trigger.matchRegex} 
                          onChange={e => handleUpdateTrigger(idx, { matchRegex: e.target.value })}
                          className="w-full bg-black/40 border border-hw-blue/20 rounded p-1.5 text-xs outline-none focus:border-hw-blue"
                          placeholder="e.g. FLAG\{.*\}"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Action</label>
                        <select 
                          value={trigger.action} 
                          onChange={e => handleUpdateTrigger(idx, { action: e.target.value as any })}
                          className="w-full bg-black/40 border border-hw-blue/20 rounded p-1.5 text-xs outline-none focus:border-hw-blue"
                        >
                          <option value="complete">Complete Challenge</option>
                          <option value="unlock_hint">Unlock Hint</option>
                          <option value="send_serial">Send Serial Command</option>
                        </select>
                      </div>
                    </div>
                    {trigger.action === 'send_serial' && (
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Payload to Send</label>
                        <input 
                          type="text" 
                          value={trigger.payload || ''} 
                          onChange={e => handleUpdateTrigger(idx, { payload: e.target.value })}
                          className="w-full bg-black/40 border border-hw-blue/20 rounded p-1.5 text-xs outline-none focus:border-hw-blue"
                          placeholder="Command to send over serial..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-hw-blue/20 flex justify-between items-center bg-hw-blue/5">
                <span className="font-bold tracking-widest uppercase text-xs">Challenge Briefing</span>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-[10px] uppercase font-bold bg-hw-blue/10 hover:bg-hw-blue/20 text-hw-blue rounded transition-colors flex items-center gap-2">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  {onLaunchChallenge && (
                    <button onClick={() => onLaunchChallenge(activeChallenge.id)} className="px-3 py-1.5 text-[10px] uppercase font-bold bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors flex items-center gap-2">
                      <Play className="w-3 h-3" /> Launch
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-3xl mx-auto space-y-8">
                  
                  <div className="border-b border-hw-blue/20 pb-6">
                    <h1 className="text-3xl font-bold tracking-widest uppercase mb-4 text-white">{activeChallenge.title}</h1>
                    <div className="flex flex-wrap gap-4 text-xs uppercase tracking-widest font-bold">
                      <span className="px-2 py-1 bg-hw-blue/10 rounded border border-hw-blue/20 text-hw-blue">CAT: {activeChallenge.category}</span>
                      <span className={cn(
                        "px-2 py-1 rounded border",
                        activeChallenge.difficulty === 'easy' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                        activeChallenge.difficulty === 'medium' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                        "bg-red-500/10 border-red-500/20 text-red-400"
                      )}>DIF: {activeChallenge.difficulty}</span>
                      <span className="px-2 py-1 bg-purple-500/10 rounded border border-purple-500/20 text-purple-400">PTS: {activeChallenge.points}</span>
                    </div>
                  </div>

                  <div className="prose prose-invert prose-hw max-w-none">
                    {renderDescription(activeChallenge.description)}
                  </div>

                  {activeChallenge.flags && activeChallenge.flags.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 border-b border-hw-blue/20 pb-2">Objectives (Flags)</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {activeChallenge.flags.map(flag => (
                          <div key={flag.id} className="flex justify-between items-center p-3 bg-hw-blue/5 border border-hw-blue/20 rounded">
                            <span className="font-bold text-xs uppercase tracking-widest">{flag.title}</span>
                            <span className="text-[10px] opacity-50">{flag.points} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeChallenge.inventoryItems && activeChallenge.inventoryItems.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 border-b border-hw-blue/20 pb-2">Required Inventory</h3>
                      <div className="flex flex-wrap gap-4">
                        {activeChallenge.inventoryItems.map(itemId => {
                          const item = inventoryItems.find(inv => inv.id === itemId);
                          if (!item) return null;
                          return (
                            <div key={itemId} className="flex items-center gap-3 p-3 bg-hw-blue/5 border border-hw-blue/20 rounded-lg">
                              <div className="w-10 h-10 bg-black/40 rounded overflow-hidden flex items-center justify-center shrink-0">
                                {item.images && item.images.length > 0 ? (
                                  <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-hw-blue/10 flex items-center justify-center text-[8px] opacity-50">NO IMG</div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold">{item.name}</div>
                                <div className="text-[9px] opacity-50 uppercase tracking-widest">{item.category}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(activeChallenge.tutorials?.length > 0 || activeChallenge.notes?.length > 0) && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 border-b border-hw-blue/20 pb-2">Attached Intelligence</h3>
                      
                      {activeChallenge.tutorials?.map(tutId => {
                        const tut = availableTutorials.find(t => t.id === tutId);
                        if (!tut) return null;
                        return (
                          <CollapsibleSection key={tut.id} title={`Knowledge Base: ${tut.title}`}>
                            <div className="flex justify-end mb-2">
                              <button 
                                onClick={() => onStartApp && onStartApp('tutorials', { initialTutorialId: tut.id })}
                                className="px-3 py-1 bg-hw-blue/20 hover:bg-hw-blue/30 text-hw-blue rounded text-[10px] uppercase tracking-widest font-bold transition-colors"
                              >
                                Open in Knowledge Base
                              </button>
                            </div>
                            <div className="prose prose-invert prose-hw max-w-none text-xs">
                              {renderDescription(tut.content)}
                            </div>
                          </CollapsibleSection>
                        );
                      })}

                      {activeChallenge.notes?.map(noteId => {
                        const note = availableNotes.find(n => n.id === noteId);
                        if (!note) return null;
                        return (
                          <CollapsibleSection key={note.id} title={`Data Slab: ${note.title}`}>
                            <div className="flex justify-end mb-2">
                              <button 
                                onClick={() => onStartApp && onStartApp('notes', { initialNoteId: note.id })}
                                className="px-3 py-1 bg-hw-blue/20 hover:bg-hw-blue/30 text-hw-blue rounded text-[10px] uppercase tracking-widest font-bold transition-colors"
                              >
                                Open in Data Slabs
                              </button>
                            </div>
                            <div 
                              className="prose prose-invert prose-hw max-w-none text-xs"
                              dangerouslySetInnerHTML={{ __html: note.content }}
                            />
                          </CollapsibleSection>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-hw-blue/20 space-y-4">
            <Flag className="w-16 h-16 opacity-10" />
            <p className="text-sm tracking-widest uppercase">Select a challenge to edit or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};
