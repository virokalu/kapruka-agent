// components/chat/InputBar.tsx
'use client';

import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputBarProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export default function InputBar({ onSend, isLoading }: InputBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="
      flex items-end gap-3 p-3 rounded-2xl
      bg-[var(--bg-input)] border border-[var(--border)]
      focus-within:border-[var(--accent)] transition-colors duration-150
    ">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder="Ask me to find products, check delivery, or place an order…"
        rows={1}
        className="
          flex-1 resize-none bg-transparent outline-none
          text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
          text-sm leading-relaxed py-1 max-h-40 overflow-y-auto
          disabled:opacity-50
        "
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isLoading}
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150',
          value.trim() && !isLoading
            ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
        )}
      >
        {isLoading
          ? <Loader2 size={15} className="animate-spin" />
          : <Send size={15} />
        }
      </button>
    </div>
  );
}