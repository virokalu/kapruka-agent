// components/chat/ChatShell.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback } from 'react';
import MessageList from './MessageList';
import InputBar from './InputBar';
import SuggestedPrompts from './SuggestedPrompts';

export default function ChatShell() {
  /**
   * v5 useChat changes:
   *
   * 1. Import is now from '@ai-sdk/react', not 'ai/react'
   *
   * 2. transport: new DefaultChatTransport({ api }) replaces the bare api: string.
   *    This abstraction allows swapping transports (WebSocket, custom) without
   *    changing the hook's usage — a cleaner separation of concerns.
   *
   * 3. sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls
   *    Replaces manual re-submission logic. After every tool result is received,
   *    the SDK automatically sends the updated message back to /api/chat
   *    so Gemini can continue the agentic loop. Without this, the loop stops
   *    after the first tool call and never generates a final text response.
   *
   * 4. sendMessage({ text }) replaces handleSubmit(event).
   *    More explicit, works without a form element.
   *
   * 5. messages now have a `parts` array instead of `toolInvocations`.
   */
  const {
    messages,
    sendMessage,
    status,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const isEmpty = messages.length === 0;

  const handleSend = useCallback((text: string) => {
    if (text.trim() && !isLoading) {
      sendMessage({ text });
    }
  }, [sendMessage, isLoading]);

  return (
    <div className="h-screen flex flex-col bg-(--bg-base)">

      {/* Header */}
      <header className="
        shrink-0 flex items-center gap-3 px-5 py-3
        border-b border-(--border) bg-(--bg-surface)
      ">
        <span className="text-xl">🛍️</span>
        <div>
          <h1 className="text-sm font-semibold text-(--text-primary) leading-none">
            Kapruka Agent
          </h1>
          <p className="text-xs text-(--text-muted) mt-0.5">
            AI-powered shopping for Sri Lanka
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-(--text-muted)">Live</span>
        </div>
      </header>

      {/* Message area */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        {isEmpty
          ? <SuggestedPrompts onSelect={handleSend} />
          : <MessageList messages={messages} isLoading={isLoading} />
        }
      </main>

      {/* Input */}
      <footer className="shrink-0 p-4 border-t border-(--border) bg-(--bg-surface)">
        <div className="max-w-3xl mx-auto">
          <InputBar
            onSend={handleSend}
            isLoading={isLoading}
          />
          <p className="text-center text-xs text-(--text-muted) mt-2">
            Powered by Gemini · Kapruka MCP · Vercel AI SDK v5
          </p>
        </div>
      </footer>

    </div>
  );
}