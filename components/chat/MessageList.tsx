'use client';

import { useEffect, useRef } from 'react';
import { UIMessage } from 'ai';
import { Search, Truck, ShoppingCart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import ProductGrid from '@/components/kapruka/ProductGrid';
import DeliveryQuote from '@/components/kapruka/DeliveryQuote';
import CheckoutPanel from '@/components/kapruka/CheckoutPanel';

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
}

/**
 * Splits a text part around the first markdown bullet list (≥2 lines).
 * Returns null when no list is found.
 */
function splitAroundList(text: string): { intro: string; outro: string } | null {
  const bulletStart = text.search(/\n[ \t]*[-*][ \t]+/);
  if (bulletStart === -1) return null;

  const afterBullets = text.slice(bulletStart + 1);
  const endMatch = afterBullets.match(/\n(?![ \t]*[-*][ \t])/);
  const bulletEnd = endMatch
    ? bulletStart + 1 + (endMatch.index ?? afterBullets.length)
    : text.length;

  const listLines = text.slice(bulletStart, bulletEnd)
    .split('\n').filter(l => /^[ \t]*[-*][ \t]+/.test(l));
  if (listLines.length < 2) return null;

  return {
    intro: text.slice(0, bulletStart).trim(),
    outro: text.slice(bulletEnd).trim(),
  };
}

type MessagePart = UIMessage['parts'][number];

function buildRenderParts(message: UIMessage): MessagePart[] {
  if (message.role !== 'assistant') return message.parts as MessagePart[];

  const parts = message.parts as MessagePart[];
  const toolParts = parts.filter(p => p.type === 'dynamic-tool');
  if (toolParts.length === 0) return parts;

  const result: MessagePart[] = [];
  let toolsSeenCount = 0;
  let toolsInjectedInline = false;

  for (const part of parts) {
    if (part.type === 'dynamic-tool') {
      if (!toolsInjectedInline) { result.push(part); toolsSeenCount++; }
      continue;
    }

    if (part.type === 'text' && 'text' in part && part.text) {
      const split = splitAroundList(part.text);
      if (split) {
        if (split.intro) result.push({ type: 'text', text: split.intro } as MessagePart);
        if (toolsSeenCount === 0 && !toolsInjectedInline) {
          for (const tp of toolParts) result.push(tp);
          toolsInjectedInline = true;
        }
        if (split.outro) result.push({ type: 'text', text: split.outro } as MessagePart);
        continue;
      }
    }

    result.push(part);
  }

  return result;
}

function ToolPartRenderer({ part }: {
  part: { type: string; toolName?: string; state: string; input?: unknown; output?: unknown; errorText?: string }
}) {
  const { toolName, state, output, errorText } = part;

  if (state === 'input-streaming' || state === 'input-available') {
    const cfg = toolName?.includes('search')
      ? { label: 'Searching catalog…', Icon: Search }
      : toolName?.includes('delivery') || toolName?.includes('check')
      ? { label: 'Checking delivery…', Icon: Truck }
      : toolName?.includes('order') || toolName?.includes('checkout')
      ? { label: 'Creating order…', Icon: ShoppingCart }
      : { label: 'Working…', Icon: Sparkles };

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1.5 px-1">
        <cfg.Icon size={13} className="animate-spin text-accent" />
        <span>{cfg.label}</span>
      </div>
    );
  }

  if (state === 'output-error') {
    return (
      <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
        {errorText ?? 'Tool error'}
      </div>
    );
  }

  if (state === 'output-available') {
    if (toolName?.includes('search'))   return <ProductGrid data={output} />;
    if (toolName?.includes('delivery') || toolName?.includes('check')) return <DeliveryQuote data={output} />;
    if (toolName?.includes('order') || toolName?.includes('checkout')) return <CheckoutPanel data={output} />;

    return (
      <div className="text-xs text-muted-foreground bg-muted rounded-xl p-3 font-mono overflow-x-auto">
        <pre>{JSON.stringify(output, null, 2)}</pre>
      </div>
    );
  }

  return null;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-5 py-6 px-4">
      {messages.map(message => (
        <div
          key={message.id}
          className={cn('flex gap-2.5', message.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          {/* Assistant avatar */}
          {message.role === 'assistant' && (
            <Avatar className="shrink-0 mt-0.5 w-7 h-7">
              <AvatarFallback className="bg-accent/15 border border-accent/30 text-accent">
                <Sparkles size={13} />
              </AvatarFallback>
            </Avatar>
          )}

          <div className={cn(
            'flex flex-col gap-2',
            message.role === 'user' ? 'items-end max-w-[75%]' : 'items-start w-full max-w-[92%]'
          )}>
            {buildRenderParts(message).map((part, i) => {
              if (part.type === 'text') {
                const text = 'text' in part ? part.text : '';
                if (!text) return null;

                if (message.role === 'user') {
                  return (
                    <div key={i} className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-accent text-accent-foreground text-sm leading-relaxed">
                      <p className="whitespace-pre-wrap">{text}</p>
                    </div>
                  );
                }

                return (
                  <div key={i} className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-card border border-border text-sm leading-relaxed text-foreground">
                    <p className="whitespace-pre-wrap">{text}</p>
                  </div>
                );
              }

              if (part.type === 'dynamic-tool') {
                return (
                  <div key={i} className="w-full">
                    <ToolPartRenderer part={part as Parameters<typeof ToolPartRenderer>[0]['part']} />
                  </div>
                );
              }

              if (part.type === 'step-start') {
                return i > 0 ? <Separator key={i} className="my-1 opacity-50" /> : null;
              }

              return null;
            })}
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {(() => {
        const last = messages[messages.length - 1];
        const show = isLoading && (!last || last.role !== 'assistant' || !last.parts.some(p => p.type === 'text' && (p as { text?: string }).text));
        if (!show) return null;
        return (
          <div className="flex gap-2.5 justify-start">
            <Avatar className="shrink-0 w-7 h-7">
              <AvatarFallback className="bg-accent/15 border border-accent/30 text-accent">
                <Sparkles size={13} />
              </AvatarFallback>
            </Avatar>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <div ref={bottomRef} />
    </div>
  );
}
