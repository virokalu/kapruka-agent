// components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { UIMessage } from 'ai';
import { Search, Truck, ShoppingCart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

/**
 * Splits a text string into [intro, outro] around the first markdown bullet list block.
 * Returns null when no list is present.
 * Used as a fallback when the AI includes product listings in its text despite the system prompt.
 */
function splitAroundList(text: string): { intro: string; outro: string } | null {
  // Match a block of consecutive bullet lines (- or * prefixed)
  const match = text.match(/^([\s\S]*?)(\n[ \t]*[-*][ \t]+[\s\S]*?)(\n[ \t]*[^-*\s][\s\S]*)?$/m);
  if (!match) return null;

  // Look for the first bullet line position
  const bulletStart = text.search(/\n[ \t]*[-*][ \t]+/);
  if (bulletStart === -1) return null;

  // Find where the bullet block ends (first line that doesn't start with - or *)
  const afterBullets = text.slice(bulletStart + 1);
  const endMatch = afterBullets.match(/\n(?![ \t]*[-*][ \t])/);
  const bulletEnd = endMatch
    ? bulletStart + 1 + (endMatch.index ?? afterBullets.length)
    : text.length;

  const intro = text.slice(0, bulletStart).trim();
  const outro = text.slice(bulletEnd).trim();

  // Only split if there's actually a list (not just a single dash in prose)
  const listLines = text.slice(bulletStart, bulletEnd).split('\n').filter(l => /^[ \t]*[-*][ \t]+/.test(l));
  if (listLines.length < 2) return null;

  return { intro, outro };
}

import ProductGrid from '@/components/kapruka/ProductGrid';
import DeliveryQuote from '@/components/kapruka/DeliveryQuote';
import CheckoutPanel from '@/components/kapruka/CheckoutPanel';

type MessagePart = UIMessage['parts'][number];

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
}

function ToolPartRenderer({ part }: { part: { type: string; toolName?: string; state: string; input?: unknown; output?: unknown; errorText?: string; toolCallId?: string } }) {
  const { toolName, state, input, output, errorText } = part;

  // Streaming or awaiting result — show a contextual loading message
  if (state === 'input-streaming' || state === 'input-available') {
    const config = toolName?.includes('search') ? { label: 'Searching Kapruka catalog…', Icon: Search }
      : toolName?.includes('delivery') || toolName?.includes('quote') ? { label: 'Fetching delivery quote…', Icon: Truck }
      : toolName?.includes('checkout') ? { label: 'Creating your order…', Icon: ShoppingCart }
      : { label: 'Working…', Icon: Sparkles };

    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <config.Icon size={14} className="animate-spin text-accent" />
        <span>{config.label}</span>
      </div>
    );
  }

  if (state === 'output-error') {
    return (
      <Card className="text-sm text-destructive bg-destructive/10 border-destructive/30 px-4 py-3">
        Tool error: {errorText ?? 'Unknown error'}
      </Card>
    );
  }

  // output-available — dispatch to the right card based on tool name
  if (state === 'output-available') {
    if (toolName?.includes('search')) return <ProductGrid data={output} />;
    if (toolName?.includes('delivery') || toolName?.includes('quote')) return <DeliveryQuote data={output} />;
    if (toolName?.includes('checkout')) return <CheckoutPanel data={output} />;

    // Fallback for any other MCP tool
    return (
      <Card className="text-xs text-muted-foreground p-3">
        <pre className="overflow-x-auto">
          {JSON.stringify(output, null, 2)}
        </pre>
      </Card>
    );
  }

  return null;
}

/**
 * Builds the final ordered list of render parts for an assistant message.
 *
 * Problem: the AI sometimes writes one big text blob containing intro + markdown
 * product list + outro, then appends tool call parts separately — causing duplicate
 * product display and wrong ordering.
 *
 * This function detects that pattern and rewrites the parts to:
 *   intro text → tool output cards → outro text
 *
 * If the AI already structured parts correctly (text → tool → text) the function
 * returns parts unchanged.
 */
function buildRenderParts(message: UIMessage): MessagePart[] {
  if (message.role !== 'assistant') return message.parts as MessagePart[];

  const parts = message.parts as MessagePart[];
  const toolParts = parts.filter(p => p.type === 'dynamic-tool');
  if (toolParts.length === 0) return parts;

  const result: MessagePart[] = [];
  let toolsSeenBeforeText = 0; // how many tool parts appeared before current text part
  let toolsInjectedInline = false;

  for (const part of parts) {
    if (part.type === 'dynamic-tool') {
      // If we already injected tools inline (inside a split text), skip this duplicate.
      if (!toolsInjectedInline) {
        result.push(part);
        toolsSeenBeforeText++;
      }
      continue;
    }

    if (part.type === 'text' && 'text' in part && part.text) {
      const split = splitAroundList(part.text);

      if (split) {
        // This text part contains a product list. Suppress the list and
        // ensure tool cards appear between intro and outro.
        if (split.intro) result.push({ type: 'text', text: split.intro } as MessagePart);

        if (toolsSeenBeforeText === 0 && !toolsInjectedInline) {
          // Tools haven't appeared yet — inject them here between intro and outro.
          for (const tp of toolParts) result.push(tp);
          toolsInjectedInline = true;
        }
        // If tools were already rendered above this text, they're in the right place.

        if (split.outro) result.push({ type: 'text', text: split.outro } as MessagePart);
        continue;
      }
    }

    result.push(part);
  }

  return result;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-6 py-6 px-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <Avatar className="shrink-0 mt-1">
              <AvatarFallback className="bg-accent/10 border border-accent/40">
                <Sparkles size={16} className="text-accent" />
              </AvatarFallback>
            </Avatar>
          )}

          <div className={cn(
            'flex flex-col gap-2 max-w-[80%]',
            message.role === 'user' && 'items-end'
          )}>
            {buildRenderParts(message).map((part, i) => {
              switch (part.type) {
                case 'text':
                  return part.text ? (
                    <Card
                      key={i}
                      className={cn(
                        'px-4 py-3 text-sm leading-relaxed border',
                        message.role === 'user'
                          ? 'bg-accent text-accent-foreground rounded-br-none'
                          : 'bg-card text-foreground rounded-bl-none border-border'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{part.text}</p>
                    </Card>
                  ) : null;

                case 'dynamic-tool':
                  return (
                    <div key={i} className="w-full max-w-2xl">
                      <ToolPartRenderer part={part as Parameters<typeof ToolPartRenderer>[0]['part']} />
                    </div>
                  );

                case 'step-start':
                  return i > 0 ? (
                    <Separator key={i} className="my-2" />
                  ) : null;

                default:
                  return null;
              }
            })}
          </div>
        </div>
      ))}

      {/* Typing indicator — show when loading and no assistant text is streaming yet */}
      {(() => {
        const lastMsg = messages[messages.length - 1];
        const showTyping = isLoading && (
          !lastMsg ||
          lastMsg.role !== 'assistant' ||
          !lastMsg.parts.some(p => p.type === 'text' && (p as { text?: string }).text)
        );
        if (!showTyping) return null;
        return (
          <div className="flex gap-3 justify-start">
            <Avatar className="shrink-0">
              <AvatarFallback className="bg-accent/10 border border-accent/40">
                <Sparkles size={16} className="text-accent" />
              </AvatarFallback>
            </Avatar>
            <Card className="bg-card border-border rounded-bl-none px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </Card>
          </div>
        );
      })()}

      <div ref={bottomRef} />
    </div>
  );
}