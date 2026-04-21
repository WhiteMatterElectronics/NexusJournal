import React, { useState, useRef, useEffect } from "react";
import { 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Plus, 
  X, 
  Search, 
  Star, 
  Bookmark,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useSettings } from "../../contexts/SettingsContext";

interface Tab {
  id: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}

export const BrowserApp: React.FC = () => {
  const { theme } = useSettings();
  const isGlassy = theme.globalTheme === 'glassy';
  
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', url: 'https://duckduckgo.com', title: 'New Tab', canGoBack: false, canGoForward: false, isLoading: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [urlInput, setUrlInput] = useState('https://duckduckgo.com');
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const webviewRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    setUrlInput(activeTab.url);
  }, [activeTabId]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let url = urlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
      }
    }
    updateTab(activeTabId, { url });
  };

  const updateTab = (id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addNewTab = () => {
    const newId = Date.now().toString();
    const newTab = { 
      id: newId, 
      url: 'https://duckduckgo.com', 
      title: 'New Tab', 
      canGoBack: false, 
      canGoForward: false, 
      isLoading: false 
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const handleWebviewEvent = (id: string, type: string, e: any) => {
    const webview = webviewRefs.current[id];
    if (!webview) return;

    switch (type) {
      case 'did-stop-loading':
        updateTab(id, { 
          isLoading: false, 
          title: webview.getTitle() || 'New Tab',
          url: webview.getURL(),
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward()
        });
        if (id === activeTabIdRef.current) setUrlInput(webview.getURL());
        break;
      case 'did-start-loading':
        updateTab(id, { isLoading: true });
        break;
      case 'page-title-updated':
        updateTab(id, { title: e.title });
        break;
      case 'did-fail-load':
        updateTab(id, { isLoading: false });
        break;
    }
  };

  const goBack = () => webviewRefs.current[activeTabId]?.goBack();
  const goForward = () => webviewRefs.current[activeTabId]?.goForward();
  const reload = () => webviewRefs.current[activeTabId]?.reload();

  const toggleBookmark = () => {
    if (bookmarks.includes(activeTab.url)) {
      setBookmarks(bookmarks.filter(b => b !== activeTab.url));
    } else {
      setBookmarks([...bookmarks, activeTab.url]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/20" style={{ color: 'var(--theme-text)' }}>
      {/* Tabs Bar */}
      <div className="flex items-center gap-1 p-1 bg-black/40 border-b border-hw-blue/10 shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px] cursor-pointer transition-all border-t-2",
              activeTabId === tab.id 
                ? "bg-hw-blue/10 border-hw-blue opacity-100" 
                : "bg-transparent border-transparent opacity-50 hover:opacity-80"
            )}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="text-[10px] font-bold uppercase truncate flex-1">{tab.title}</span>
            <X 
              className="w-3 h-3 hover:text-red-500 transition-colors" 
              onClick={(e) => closeTab(tab.id, e)} 
            />
          </div>
        ))}
        <button 
          onClick={addNewTab}
          className="p-1.5 hover:bg-hw-blue/10 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center gap-2 p-2 bg-black/20 border-b border-hw-blue/10 shrink-0">
        <div className="flex items-center gap-1">
          <button 
            disabled={!activeTab.canGoBack}
            onClick={goBack}
            className="p-1.5 disabled:opacity-30 hover:bg-hw-blue/10 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            disabled={!activeTab.canGoForward}
            onClick={goForward}
            className="p-1.5 disabled:opacity-30 hover:bg-hw-blue/10 rounded transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={reload}
            className="p-1.5 hover:bg-hw-blue/10 rounded transition-colors"
          >
            <RotateCcw className={cn("w-4 h-4", activeTab.isLoading && "animate-spin")} />
          </button>
        </div>

        <form onSubmit={handleNavigate} className="flex-1 flex items-center relative">
          <div className="absolute left-3 text-hw-blue/40">
            <Search className="w-3 h-3" />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full bg-black/40 border border-hw-blue/20 rounded-lg px-8 py-1.5 text-xs font-mono focus:border-hw-blue outline-none transition-all"
            placeholder="Search or enter URL..."
          />
          <button 
            type="button"
            onClick={toggleBookmark}
            className={cn(
              "absolute right-3 transition-colors",
              bookmarks.includes(activeTab.url) ? "text-yellow-500" : "text-hw-blue/40 hover:text-hw-blue"
            )}
          >
            <Star className="w-4 h-4" fill={bookmarks.includes(activeTab.url) ? "currentColor" : "none"} />
          </button>
        </form>

        <button 
          onClick={() => setShowBookmarks(!showBookmarks)}
          className={cn(
            "p-1.5 rounded transition-colors",
            showBookmarks ? "bg-hw-blue/20 text-hw-blue" : "hover:bg-hw-blue/10"
          )}
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Browser Content / Bookmarks Sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Webviews */}
        {tabs.map(tab => (
          <div 
            key={tab.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-200",
              activeTabId === tab.id ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
          >
            <webview
              ref={(el: any) => { 
                if (el) {
                  webviewRefs.current[tab.id] = el;
                  
                  if (el._handleWebviewEvent) {
                    el.removeEventListener('did-stop-loading', el._handleWebviewEvent.stop);
                    el.removeEventListener('did-start-loading', el._handleWebviewEvent.start);
                    el.removeEventListener('page-title-updated', el._handleWebviewEvent.title);
                    el.removeEventListener('did-fail-load', el._handleWebviewEvent.fail);
                  }

                  el._handleWebviewEvent = {
                    stop: (e: any) => handleWebviewEvent(tab.id, 'did-stop-loading', e),
                    start: (e: any) => handleWebviewEvent(tab.id, 'did-start-loading', e),
                    title: (e: any) => handleWebviewEvent(tab.id, 'page-title-updated', e),
                    fail: (e: any) => {
                      // errorCode -3 is ERR_ABORTED, which is common during redirects
                      if (e.errorCode !== -3) {
                        handleWebviewEvent(tab.id, 'did-fail-load', e);
                      }
                    }
                  };

                  el.addEventListener('did-stop-loading', el._handleWebviewEvent.stop);
                  el.addEventListener('did-start-loading', el._handleWebviewEvent.start);
                  el.addEventListener('page-title-updated', el._handleWebviewEvent.title);
                  el.addEventListener('did-fail-load', el._handleWebviewEvent.fail);
                }
              }}
              src={tab.url}
              useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              className="w-full h-full"
              style={{ background: 'white' }}
            />
          </div>
        ))}

        {/* Bookmarks Sidebar Overlay */}
        {showBookmarks && (
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-black/80 backdrop-blur-xl border-l border-hw-blue/20 z-50 p-4 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Bookmarks</h3>
              <button onClick={() => setShowBookmarks(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-2">
              {bookmarks.length === 0 ? (
                <p className="text-[10px] opacity-40 text-center py-10 uppercase italic">No bookmarks yet</p>
              ) : (
                bookmarks.map(b => (
                  <button
                    key={b}
                    onClick={() => {
                      updateTab(activeTabId, { url: b });
                      setShowBookmarks(false);
                    }}
                    className="text-left p-2 hover:bg-hw-blue/10 rounded border border-transparent hover:border-hw-blue/20 transition-all truncate text-[10px] font-mono"
                  >
                    {b.replace(/^https?:\/\/(www\.)?/, '')}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
