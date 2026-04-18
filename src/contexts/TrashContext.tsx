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
  const [trashedItems, setTrashedItems] = useState<FileSystemItem[]>(() => {
    const saved = localStorage.getItem('hw_os_trash');
    return saved ? JSON.parse(saved) : [];
  });

  const saveTrash = (items: FileSystemItem[]) => {
    setTrashedItems(items);
    localStorage.setItem('hw_os_trash', JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('hw_os_trash_updated', { detail: items }));
  };

  const trashFile = (item: FileSystemItem) => {
    const newItem = { ...item, originalParentId: item.parentId, trashedAt: Date.now() };
    saveTrash([...trashedItems, newItem]);
  };

  const restoreFile = (itemId: string) => {
    const item = trashedItems.find(i => i.id === itemId);
    if (item) {
      window.dispatchEvent(new CustomEvent('hw_os_restore_file', { detail: item }));
      saveTrash(trashedItems.filter(i => i.id !== itemId));
    }
  };

  const clearTrash = () => {
    saveTrash([]);
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
