// components/chat/InputBar.tsx
'use client';

import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { SendHorizontal, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
      flex items-end gap-3 p-4 rounded-2xl
      bg-muted border border-border
      focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all duration-150
    ">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search products, check delivery, or ask anything..."
        disabled={isLoading}
        placeholder="Ask me to find products, check delivery, or place an order…"
        rows={1}
        className="
          resize-none bg-transparent border-0 outline-none
          text-foreground placeholder:text-muted-foreground
          text-sm leading-relaxed py-0 max-h-40 overflow-y-auto
          disabled:opacity-50 focus:ring-0 focus-visible:ring-0
        "
      />
      <Button
        onClick={handleSubmit}
        disabled={!value.trim() || isLoading}
        size="icon"
        className={cn(
          'shrink-0 rounded-xl transition-all duration-150',
          value.trim() && !isLoading
            ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
            : 'bg-muted-foreground/20 text-muted-foreground cursor-not-allowed'
        )}
      >
        {isLoading
          ? <Loader2 size={16} className="animate-spin" />
          : <SendHorizontal size={16} />
        }
      </Button>
    </div>
  );
}