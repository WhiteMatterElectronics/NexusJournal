import React, { useState, useEffect, useRef } from 'react';
import { Flag, Terminal, CheckCircle, Lock, Play, Code, ChevronRight, ChevronDown, Send } from 'lucide-react';
import { useCtf } from '../../contexts/CtfContext';
import { useSerial } from '../../contexts/SerialContext';
import { useInventory } from '../../contexts/InventoryContext';
import { cn } from '../../lib/utils';
import Markdown from 'react-markdown';
import { BlockRenderer } from '../shared/BlockRenderer';
import { TutorialBlock } from '../../types';

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

export const CtfChallengeApp: React.FC<{ 
  challengeId: string;
  onStartApp?: (appId: string, props?: any) => void;
}> = ({ challengeId, onStartApp }) => {
  const { challenges, updateChallenge } = useCtf();
  const { connected, writeToSerial, logs } = useSerial();
  const { items: inventoryItems } = useInventory();
  
  const challenge = challenges.find(c => c.id === challengeId);
  
  const [activeTab, setActiveTab] = useState<'briefing' | 'terminal' | 'custom_ui'>('briefing');
  const [terminalInput, setTerminalInput] = useState('');
  const [availableTutorials, setAvailableTutorials] = useState<any[]>([]);
  const [availableNotes, setAvailableNotes] = useState<any[]>([]);
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>(challenge?.flagJournal || {});
  
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
  
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Fetch tutorials from API
    fetch('/api/tutorials')
      .then(res => res.json())
      .then(data => setAvailableTutorials(data))
      .catch(err => console.error("Failed to fetch tutorials", err));

    // Fetch notes from localStorage
    const savedNotes = localStorage.getItem('hw_os_notes');
    if (savedNotes) {
      try { setAvailableNotes(JSON.parse(savedNotes)); } catch (e) {}
    }
  }, []);

  const handleSubmitFlag = (flagId: string) => {
    if (!challenge) return;
    const inputVal = flagInputs[flagId] || '';
    
    // Journal the flag value locally
    const currentJournal = challenge.flagJournal || {};
    const newJournal = { ...currentJournal, [flagId]: inputVal };
    
    const currentSolved = challenge.solvedFlags || [];
    const newSolved = currentSolved.includes(flagId) ? currentSolved : [...currentSolved, flagId];
    
    const updates: any = { 
      flagJournal: newJournal,
      solvedFlags: newSolved 
    };
    
    // Check if all flags are solved
    if (challenge.flags && newSolved.length === challenge.flags.length) {
      updates.status = 'solved';
    }
    
    updateChallenge(challenge.id, updates);
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Iframe Communication
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'COMPLETE_CHALLENGE') {
        updateChallenge(challengeId, { status: 'solved' });
      } else if (e.data.type === 'SEND_SERIAL') {
        writeToSerial(e.data.data + '\n');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [challengeId, updateChallenge, writeToSerial]);

  // Send serial data to iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const lastLog = logs[logs.length - 1];
      if (lastLog) {
        iframeRef.current.contentWindow.postMessage({ type: 'SERIAL_DATA', data: lastLog.text }, '*');
      }
    }
  }, [logs]);

  // Serial Trigger Logic
  useEffect(() => {
    if (!challenge || challenge.status === 'solved') return;

    const lastLog = logs[logs.length - 1];
    if (!lastLog) return;

    challenge.serialTriggers.forEach(trigger => {
      try {
        const regex = new RegExp(trigger.matchRegex);
        if (regex.test(lastLog.text)) {
          console.log(`Trigger matched: ${trigger.matchRegex}`);
          if (trigger.action === 'complete') {
            updateChallenge(challenge.id, { status: 'solved' });
          } else if (trigger.action === 'send_serial' && trigger.payload) {
            writeToSerial(trigger.payload + '\n');
          } else if (trigger.action === 'unlock_hint') {
            // Hint unlocking logic can be handled by custom UI now
          }
        }
      } catch (e) {
        console.error("Invalid regex in trigger", e);
      }
    });
  }, [logs, challenge, updateChallenge, writeToSerial]);

  if (!challenge) {
    return (
      <div className="h-full flex items-center justify-center bg-black/80 text-hw-blue font-mono">
        Challenge not found.
      </div>
    );
  }

  const handleSendTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput.trim() && connected) {
      writeToSerial(terminalInput + '\n');
      setTerminalInput('');
    }
  };

  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          color: #00f2ff; 
          font-family: monospace; 
          margin: 0; 
          padding: 16px; 
          background: transparent;
        }
        /* Basic HW OS styles for custom UI */
        button {
          background: rgba(0, 242, 255, 0.2);
          border: 1px solid rgba(0, 242, 255, 0.4);
          color: #00f2ff;
          padding: 8px 16px;
          cursor: pointer;
          font-family: monospace;
          text-transform: uppercase;
          border-radius: 4px;
        }
        button:hover { background: rgba(0, 242, 255, 0.3); }
        input {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(0, 242, 255, 0.3);
          color: #00f2ff;
          padding: 8px;
          font-family: monospace;
          outline: none;
        }
        input:focus { border-color: #00f2ff; }
      </style>
    </head>
    <body>
      ${challenge.customCode || '<h1>Custom Challenge UI</h1><p>No custom code provided.</p>'}
      <script>
        window.hwAPI = {
          complete: () => window.parent.postMessage({ type: 'COMPLETE_CHALLENGE' }, '*'),
          sendSerial: (data) => window.parent.postMessage({ type: 'SEND_SERIAL', data }, '*'),
          onSerialData: (callback) => {
            window.addEventListener('message', (e) => {
              if (e.data.type === 'SERIAL_DATA') callback(e.data.data);
            });
          }
        };
      </script>
    </body>
    </html>
  `;

  return (
    <div className="flex flex-col h-full bg-black/80 font-mono text-hw-blue">
      {/* Header */}
      <div className="hw-panel-header shrink-0 flex justify-between items-center border-b border-hw-blue/20 px-4 py-2">
        <div className="flex items-center gap-3">
          <Flag className={cn("w-4 h-4", challenge.status === 'solved' ? "text-green-500" : "text-hw-blue")} />
          <span className="text-xs font-bold tracking-widest uppercase">{challenge.title}</span>
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ml-2",
            challenge.status === 'solved' ? "bg-green-500/20 text-green-400" : "bg-hw-blue/20 text-hw-blue"
          )}>
            {challenge.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('briefing')}
            className={cn("px-3 py-1 text-[10px] uppercase tracking-widest transition-all", activeTab === 'briefing' ? "bg-hw-blue text-black font-bold" : "text-hw-blue/60 hover:text-hw-blue")}
          >
            Briefing
          </button>
          <button 
            onClick={() => setActiveTab('terminal')}
            className={cn("px-3 py-1 text-[10px] uppercase tracking-widest transition-all", activeTab === 'terminal' ? "bg-hw-blue text-black font-bold" : "text-hw-blue/60 hover:text-hw-blue")}
          >
            Terminal
          </button>
          <button 
            onClick={() => setActiveTab('custom_ui')}
            className={cn("px-3 py-1 text-[10px] uppercase tracking-widest transition-all", activeTab === 'custom_ui' ? "bg-hw-blue text-black font-bold" : "text-hw-blue/60 hover:text-hw-blue")}
          >
            Custom UI
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'briefing' && (
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-3xl mx-auto space-y-8">
              
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold tracking-widest uppercase mb-2">{challenge.title}</h1>
                  <div className="flex gap-3 text-xs opacity-60 uppercase tracking-widest">
                    <span>Category: {challenge.category}</span>
                    <span>•</span>
                    <span className={cn(
                      challenge.difficulty === 'easy' ? "text-green-400" :
                      challenge.difficulty === 'medium' ? "text-yellow-400" : "text-red-400"
                    )}>Difficulty: {challenge.difficulty}</span>
                    <span>•</span>
                    <span>Points: {challenge.points}</span>
                  </div>
                </div>
                {challenge.status === 'solved' && (
                  <div className="flex items-center gap-2 text-green-500 bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-bold uppercase tracking-widest text-xs">Solved</span>
                  </div>
                )}
              </div>

              <div className="prose prose-invert prose-hw max-w-none">
                {renderDescription(challenge.description)}
              </div>

              {challenge.flags && challenge.flags.length > 0 && (
                <div className="space-y-4 pt-8 border-t border-hw-blue/20">
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Objectives (Flags)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {challenge.flags.map(flag => {
                      const isSolved = (challenge.solvedFlags || []).includes(flag.id);
                      return (
                        <div key={flag.id} className={cn(
                          "p-4 border rounded-lg flex flex-col gap-3 transition-colors",
                          isSolved ? "bg-green-500/10 border-green-500/30" : "bg-hw-blue/5 border-hw-blue/20"
                        )}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                              {isSolved && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {flag.title}
                            </span>
                            <span className="text-[10px] opacity-50">{flag.points} pts</span>
                          </div>
                          {!isSolved ? (
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={flagInputs[flag.id] || ''}
                                onChange={e => setFlagInputs(prev => ({ ...prev, [flag.id]: e.target.value }))}
                                placeholder="Journal flag value here..."
                                className="flex-1 bg-black/40 border border-hw-blue/20 rounded p-2 text-xs outline-none focus:border-hw-blue"
                                onKeyDown={e => e.key === 'Enter' && handleSubmitFlag(flag.id)}
                              />
                              <button 
                                onClick={() => handleSubmitFlag(flag.id)}
                                className="px-3 py-2 bg-hw-blue/20 hover:bg-hw-blue/30 text-hw-blue rounded transition-colors flex items-center justify-center"
                                title="Save to Journal"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-green-400 opacity-80 flex flex-col gap-1">
                              <span>Flag journaled successfully.</span>
                              <span className="opacity-50 break-all">Value: {challenge.flagJournal?.[flag.id]}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {challenge.inventoryItems && challenge.inventoryItems.length > 0 && (
                <div className="space-y-4 pt-8 border-t border-hw-blue/20">
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Required Inventory</h3>
                  <div className="flex flex-wrap gap-4">
                    {challenge.inventoryItems.map(itemId => {
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

              {(challenge.tutorials?.length > 0 || challenge.notes?.length > 0) && (
                <div className="space-y-4 pt-8 border-t border-hw-blue/20">
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Attached Intelligence</h3>
                  
                  {challenge.tutorials?.map(tutId => {
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

                  {challenge.notes?.map(noteId => {
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
        )}

        {activeTab === 'terminal' && (
          <div className="absolute inset-0 flex flex-col p-4">
            <div className="flex-1 bg-black/60 border border-hw-blue/20 rounded-lg flex flex-col overflow-hidden">
              <div className="bg-hw-blue/10 px-3 py-1.5 border-b border-hw-blue/20 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Challenge Terminal</span>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500" : "bg-red-500")} />
                  <span className="text-[9px] uppercase opacity-60">{connected ? "Connected" : "Disconnected"}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1 custom-scrollbar" ref={terminalScrollRef}>
                {logs.map((log, i) => (
                  <div key={i} className="hover:bg-hw-blue/5 px-2 py-0.5 break-all">
                    <span className="opacity-90">{log.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendTerminal} className="p-2 bg-black/80 border-t border-hw-blue/20 flex gap-2">
                <Terminal className="w-4 h-4 text-hw-blue/40 mt-2 ml-2" />
                <input 
                  type="text"
                  value={terminalInput}
                  onChange={e => setTerminalInput(e.target.value)}
                  disabled={!connected}
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-hw-blue p-2"
                />
              </form>
            </div>
          </div>
        )}

        {activeTab === 'custom_ui' && (
          <div className="absolute inset-0 flex flex-col p-4">
            <div className="flex-1 bg-black/60 border border-hw-blue/20 rounded-lg flex flex-col overflow-hidden">
              <div className="bg-hw-blue/10 px-3 py-1.5 border-b border-hw-blue/20 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Custom Challenge Interface</span>
                <Code className="w-3 h-3 opacity-60" />
              </div>
              <iframe 
                ref={iframeRef}
                srcDoc={iframeSrcDoc}
                className="w-full h-full border-none bg-transparent"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
