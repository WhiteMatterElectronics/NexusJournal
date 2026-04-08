/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ConceptExplorer } from './components/ConceptExplorer';
import { TutorialDetail } from './components/TutorialDetail';
import { FlashModule } from './components/FlashModule';
import { SystemConfig } from './components/SystemConfig';
import { AppView, Tutorial } from './types';
import { INITIAL_TUTORIALS } from './constants';
import { Terminal, Cpu, Zap, Settings, BookOpen, Activity, Beaker } from 'lucide-react';
import { Lab } from './components/Lab';
import { cn } from './lib/utils';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('tutorials');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoFlashFirmwareId, setAutoFlashFirmwareId] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const refreshTutorials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tutorials');
      const data = await res.json();
      setTutorials(data);
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        const intro = data.find((t: Tutorial) => t.id === 'intro-electron-assistant');
        if (intro) {
          setSelectedTutorial(intro);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tutorials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTutorials();
  }, []);

  const handleViewChange = (view: AppView) => {
    setCurrentView(view);
    setSelectedTutorial(null);
    if (view !== 'flasher') {
      setAutoFlashFirmwareId(null);
    }
  };

  const handleFlashFirmware = (firmwareId: string) => {
    setAutoFlashFirmwareId(firmwareId);
    setCurrentView('flasher');
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden p-4 gap-4">
      {/* System Header */}
      <header className="hw-panel h-16 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-hw-blue/10 border border-hw-blue/30 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tighter leading-none">ELECTRON_ASSISTANT</h1>
              <span className="text-[9px] text-hw-blue/40 uppercase tracking-widest">System Console // Active</span>
            </div>
          </div>
          
          <div className="h-8 w-px bg-hw-blue/20 mx-2" />
          
          <nav className="flex gap-2">
            {[
              { id: 'tutorials', icon: BookOpen, label: 'KNOWLEDGE_BASE' },
              { id: 'flasher', icon: Zap, label: 'FLASH_MODULE' },
              { id: 'lab', icon: Beaker, label: 'LAB' },
              { id: 'admin', icon: Settings, label: 'SYS_CONFIG' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id as AppView)}
                className={cn(
                  "hw-button py-1 px-4 flex items-center gap-2",
                  currentView === item.id ? "bg-hw-blue text-hw-black" : "bg-transparent text-hw-blue/60 border-transparent hover:border-hw-blue/30"
                )}
              >
                <item.icon className="w-3 h-3" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 min-h-0">
        <main className="flex-1 hw-panel overflow-hidden flex flex-col">
          <div className="hw-panel-header">
            <span>MAIN_VIEW // {currentView.toUpperCase()}</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-hw-blue/20" />
              <div className="w-2 h-2 bg-hw-blue/40" />
              <div className="w-2 h-2 bg-hw-blue" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
            <div className={cn("h-full", currentView === 'lab' ? "block" : "hidden")}>
              <Lab />
            </div>
            
            {currentView !== 'lab' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView + (selectedTutorial?.id || '')}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-4">
                        <Cpu className="w-12 h-12 animate-spin text-hw-blue/20" />
                        <span className="text-[10px] uppercase tracking-widest text-hw-blue/40">Loading_Database...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {currentView === 'tutorials' && (
                        selectedTutorial ? (
                          <TutorialDetail 
                            tutorial={selectedTutorial} 
                            onBack={() => setSelectedTutorial(null)} 
                            onFlashFirmware={handleFlashFirmware}
                          />
                        ) : (
                          <ConceptExplorer 
                            tutorials={tutorials} 
                            onSelect={setSelectedTutorial} 
                          />
                        )
                      )}

                      {currentView === 'flasher' && <FlashModule autoFlashFirmwareId={autoFlashFirmwareId} onFlashComplete={() => setCurrentView('lab')} />}
                      {currentView === 'admin' && (
                        <SystemConfig 
                          tutorials={tutorials} 
                          refreshTutorials={refreshTutorials} 
                          loading={loading} 
                        />
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

