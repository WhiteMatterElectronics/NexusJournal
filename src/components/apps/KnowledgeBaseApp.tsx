import React, { useState, useEffect } from 'react';
import { ConceptExplorer } from '../ConceptExplorer';
import { TutorialDetail } from '../TutorialDetail';
import { TutorialEditor } from '../TutorialEditor';
import { AppView, Tutorial } from '../../types';
import { BookOpen, Edit } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KnowledgeBaseAppProps {
  initialTutorialId?: string;
  onFlashFirmware: (firmwareId: string) => void;
  onStartApp: (id: AppView, morphFromId?: string, initialProps?: any) => void;
}

export const KnowledgeBaseApp: React.FC<KnowledgeBaseAppProps> = ({ initialTutorialId, onFlashFirmware, onStartApp }) => {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const refreshTutorials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tutorials');
      const data = await res.json();
      setTutorials(data);
      if (initialTutorialId && !selectedTutorial) {
        const tut = data.find((t: Tutorial) => t.id === initialTutorialId);
        if (tut) setSelectedTutorial(tut);
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

  const handleUpdateTutorial = async (tutorial: Tutorial) => {
    try {
      const res = await fetch('/api/tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tutorial)
      });
      
      if (!res.ok) throw new Error(await res.text());

      await refreshTutorials();
      setSelectedTutorial(tutorial);
    } catch (err) {
      console.error('Failed to update tutorial:', err);
      throw err;
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/20">
      <div className="flex items-center justify-between p-3 border-b border-hw-blue/20 bg-hw-blue/5 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-hw-blue" />
          <span className="text-[10px] font-bold tracking-widest uppercase hw-glow">Knowledge Base</span>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all",
            isEditing ? "bg-hw-blue text-black shadow-[0_0_10px_rgba(0,242,255,0.3)]" : "bg-hw-blue/10 text-hw-blue hover:bg-hw-blue/20"
          )}
        >
          <Edit className="w-3 h-3" />
          {isEditing ? "EXIT EDITOR" : "MANAGE DOCS"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] uppercase tracking-widest text-hw-blue/40 animate-pulse">Loading_Database...</span>
          </div>
        ) : isEditing ? (
          <TutorialEditor tutorials={tutorials} refreshTutorials={refreshTutorials} loading={loading} />
        ) : selectedTutorial ? (
          <TutorialDetail 
            tutorial={selectedTutorial} 
            onBack={() => setSelectedTutorial(null)} 
            onFlashFirmware={onFlashFirmware}
            onUpdate={handleUpdateTutorial}
            onStartApp={onStartApp as any}
          />
        ) : (
          <ConceptExplorer 
            tutorials={tutorials} 
            onSelect={setSelectedTutorial} 
          />
        )}
      </div>
    </div>
  );
};
