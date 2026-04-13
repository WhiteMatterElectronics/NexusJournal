import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Tutorial, TutorialBlock } from '../types';
import { ArrowLeft, Clock, Share2, Terminal, FileText, Download, ExternalLink, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import 'highlight.js/styles/github-dark.css';

interface TutorialDetailProps {
  tutorial: Tutorial;
  onBack: () => void;
  onFlashFirmware?: (firmwareId: string) => void;
}

export const TutorialDetail: React.FC<TutorialDetailProps> = ({ tutorial, onBack, onFlashFirmware }) => {
  const attachments = tutorial.attachments ? JSON.parse(tutorial.attachments) : [];

  let blocks: TutorialBlock[] = [];
  try {
    const parsed = JSON.parse(tutorial.content);
    if (Array.isArray(parsed)) {
      blocks = parsed;
    } else {
      blocks = [{ id: 'legacy', type: 'markdown', data: { text: tutorial.content } }];
    }
  } catch {
    blocks = [{ id: 'legacy', type: 'markdown', data: { text: tutorial.content } }];
  }

  const renderBlock = (block: TutorialBlock) => {
    switch (block.type) {
      case 'markdown':
        return (
          <div className="prose prose-invert max-w-none 
            prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:text-hw-blue prose-headings:hw-glow
            prose-p:text-hw-blue/80 prose-p:leading-relaxed prose-p:text-sm
            prose-code:text-hw-blue prose-code:bg-hw-blue/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-[''] prose-code:after:content-['']
            prose-pre:bg-black/60 prose-pre:border prose-pre:border-hw-blue/20 prose-pre:p-8 prose-pre:rounded-none
            prose-li:text-hw-blue/70 prose-li:text-sm
            prose-strong:text-hw-blue prose-strong:font-bold
            prose-hr:border-hw-blue/10
            prose-img:border prose-img:border-hw-blue/20 prose-img:p-2 prose-img:bg-hw-blue/5
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
              {block.data.text}
            </ReactMarkdown>
          </div>
        );
      case 'code':
        return (
          <div className="my-6">
            <div className="bg-hw-blue/10 border-b border-hw-blue/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              {block.data.language}
            </div>
            <pre className="bg-black/60 border border-t-0 border-hw-blue/20 p-6 overflow-x-auto text-xs font-mono text-hw-blue leading-relaxed">
              <code>{block.data.code}</code>
            </pre>
          </div>
        );
      case 'image':
        return (
          <div className="my-8">
            <img src={block.data.url} alt={block.data.caption} className="max-w-full h-auto border border-hw-blue/20 p-2 bg-hw-blue/5 mx-auto" />
            {block.data.caption && <p className="text-center text-[10px] text-hw-blue/40 mt-3 uppercase tracking-widest">{block.data.caption}</p>}
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
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-hw-blue/40 hover:text-hw-blue mb-10 transition-all text-[10px] font-bold uppercase tracking-widest group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        RETURN_TO_DATABASE
      </button>

      <header className="mb-12 border-b border-hw-blue/20 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-hw-blue uppercase tracking-widest px-3 py-1 bg-hw-blue/10 border border-hw-blue/30">
              {tutorial.category}
            </span>
            <div className="flex items-center gap-2 text-hw-blue/40 text-[10px] font-bold uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              <span>10 MIN_READ</span>
            </div>
          </div>
          {tutorial.firmwareId && onFlashFirmware && (
            <button 
              onClick={() => onFlashFirmware(tutorial.firmwareId!)}
              className="hw-button py-2 px-6 flex items-center gap-2 bg-hw-blue text-hw-black hover:bg-hw-blue/90"
            >
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">FLASH_FIRMWARE</span>
            </button>
          )}
        </div>
        <h1 className="text-5xl font-black tracking-tighter mb-6 uppercase hw-glow">{tutorial.title}</h1>
        <p className="text-lg text-hw-blue/60 leading-relaxed max-w-2xl">
          {tutorial.description}
        </p>
      </header>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-8 text-hw-blue/30">
          <Terminal className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Document_Stream // Decrypted</span>
        </div>
        
        {blocks.map(block => (
          <div key={block.id}>
            {renderBlock(block)}
          </div>
        ))}
      </div>

      {attachments.length > 0 && (
        <div className="mt-16 space-y-6">
          <div className="flex items-center gap-2 text-hw-blue/40">
            <FileText className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Linked_Resources // Attachments</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attachments.map((file: any, i: number) => (
              <a 
                key={i}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-hw-blue/5 border border-hw-blue/20 rounded-sm hover:border-hw-blue transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-hw-blue/10 flex items-center justify-center">
                    <Download className="w-4 h-4 text-hw-blue/40 group-hover:text-hw-blue transition-colors" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-tight group-hover:hw-glow transition-all">{file.name}</span>
                    <span className="text-[8px] text-hw-blue/30 uppercase">{file.type}</span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-hw-blue/20 group-hover:text-hw-blue/40 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-20 pt-10 border-t border-hw-blue/20 flex justify-between items-center">
        <div className="text-[10px] font-bold text-hw-blue/40 uppercase tracking-widest">
          Difficulty: <span className="text-hw-blue hw-glow">{tutorial.difficulty}</span>
        </div>
      </footer>
    </div>
  );
};
