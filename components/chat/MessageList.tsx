// components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { UIMessage } from 'ai';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Phase 4 cards — placeholder stubs until Phase 4
import ProductGrid from '@/components/kapruka/ProductGrid';
import DeliveryQuote from '@/components/kapruka/DeliveryQuote';
import CheckoutPanel from '@/components/kapruka/CheckoutPanel';

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
}

/**
 * ToolPartRenderer
 *
 * v5 tool parts work completely differently from v4 toolInvocations.
 *
 * Each tool call becomes a typed part on the message: `tool-${toolName}`.
 * Because our Kapruka tools come from MCP (dynamic tools), they arrive
 * as `dynamic-tool` parts — not `tool-searchCatalog` etc.
 *
 * Each part has a `state` field with four possible values:
 *   input-streaming  → tool call is being generated (show skeleton)
 *   input-available  → tool call complete, awaiting execution result
 *   output-available → tool executed, result ready (render the card)
 *   output-error     → tool execution failed (show error)
 */
function ToolPartRenderer({ part }: { part: { type: string; toolName?: string; state: string; input?: unknown; output?: unknown; errorText?: string; toolCallId?: string } }) {
  const { toolName, state, input, output, errorText } = part;

  // Streaming or awaiting result — show a contextual loading message
  if (state === 'input-streaming' || state === 'input-available') {
    const label =
      toolName?.includes('search') ? 'Searching Kapruka catalog…'
      : toolName?.includes('delivery') || toolName?.includes('quote') ? 'Fetching delivery quote…'
      : toolName?.includes('checkout') ? 'Creating your order…'
      : 'Working…';

    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-2">
        <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
        <span>{label}</span>
      </div>
    );
  }

  if (state === 'output-error') {
    return (
      <div className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-xl px-4 py-3">
        Tool error: {errorText ?? 'Unknown error'}
      </div>
    );
  }

  // output-available — dispatch to the right card based on tool name
  if (state === 'output-available') {
    if (toolName?.includes('search')) return <ProductGrid data={output} />;
    if (toolName?.includes('delivery') || toolName?.includes('quote')) return <DeliveryQuote data={output} />;
    if (toolName?.includes('checkout')) return <CheckoutPanel data={output} />;

    // Fallback for any other MCP tool
    return (
      <pre className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] p-3 rounded-xl overflow-x-auto">
        {JSON.stringify(output, null, 2)}
      </pre>
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
            <div className="
              flex-shrink-0 w-7 h-7 rounded-full
              bg-[var(--accent-subtle)] border border-[var(--accent)]
              flex items-center justify-center text-xs mt-1
            ">
              🛍️
            </div>
          )}

          <div className={cn(
            'flex flex-col gap-2 max-w-[80%]',
            message.role === 'user' && 'items-end'
          )}>
            {/**
             * v5: iterate message.parts instead of checking message.content + toolInvocations.
             * Each part has a `type` that tells us what to render.
             */}
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return part.text ? (
                    <div
                      key={i}
                      className={cn(
                        'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                        message.role === 'user'
                          ? 'bg-[var(--accent)] text-white rounded-br-sm'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-sm border border-[var(--border-subtle)]'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{part.text}</p>
                    </div>
                  ) : null;

                case 'dynamic-tool':
                  /**
                   * MCP tools from schema discovery arrive as 'dynamic-tool' parts.
                   * We pass the full part down and inspect toolName inside the renderer.
                   */
                  return (
                    <div key={i} className="w-full max-w-2xl">
                      <ToolPartRenderer part={part as Parameters<typeof ToolPartRenderer>[0]['part']} />
                    </div>
                  );

                case 'step-start':
                  // Show a subtle divider between agentic loop steps
                  return i > 0 ? (
                    <hr key={i} className="border-[var(--border-subtle)] my-1" />
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
          <div className="
            flex-shrink-0 w-7 h-7 rounded-full
            bg-[var(--accent-subtle)] border border-[var(--accent)]
            flex items-center justify-center text-xs
          ">
            🛍️
          </div>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl rounded-bl-sm px-4 py-3">
            <div className="flex gap-1 items-center h-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}