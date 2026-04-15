import React, { createContext, useContext, useState, useEffect } from 'react';
import { InventoryItem } from '../types/inventory';

interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: InventoryItem) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  importItems: (items: InventoryItem[]) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('hw_inventory_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse inventory items", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('hw_inventory_items', JSON.stringify(items));
  }, [items]);

  const addItem = (item: InventoryItem) => {
    setItems(prev => [...prev, item]);
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const importItems = (newItems: InventoryItem[]) => {
    setItems(newItems);
  };

  return (
    <InventoryContext.Provider value={{ items, addItem, updateItem, deleteItem, importItems }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
