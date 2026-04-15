import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Window } from '../os/Window';

interface Tab {
  id: string;
  title: string;
  url: string;
}

export const BrowserApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', title: 'New Tab', url: 'https://www.google.com' }]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [urlInput, setUrlInput] = useState('https://www.google.com');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const addTab = () => {
    const id = crypto.randomUUID();
    setTabs([...tabs, { id, title: 'New Tab', url: 'https://www.google.com' }]);
    setActiveTabId(id);
    setUrlInput('https://www.google.com');
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) setActiveTabId(newTabs[0].id);
  };

  const navigate = (url: string) => {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, url: formattedUrl } : t));
    setUrlInput(formattedUrl);
    if (iframeRef.current) {
      iframeRef.current.src = formattedUrl;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="flex items-center bg-gray-100 p-2 gap-2 border-b">
        {tabs.map(tab => (
          <div 
            key={tab.id}
            onClick={() => { setActiveTabId(tab.id); setUrlInput(tab.url); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-t-lg cursor-pointer text-xs",
              activeTabId === tab.id ? "bg-white" : "bg-gray-200"
            )}
          >
            {tab.title}
            <X size={12} onClick={(e) => closeTab(tab.id, e)} />
          </div>
        ))}
        <button onClick={addTab} className="p-1 hover:bg-gray-200 rounded"><Plus size={14} /></button>
      </div>
      <div className="flex items-center p-2 gap-2 border-b">
        <button onClick={() => iframeRef.current?.contentWindow?.history.back()} className="p-1 hover:bg-gray-200 rounded"><ArrowLeft size={16} /></button>
        <button onClick={() => iframeRef.current?.contentWindow?.history.forward()} className="p-1 hover:bg-gray-200 rounded"><ArrowRight size={16} /></button>
        <button onClick={() => iframeRef.current?.contentWindow?.location.reload()} className="p-1 hover:bg-gray-200 rounded"><RefreshCw size={16} /></button>
        <input 
          type="text" 
          value={urlInput} 
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && navigate(urlInput)}
          className="flex-1 border rounded px-2 py-1 text-sm"
        />
      </div>
      <iframe 
        ref={iframeRef}
        src={activeTab.url}
        className="flex-1 w-full h-full"
        title="Browser"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};
