'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback, useState } from 'react';
import MessageList from './MessageList';
import InputBar from './InputBar';
import SuggestedPrompts from './SuggestedPrompts';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ModeSwitcher, type ShoppingMode } from '@/components/ModeSwitcher';
import { ShoppingBag } from 'lucide-react';

export default function ChatShell() {
  const [mode, setMode] = useState<ShoppingMode>('search');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const isEmpty = messages.length === 0;

  const handleSend = useCallback((text: string) => {
    if (text.trim() && !isLoading) {
      const modeContext =
        mode === 'quick' ? '[Quick Order Mode] ' :
        mode === 'delivery' ? '[Delivery & Tracking Mode] ' : '';
      sendMessage({ text: modeContext + text });
    }
  }, [sendMessage, isLoading, mode]);

  return (
    <div className="h-screen bg-background flex justify-center">
      <div className="w-full max-w-3xl flex flex-col h-full">

        {/* Header */}
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-sm">
              <ShoppingBag size={16} className="text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none">Kapruka Agent</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">AI Shopping · Sri Lanka</p>
            </div>
            <div className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          </div>

          <ModeSwitcher currentMode={mode} onModeChange={setMode} />
          <ThemeSwitcher />
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto">
          {isEmpty
            ? <SuggestedPrompts onSelect={handleSend} />
            : <MessageList messages={messages} isLoading={isLoading} />
          }
        </main>

        {/* Input */}
        <footer className="shrink-0 px-4 pb-4 pt-2 border-t border-border bg-card/80 backdrop-blur-md">
          <InputBar onSend={handleSend} isLoading={isLoading} />
          <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
            Gemini 2.5 Flash · Kapruka MCP · Vercel AI SDK v5
          </p>
        </footer>

      </div>
    </div>
  );
}
