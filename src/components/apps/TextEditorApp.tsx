import React, { useState, useEffect } from 'react';
import { Save, FileText, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';

interface TextEditorProps {
  file?: { name: string; content: string; category: string };
  onClose: () => void;
}

export const TextEditorApp: React.FC<TextEditorProps> = ({ file, onClose }) => {
  const { theme } = useSettings();
  const [content, setContent] = useState(file?.content || '');
  const [fileName, setFileName] = useState(file?.name || 'Untitled.txt');

  const getLanguage = (name: string) => {
    if (name.endsWith('.py')) return 'python';
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return 'typescript';
    if (name.endsWith('.js')) return 'javascript';
    if (name.endsWith('.c')) return 'c';
    if (name.endsWith('.cpp')) return 'cpp';
    if (name.endsWith('.asm')) return 'asm';
    if (name.endsWith('.md')) return 'markdown';
    return 'text';
  };

  const language = getLanguage(fileName);

  return (
    <div className="flex flex-col h-full bg-[var(--theme-panel-bg)] text-[var(--theme-text)]">
      <div className="flex items-center justify-between p-2 border-b border-[var(--theme-border-color)]">
        <div className="flex items-center gap-2">
          <FileText size={16} />
          <input 
            value={fileName} 
            onChange={(e) => setFileName(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-bold"
          />
        </div>
        <div className="flex gap-2">
          <button className="p-1 hover:bg-hw-blue/10 rounded"><Save size={14} /></button>
          <button className="p-1 hover:bg-hw-blue/10 rounded"><Settings size={14} /></button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-grow w-full p-4 bg-transparent outline-none font-mono text-xs resize-none"
        placeholder="Start typing..."
        style={{ color: 'var(--theme-text)' }}
      />
      <div className="p-1 text-[10px] border-t border-[var(--theme-border-color)] flex justify-between px-2 opacity-60">
        <span>{language}</span>
        <span>{content.length} chars</span>
      </div>
    </div>
  );
};
