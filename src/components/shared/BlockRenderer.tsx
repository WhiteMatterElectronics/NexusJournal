import React from 'react';
import { Terminal, Copy, AlertTriangle, Lightbulb } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { cn } from '../../lib/utils';
import { TutorialBlock } from '../../types';

const customSyntaxTheme: any = {
  'code[class*="language-"]': {
    color: 'var(--theme-content-text)',
    background: 'none',
    textShadow: 'none',
    fontFamily: '"JetBrains Mono", monospace',
  },
  'pre[class*="language-"]': {
    color: 'var(--theme-content-text)',
    background: 'var(--theme-content-bg)',
    textShadow: 'none',
    fontFamily: '"JetBrains Mono", monospace',
    margin: 0,
    padding: '1.5rem',
    fontSize: '0.75rem',
    lineHeight: '1.5',
    border: '1px solid var(--theme-border-color)',
  },
  'comment': { color: 'var(--theme-comment)' },
  'prolog': { color: 'var(--theme-comment)' },
  'doctype': { color: 'var(--theme-comment)' },
  'cdata': { color: 'var(--theme-comment)' },
  'punctuation': { color: 'var(--theme-content-text)', opacity: 0.7 },
  'namespace': { opacity: 0.7 },
  'property': { color: 'var(--theme-keyword)' },
  'tag': { color: 'var(--theme-keyword)' },
  'boolean': { color: 'var(--theme-number)' },
  'number': { color: 'var(--theme-number)' },
  'constant': { color: 'var(--theme-number)' },
  'symbol': { color: 'var(--theme-number)' },
  'deleted': { color: 'var(--theme-number)' },
  'selector': { color: 'var(--theme-string)' },
  'attr-name': { color: 'var(--theme-string)' },
  'string': { color: 'var(--theme-string)' },
  'char': { color: 'var(--theme-string)' },
  'builtin': { color: 'var(--theme-string)' },
  'inserted': { color: 'var(--theme-string)' },
  'operator': { color: 'var(--theme-keyword)' },
  'entity': { color: 'var(--theme-keyword)', cursor: 'help' },
  'url': { color: 'var(--theme-keyword)' },
  'variable': { color: 'var(--theme-main)' },
  'atrule': { color: 'var(--theme-keyword)' },
  'attr-value': { color: 'var(--theme-string)' },
  'function': { color: 'var(--theme-main)' },
  'class-name': { color: 'var(--theme-main)' },
  'keyword': { color: 'var(--theme-keyword)' },
  'regex': { color: 'var(--theme-string)' },
  'important': { color: 'var(--theme-keyword)', fontWeight: 'bold' },
  'bold': { fontWeight: 'bold' },
  'italic': { fontStyle: 'italic' },
};

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
            style={{ 
              color: 'var(--theme-content-text)',
              '--tw-prose-headings': 'var(--theme-main)',
              '--tw-prose-body': 'var(--theme-content-text)',
              '--tw-prose-bold': 'var(--theme-main)',
              '--tw-prose-links': 'var(--theme-main)',
              '--tw-prose-code': 'var(--theme-main)',
              '--tw-prose-pre-bg': 'var(--theme-content-bg)',
              '--tw-prose-pre-code': 'var(--theme-content-text)',
            } as any}
            dangerouslySetInnerHTML={{ __html: block.data.text }}
          />
        );
      case 'code':
        return (
          <div className="my-6 group/code relative">
            <div 
              className="border border-b-0 px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between"
              style={{ 
                backgroundColor: 'var(--theme-header-bg)', 
                borderColor: 'var(--theme-border-color)',
                color: 'var(--theme-text)'
              }}
            >
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
                style={customSyntaxTheme}
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
