import React from 'react';
import { Trash2, RotateCcw, X } from 'lucide-react';
import { useTrash } from '../../contexts/TrashContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const TrashCanApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { trashedItems, restoreFile, clearTrash } = useTrash();

  return (
    <div className="flex flex-col h-full bg-hw-black text-hw-blue border border-hw-blue/20">
      <div className="flex items-center justify-between p-4 border-b border-hw-blue/20">
        <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
          <Trash2 size={20} /> Trash Can
        </h2>
        <div className="flex gap-2">
          <button onClick={clearTrash} className="p-2 hover:bg-hw-blue/20 rounded">
            <X size={16} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-hw-blue/20 rounded">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence>
          {trashedItems.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center justify-between p-3 mb-2 bg-hw-blue/5 border border-hw-blue/10 rounded"
            >
              <span className="text-sm">{item.name}</span>
              <button onClick={() => restoreFile(item.id)} className="p-2 hover:bg-hw-blue/20 rounded">
                <RotateCcw size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {trashedItems.length === 0 && (
          <div className="text-center text-hw-blue/50 mt-10">Trash is empty</div>
        )}
      </div>
    </div>
  );
};
