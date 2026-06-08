// components/chat/ChatShell.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback, useState } from 'react';
import MessageList from './MessageList';
import InputBar from './InputBar';
import SuggestedPrompts from './SuggestedPrompts';
import { Card } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ModeSwitcher, type ShoppingMode } from '@/components/ModeSwitcher';

export default function ChatShell() {
  const [mode, setMode] = useState<ShoppingMode>('search');
  
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
      // Prepend mode context to the message
      const modeContext = mode === 'quick' 
        ? '[Quick Order Mode] '
        : mode === 'delivery'
        ? '[Delivery & Tracking Mode] '
        : '';
      sendMessage({ text: modeContext + text });
    }
  }, [sendMessage, isLoading, mode]);

  return (
    <div className="h-screen flex flex-col bg-background">

      {/* Header */}
      <header className="
        shrink-0 flex items-center justify-between gap-4 px-4 py-3
        border-b border-border bg-card
      ">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl font-bold bg-linear-to-r from-accent to-accent/70 bg-clip-text text-transparent">
            ✨
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-none">
              Kapruka Agent
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-powered shopping for Sri Lanka
            </p>
          </div>
          <div className="ml-2 flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Live</span>
          </div>
        </div>
        
        <ModeSwitcher currentMode={mode} onModeChange={setMode} />
        
        <ThemeSwitcher />
      </header>

      {/* Message area */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        {isEmpty
          ? <SuggestedPrompts onSelect={handleSend} />
          : <MessageList messages={messages} isLoading={isLoading} />
        }
      </main>

      {/* Input */}
      <footer className="shrink-0 p-4 border-t border-border bg-card">
        <div className="max-w-3xl mx-auto">
          <InputBar
            onSend={handleSend}
            isLoading={isLoading}
          />
          <p className="text-center text-xs text-muted-foreground mt-3">
            Powered by Gemini · Kapruka MCP · Vercel AI SDK v5
          </p>
        </div>
      </footer>

    </div>
  );
}