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
    let loadedItems: InventoryItem[] = [];
    if (saved) {
      try {
        loadedItems = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse inventory items", e);
      }
    }

    // Default Inventory Templates
    const defaultItems: InventoryItem[] = [
      {
        id: 'hs-01',
        name: 'AEGIS-IV ICARUS Station Core',
        description: 'OMEGA-PREMIUM research hardware recovered from the derelict USN Icarus. Features a dual-core ATmega328P/AETHER configuration, custom I2C Singularity memory, and a reactive HUD interface. Essential for bridging the Singularity Event.',
        images: ['https://picsum.photos/seed/icarus_core/400/400'],
        stock: 5,
        category: 'challenge',
        type: 'hardware'
      },
      {
        id: 'esp-asst',
        name: 'ESP32 Research Assistant',
        description: 'The "Swiss Army Knife" of bus hacking. Used to bridge the HomeSec Vault to the central workstation. Enables protocol sniffing and manual buffer injection.',
        images: ['https://picsum.photos/seed/esp32_hacking/400/400'],
        stock: 10,
        category: 'tool',
        type: 'hardware'
      }
    ];

    const otherItems = loadedItems.filter(li => !defaultItems.find(di => di.id === li.id));
    return [...defaultItems, ...otherItems];
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
