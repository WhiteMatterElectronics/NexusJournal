import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FileSystemItem } from '../components/apps/MyFilesApp';

interface TrashContextType {
  trashedItems: FileSystemItem[];
  trashFile: (item: FileSystemItem) => void;
  restoreFile: (itemId: string) => void;
  clearTrash: () => void;
}

const TrashContext = createContext<TrashContextType | undefined>(undefined);

export const TrashProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [trashedItems, setTrashedItems] = useState<FileSystemItem[]>([]);

  const trashFile = (item: FileSystemItem) => {
    setTrashedItems(prev => [...prev, { ...item, parentId: 'trash' }]);
  };

  const restoreFile = (itemId: string) => {
    setTrashedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearTrash = () => {
    setTrashedItems([]);
  };

  return (
    <TrashContext.Provider value={{ trashedItems, trashFile, restoreFile, clearTrash }}>
      {children}
    </TrashContext.Provider>
  );
};

export const useTrash = () => {
  const context = useContext(TrashContext);
  if (!context) throw new Error('useTrash must be used within a TrashProvider');
  return context;
};
