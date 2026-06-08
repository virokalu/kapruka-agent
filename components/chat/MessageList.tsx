// components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { UIMessage } from 'ai';
import { Loader2, Search, Truck, ShoppingCart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

// Phase 4 cards — placeholder stubs until Phase 4
import ProductGrid from '@/components/kapruka/ProductGrid';
import DeliveryQuote from '@/components/kapruka/DeliveryQuote';
import CheckoutPanel from '@/components/kapruka/CheckoutPanel';

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
              <AvatarFallback className="bg-linear-to-br from-accent to-accent/60 border border-accent text-lg font-bold">
                <ShoppingCart size={20} className="text-accent-foreground" />
              </AvatarFallback>
            </Avatar>
          )}

          <div className={cn(
            'flex flex-col gap-2 max-w-[80%]',
            message.role === 'user' && 'items-end'
          )}>
            {message.parts.map((part, i) => {
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

      {/* Typing indicator */}
      {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
        <div className="flex gap-3 justify-start">
          <Avatar className="shrink-0">
            <AvatarFallback className="bg-linear-to-br from-accent to-accent/60 border border-accent text-lg font-bold">
              <ShoppingCart size={20} className="text-accent-foreground" />
            </AvatarFallback>
          </Avatar>
          <Card className="bg-card border-border rounded-bl-none px-4 py-3">
            <div className="flex gap-1.5 items-center h-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}