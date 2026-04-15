import React, { createContext, useContext, useState, useEffect } from 'react';
import { CtfChallenge } from '../types/ctf';

interface CtfContextType {
  challenges: CtfChallenge[];
  addChallenge: (challenge: CtfChallenge) => void;
  updateChallenge: (id: string, updates: Partial<CtfChallenge>) => void;
  deleteChallenge: (id: string) => void;
}

const CtfContext = createContext<CtfContextType | undefined>(undefined);

export const CtfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [challenges, setChallenges] = useState<CtfChallenge[]>(() => {
    const saved = localStorage.getItem('hw_ctf_challenges');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse CTF challenges", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('hw_ctf_challenges', JSON.stringify(challenges));
  }, [challenges]);

  const addChallenge = (challenge: CtfChallenge) => {
    setChallenges(prev => [...prev, challenge]);
  };

  const updateChallenge = (id: string, updates: Partial<CtfChallenge>) => {
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteChallenge = (id: string) => {
    setChallenges(prev => prev.filter(c => c.id !== id));
  };

  return (
    <CtfContext.Provider value={{ challenges, addChallenge, updateChallenge, deleteChallenge }}>
      {children}
    </CtfContext.Provider>
  );
};

export const useCtf = () => {
  const context = useContext(CtfContext);
  if (context === undefined) {
    throw new Error('useCtf must be used within a CtfProvider');
  }
  return context;
};
