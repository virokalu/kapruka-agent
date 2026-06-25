'use client';

import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { SendHorizontal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

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
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div className={cn(
      'flex items-end gap-2 px-3 py-2.5 rounded-2xl border bg-card transition-all duration-200',
      'focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20',
      isLoading && 'opacity-80'
    )}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search products, check delivery, place an order…"
        disabled={isLoading}
        rows={1}
        className="flex-1 resize-none bg-transparent border-0 shadow-none outline-none text-sm leading-relaxed py-0.5 text-foreground placeholder:text-muted-foreground/60 disabled:opacity-60 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-0"
      />
      <button
        onClick={handleSubmit}
        disabled={!canSend}
        aria-label="Send"
        className={cn(
          'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150',
          canSend
            ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm shadow-accent/30'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isLoading
          ? <Loader2 size={14} className="animate-spin" />
          : <SendHorizontal size={14} />
        }
      </button>
    </div>
  );
}
