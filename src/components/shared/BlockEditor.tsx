import React, { useRef, useEffect } from 'react';

interface BlockEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  onFocus?: () => void;
  placeholder?: string;
}

export const BlockEditor = React.memo(({ 
  initialContent, 
  onChange,
  onFocus,
  placeholder = "Start typing..."
}: BlockEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastContent = useRef(initialContent);

  useEffect(() => {
    if (editorRef.current && initialContent !== editorRef.current.innerHTML) {
      // Only update if the change is external (not from our own input)
      if (initialContent !== lastContent.current) {
        editorRef.current.innerHTML = initialContent;
        lastContent.current = initialContent;
      }
    }
  }, [initialContent]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    lastContent.current = content;
    onChange(content);
  };

  return (
    <div 
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onFocus={onFocus}
      className="w-full bg-black/20 border border-hw-blue/10 p-3 outline-none text-[11px] text-hw-blue/90 min-h-[100px] prose prose-invert prose-sm max-w-none focus:border-hw-blue/40 transition-colors"
      dangerouslySetInnerHTML={{ __html: initialContent }}
      style={{ caretColor: '#00f2ff' }}
      data-placeholder={placeholder}
    />
  );
});
