import React from 'react';
import { Tutorial } from '../types';
import { cn } from '../lib/utils';
import { ChevronRight, Terminal } from 'lucide-react';

interface ConceptExplorerProps {
  tutorials: Tutorial[];
  onSelect: (tutorial: Tutorial) => void;
}

export const ConceptExplorer: React.FC<ConceptExplorerProps> = ({ tutorials, onSelect }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-hw-blue/20 pb-4">
        <Terminal className="w-6 h-6 text-hw-blue" />
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase hw-glow">Knowledge_Explorer</h2>
          <p className="text-[10px] text-hw-blue/40 uppercase tracking-[0.2em]">Accessing hardware documentation database...</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tutorials.map((tutorial, index) => (
          <button
            key={tutorial.id}
            onClick={() => onSelect(tutorial)}
            className="group text-left hw-panel p-0 overflow-hidden hover:border-hw-blue transition-all"
          >
            <div className="hw-panel-header">
              <span className="hw-bracket">CONCEPT_{index.toString().padStart(2, '0')}</span>
              <span className="text-[8px] opacity-50 uppercase">{tutorial.category}</span>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg group-hover:hw-glow transition-all">
                  {tutorial.title.toUpperCase()}
                </h3>
              </div>
              <p className="text-xs text-hw-blue/60 leading-relaxed mb-6 h-12 line-clamp-3">
                {tutorial.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={cn(
                      "w-3 h-1",
                      i === 0 ? "bg-hw-blue" : 
                      i === 1 && (tutorial.difficulty === 'intermediate' || tutorial.difficulty === 'advanced') ? "bg-hw-blue" :
                      i === 2 && tutorial.difficulty === 'advanced' ? "bg-hw-blue" : "bg-hw-blue/10"
                    )} />
                  ))}
                </div>
                <div className="flex items-center text-[10px] font-bold text-hw-blue uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                  EXECUTE <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
