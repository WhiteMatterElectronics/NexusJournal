import React, { useState } from 'react';
import { useSerial } from '../../contexts/SerialContext';
import { Edit2, Plus, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  selectedConnId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const SerialConnectionSelector: React.FC<Props> = ({ selectedConnId, onSelect, className }) => {
  const { allConnections, renameConnection } = useSerial(selectedConnId);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const currentConn = allConnections[selectedConnId];
  const displayName = currentConn?.name || selectedConnId;

  const handleStartEdit = () => {
    setEditName(displayName);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      renameConnection(editName.trim());
    }
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    const newId = `conn-${Math.random().toString(36).substr(2, 6)}`;
    onSelect(newId);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="bg-black/40 border border-hw-blue/40 text-[10px] px-2 py-0.5 outline-none text-hw-blue w-24 h-6 font-mono"
            placeholder="Name..."
          />
          <button onClick={handleSaveEdit} className="p-1 hover:bg-green-500/20 text-green-500 rounded">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-red-500/20 text-red-500 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 shadow-sm">
          <select
            value={selectedConnId}
            onChange={(e) => onSelect(e.target.value)}
            className="bg-black/60 border border-hw-blue/20 text-hw-blue text-[10px] font-mono px-2 py-0.5 outline-none focus:border-hw-blue h-6 hover:bg-black/80 transition-colors"
          >
            {Array.from(new Set([...Object.keys(allConnections), selectedConnId])).map(id => {
              const name = allConnections[id]?.name;
              const label = name ? `${name} (${id})` : id;
              return (
                <option key={id} value={id} className="bg-hw-black text-hw-blue">
                  {label.toUpperCase()}
                </option>
              );
            })}
          </select>
          <button
            onClick={handleStartEdit}
            className="p-1 min-h-[24px] bg-black/60 hover:bg-hw-blue/20 text-hw-blue/60 hover:text-hw-blue border border-hw-blue/20 rounded-r border-l-0 transition-colors"
            title="Rename Connection"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleCreateNew}
            className="p-1 min-h-[24px] bg-black/60 hover:bg-hw-blue/20 text-hw-blue/60 hover:text-hw-blue border border-hw-blue/20 rounded ml-1 transition-colors"
            title="New Connection Instance"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
