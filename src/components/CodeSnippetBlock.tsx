import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Code2 } from 'lucide-react';

interface CodeSnippetBlockProps {
  snippet: {
    title: string;
    language: string;
    code: string;
  };
  language?: 'tr' | 'en';
}

export const CodeSnippetBlock: React.FC<CodeSnippetBlockProps> = ({ snippet, language = 'tr' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawCode = snippet.code || '';
  const isTruncatable = rawCode.length > 200;
  const displayedCode = !isTruncatable || isExpanded ? rawCode : rawCode.slice(0, 200) + '\n...';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-2xl space-y-2 font-mono relative overflow-hidden group">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800/60 pb-2">
        <div className="flex items-center gap-2 truncate">
          <Code2 className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          <span className="font-semibold text-zinc-200 truncate">{snippet.title || 'Snippet'}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-mono font-medium">
            {snippet.language || 'Code'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            title={language === 'tr' ? 'Kodu Kopyala' : 'Copy Code'}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative">
        <pre className="text-xs text-emerald-400/90 overflow-x-auto p-1 leading-relaxed whitespace-pre font-mono select-text">
          <code>{displayedCode}</code>
        </pre>
      </div>

      {isTruncatable && (
        <div className="pt-1 border-t border-zinc-800/40 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono">
            {isExpanded
              ? `${rawCode.length} ${language === 'tr' ? 'karakter gösteriliyor' : 'chars displayed'}`
              : `200 / ${rawCode.length} ${language === 'tr' ? 'karakter' : 'chars'}`}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white font-mono flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 text-zinc-400" />
                <span>{language === 'tr' ? 'Daha Az Göster' : 'Show Less'}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
                <span>
                  {language === 'tr'
                    ? `Dahasını Göster (+${rawCode.length - 200})`
                    : `Show More (+${rawCode.length - 200})`}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
