import React, { useState } from 'react';
import { FileDown, Database, HardDrive, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';

interface SaveFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToDB: () => void;
  onSaveToLocal: () => void;
  fileName: string;
}

export const SaveFileDialog: React.FC<SaveFileDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSaveToDB, 
  onSaveToLocal,
  fileName 
}) => {
  const { theme } = useSettings();
  const isGlassy = theme.globalTheme === 'glassy';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "relative w-full max-w-md p-8 border shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center",
              isGlassy ? "rounded-[2rem] bg-hw-black/80 border-white/10" : "rounded-sm bg-hw-black border-hw-blue/20"
            )}
            style={{ backdropFilter: 'var(--theme-backdrop-filter)' }}
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-hw-blue/30 hover:text-hw-blue transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-hw-blue/10 border border-hw-blue/30 flex items-center justify-center mb-6 rounded-full">
              <FileDown className="w-8 h-8 text-hw-blue" />
            </div>

            <h2 className="text-xl font-black tracking-tighter uppercase text-hw-blue mb-2">Export Document</h2>
            <p className="text-[10px] text-hw-blue/60 uppercase tracking-widest mb-8 text-center">
              Choose destination for <span className="text-hw-blue font-bold">"{fileName}"</span>
            </p>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => {
                  onSaveToDB();
                  onClose();
                }}
                className={cn(
                  "flex flex-col items-center gap-4 p-6 border transition-all group",
                  isGlassy ? "rounded-2xl bg-white/5 hover:bg-white/10 border-white/10" : "rounded-sm bg-hw-blue/5 hover:bg-hw-blue/10 border-hw-blue/20"
                )}
              >
                <Database className="w-8 h-8 text-hw-blue/60 group-hover:text-hw-blue group-hover:scale-110 transition-all" />
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-1">Local Database</span>
                  <span className="text-[8px] opacity-40 uppercase">Virtual File System</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onSaveToLocal();
                  onClose();
                }}
                className={cn(
                  "flex flex-col items-center gap-4 p-6 border transition-all group",
                  isGlassy ? "rounded-2xl bg-white/5 hover:bg-white/10 border-white/10" : "rounded-sm bg-hw-blue/5 hover:bg-hw-blue/10 border-hw-blue/20"
                )}
              >
                <HardDrive className="w-8 h-8 text-hw-blue/60 group-hover:text-hw-blue group-hover:scale-110 transition-all" />
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-1">User Storage</span>
                  <span className="text-[8px] opacity-40 uppercase">Real Device Storage</span>
                </div>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-hw-blue/10 w-full flex justify-center">
              <button 
                onClick={onClose}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-hw-blue/40 hover:text-hw-blue transition-colors"
              >
                Cancel Operation
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
