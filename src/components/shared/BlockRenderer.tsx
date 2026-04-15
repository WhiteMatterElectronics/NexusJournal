import React from 'react';
import { Terminal, Copy, AlertTriangle, Lightbulb, Download } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { TutorialBlock } from '../../types';

export const BlockRenderer: React.FC<{ blocks: TutorialBlock[] }> = ({ blocks }) => {
  const renderBlock = (block: TutorialBlock) => {
    switch (block.type) {
      case 'markdown':
        return (
          <div 
            className="prose prose-invert max-w-none 
              prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:text-hw-blue prose-headings:hw-glow
              prose-p:text-hw-blue/80 prose-p:leading-relaxed prose-p:text-sm
              prose-code:text-hw-blue prose-code:bg-hw-blue/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-[''] prose-code:after:content-['']
              prose-pre:bg-black/60 prose-pre:border prose-pre:border-hw-blue/20 prose-pre:p-8 prose-pre:rounded-none
              prose-li:text-hw-blue/70 prose-li:text-sm
              prose-strong:text-hw-blue prose-strong:font-bold
              prose-hr:border-hw-blue/10
              prose-img:border prose-img:border-hw-blue/20 prose-img:p-2 prose-img:bg-hw-blue/5
            "
            dangerouslySetInnerHTML={{ __html: block.data.text }}
          />
        );
      case 'code':
        return (
          <div className="my-6 group/code relative">
            <div className="bg-hw-blue/10 border border-hw-blue/20 border-b-0 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                {block.data.language}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(block.data.code)}
                className="opacity-0 group-hover/code:opacity-100 transition-opacity hover:text-hw-blue"
                title="Copy Code"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <SyntaxHighlighter 
                language={block.data.language || 'text'} 
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(0, 242, 255, 0.2)',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#00f2ff',
                    textShadow: '0 0 5px rgba(0, 242, 255, 0.3)'
                  }
                }}
              >
                {block.data.code}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      case 'image':
        const imgWidth = block.data.width || 100;
        const isInline = imgWidth < 100;
        return (
          <div className={cn(
            "my-8",
            isInline ? "inline-block align-top px-2" : "block"
          )} style={{ width: isInline ? `${imgWidth}%` : '100%' }}>
            <div className="relative group/img">
              <img 
                src={block.data.url} 
                alt={block.data.caption} 
                className="max-w-full h-auto border border-hw-blue/20 p-2 bg-hw-blue/5 mx-auto transition-transform duration-500 hover:scale-[1.02]" 
              />
              {block.data.caption && <p className="text-center text-[10px] text-hw-blue/40 mt-3 uppercase tracking-widest">{block.data.caption}</p>}
            </div>
          </div>
        );
      case 'attached_note':
        const note = (() => {
          const saved = localStorage.getItem('hw_os_notes');
          if (saved) {
            try {
              const notes = JSON.parse(saved);
              return notes.find((n: any) => n.id === block.data.noteId);
            } catch { return null; }
          }
          return null;
        })();
        
        if (!note) return null;
        return (
          <div className="my-8 border border-hw-blue/30 bg-hw-blue/5 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-hw-blue/50" />
            <div className="text-[10px] uppercase tracking-widest text-hw-blue/40 mb-4 font-bold flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-hw-blue/50 rounded-full animate-pulse" />
              Attached Data Slab
            </div>
            <h4 className="text-lg font-bold text-hw-blue mb-4">{note.title}</h4>
            <div className="prose prose-invert max-w-none text-xs opacity-80" dangerouslySetInnerHTML={{ __html: note.content }} />
          </div>
        );
      case 'sub_heading':
        return <h3 className="text-2xl font-black text-hw-blue hw-glow mt-12 mb-6 uppercase tracking-tighter">{block.data.text}</h3>;
      case 'file_download':
        return (
          <a href={block.data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 my-6 bg-hw-blue/10 border border-hw-blue/30 hover:bg-hw-blue/20 transition-colors group w-fit">
            <Download className="w-5 h-5 text-hw-blue group-hover:-translate-y-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest text-hw-blue">{block.data.name || 'Download File'}</span>
          </a>
        );
      case 'video_embed':
        return (
          <div className="my-8 aspect-video w-full border border-hw-blue/20 bg-black/50">
            <iframe 
              src={block.data.url} 
              className="w-full h-full" 
              allowFullScreen 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            />
          </div>
        );
      case 'image_gallery':
        return (
          <div className="my-8 grid grid-cols-2 md:grid-cols-3 gap-4">
            {block.data.urls.map((url: string, i: number) => (
              url ? <img key={i} src={url} alt={`Gallery image ${i + 1}`} className="w-full h-48 object-cover border border-hw-blue/20 bg-hw-blue/5" /> : null
            ))}
          </div>
        );
      case 'note':
        return (
          <div className={cn(
            "my-6 p-5 border-l-2 bg-hw-blue/5 text-sm leading-relaxed",
            block.data.type === 'warning' ? "border-yellow-500 text-yellow-500/90" :
            block.data.type === 'tip' ? "border-green-500 text-green-500/90" :
            "border-hw-blue text-hw-blue/90"
          )}>
            <div className="font-bold uppercase tracking-widest mb-2 text-[10px] opacity-70 flex items-center gap-2">
              {block.data.type}
            </div>
            {block.data.text}
          </div>
        );
      case 'divider':
        return <div className="w-full h-px bg-hw-blue/20 my-10" />;
      case 'tip':
        return (
          <div className="my-8 border border-green-500/30 bg-green-500/5 p-6 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-black border border-green-500/30 rounded-full flex items-center justify-center text-green-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-green-400/60 mb-2 font-bold ml-4">Pro Tip</div>
            <div className="text-green-400/90 text-sm leading-relaxed ml-4">{block.data.text}</div>
          </div>
        );
      case 'warning':
        return (
          <div className="my-8 border border-red-500/30 bg-red-500/5 p-6 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-black border border-red-500/30 rounded-full flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-red-400/60 mb-2 font-bold ml-4">Warning</div>
            <div className="text-red-400/90 text-sm leading-relaxed ml-4">{block.data.text}</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <React.Fragment key={block.id || index}>
          {renderBlock(block)}
        </React.Fragment>
      ))}
    </div>
  );
};
