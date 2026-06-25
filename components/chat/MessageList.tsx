'use client';

import { useEffect, useRef } from 'react';
import { UIMessage } from 'ai';
import { Search, Truck, ShoppingCart, Sparkles, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import ProductGrid from '@/components/kapruka/ProductGrid';
import DeliveryQuote from '@/components/kapruka/DeliveryQuote';
import CheckoutPanel from '@/components/kapruka/CheckoutPanel';
import { detectOrderFormNeeded } from '@/components/kapruka/OrderFormModal';

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  onOrderForm: () => void;
}

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
      ? { label: 'Searching catalog…',   Icon: Search,       color: 'text-blue-400'    }
      : toolName?.includes('delivery') || toolName?.includes('check')
      ? { label: 'Checking delivery…',   Icon: Truck,        color: 'text-emerald-400' }
      : toolName?.includes('order') || toolName?.includes('checkout')
      ? { label: 'Creating order…',      Icon: ShoppingCart, color: 'text-accent'      }
      : { label: 'Working…',             Icon: Sparkles,     color: 'text-purple-400'  };

    return (
      <div className={cn(
        'flex items-center gap-2 text-xs py-2 px-3 rounded-xl border',
        'bg-muted/50 border-border',
        cfg.color
      )}>
        <cfg.Icon size={13} className={cn('animate-spin', cfg.color)} />
        <span className="text-muted-foreground">{cfg.label}</span>
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
    if (toolName?.includes('search'))                                       return <ProductGrid data={output} />;
    if (toolName?.includes('delivery') || toolName?.includes('check'))      return <DeliveryQuote data={output} />;
    if (toolName?.includes('order') || toolName?.includes('checkout'))      return <CheckoutPanel data={output} />;

    return (
      <div className="text-xs text-muted-foreground bg-muted rounded-xl p-3 font-mono overflow-x-auto">
        <pre>{JSON.stringify(output, null, 2)}</pre>
      </div>
    );
  }

  return null;
}

/** Render assistant text with richer formatting for bold/bullets */
function AssistantText({ text, isOrderPrompt, onOrderForm }: {
  text: string;
  isOrderPrompt: boolean;
  onOrderForm: () => void;
}) {
  const lines = text.split('\n');

  return (
    <div className="text-sm leading-relaxed text-foreground space-y-1">
      {lines.map((line, i) => {
        const isBullet = /^[ \t]*[-*•][ \t]+/.test(line);
        const content = line.replace(/^[ \t]*[-*•][ \t]+/, '');

        // Bold inline **text**
        const formatted = (str: string) => {
          const parts = str.split(/\*\*(.+?)\*\*/g);
          return parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} className="font-semibold text-foreground">{part}</strong>
              : <span key={j}>{part}</span>
          );
        };

        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              <span>{formatted(content)}</span>
            </div>
          );
        }

        return line.trim()
          ? <p key={i}>{formatted(line)}</p>
          : <div key={i} className="h-1" />;
      })}

      {isOrderPrompt && (
        <button
          onClick={onOrderForm}
          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-all shadow-sm shadow-accent/25"
        >
          <ClipboardList size={13} />
          Fill in Order Details
        </button>
      )}
    </div>
  );
}

export default function MessageList({ messages, isLoading, onOrderForm }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-4 py-6 px-4">
      {messages.map(message => {
        const isUser = message.role === 'user';

        // Check if the full assistant message is an order prompt
        const fullText = !isUser
          ? (message.parts as MessagePart[])
              .filter(p => p.type === 'text')
              .map(p => ('text' in p ? (p as { text: string }).text : ''))
              .join(' ')
          : '';
        const isOrderPrompt = !isUser && detectOrderFormNeeded(fullText);

        return (
          <div
            key={message.id}
            className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}
          >
            {/* Assistant avatar */}
            {!isUser && (
              <Avatar className="shrink-0 mt-0.5 w-7 h-7">
                <AvatarFallback className="bg-violet-500/15 border border-violet-500/30 text-violet-400">
                  <Sparkles size={13} />
                </AvatarFallback>
              </Avatar>
            )}

            <div className={cn(
              'flex flex-col gap-2',
              isUser ? 'items-end max-w-[78%]' : 'items-start w-full max-w-[92%]'
            )}>
              {buildRenderParts(message).map((part, i) => {
                if (part.type === 'text') {
                  const text = 'text' in part ? (part as { text: string }).text : '';
                  if (!text) return null;

                  if (isUser) {
                    return (
                      <div key={i} className={cn(
                        'px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed',
                        'bg-accent text-accent-foreground shadow-sm shadow-accent/20',
                      )}>
                        <p className="whitespace-pre-wrap">{text}</p>
                      </div>
                    );
                  }

                  // Distinguish order-prompt bubbles vs normal assistant bubbles
                  return (
                    <div key={i} className={cn(
                      'px-4 py-3 rounded-2xl rounded-tl-sm border text-sm leading-relaxed',
                      isOrderPrompt
                        ? 'bg-amber-500/8 border-amber-500/25 shadow-sm shadow-amber-500/10'
                        : 'bg-card border-border',
                    )}>
                      <AssistantText
                        text={text}
                        isOrderPrompt={isOrderPrompt}
                        onOrderForm={onOrderForm}
                      />
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
                  return i > 0 ? <Separator key={i} className="my-1 opacity-30" /> : null;
                }

                return null;
              })}
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {(() => {
        const last = messages[messages.length - 1];
        const show = isLoading && (!last || last.role !== 'assistant' || !(last.parts as MessagePart[]).some(p => p.type === 'text' && ('text' in p) && (p as { text: string }).text));
        if (!show) return null;
        return (
          <div className="flex gap-2.5 justify-start">
            <Avatar className="shrink-0 w-7 h-7">
              <AvatarFallback className="bg-violet-500/15 border border-violet-500/30 text-violet-400">
                <Sparkles size={13} />
              </AvatarFallback>
            </Avatar>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-bounce"
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
