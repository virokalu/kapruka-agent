'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback, useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import InputBar from './InputBar';
import SuggestedPrompts from './SuggestedPrompts';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import OrderFormModal, { detectOrderFormNeeded, type OrderFormData } from '@/components/kapruka/OrderFormModal';
import DeliveryCheckModal, { type DeliveryCheckData } from '@/components/kapruka/DeliveryCheckModal';
import ProductDetailModal, { type ProductDetail } from '@/components/kapruka/ProductDetailModal';
import type { KaprukProduct } from '@/components/kapruka/ProductGrid';

// Parse "I want to order ..." message from the Order Now button
function parseOrderNowMsg(msg: string) {
  const m = msg.match(/I want to order "(.+?)"(?: \(([^)]+)\))?(?:\s*—\s*product ID ([^\s.]+))?/i);
  return m ? { name: m[1], price: m[2] ?? '', id: m[3] ?? '' } : null;
}

export default function ChatShell() {
  // Order form (personal details — name, phone, address)
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [lastOrderForm, setLastOrderForm] = useState<OrderFormData | null>(null);

  // Delivery retry form (only opened from "Try different" button in DeliveryQuote)
  const [deliveryFormOpen, setDeliveryFormOpen]   = useState(false);
  const [deliveryInitialCity, setDeliveryInitialCity] = useState('');
  const [deliveryInitialDate, setDeliveryInitialDate] = useState('');

  // Product detail modal
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [productDetailInfo, setProductDetailInfo] = useState<{
    id?: string; name?: string; price?: number; image?: string; rawData?: unknown;
  } | null>(null);
  const lastAutoProductMsgRef = useRef('');

  const [apiError, setApiError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contextual quick-reply chips
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const lastSuggestionMsgRef = useRef('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (err) => {
      const msg = err.message.includes('429')
        ? 'Kapruka is busy right now — please wait a few seconds and try again.'
        : 'Something went wrong. Please try again.';
      setApiError(msg);
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setApiError(null), 6000);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const isEmpty   = messages.length === 0;

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || isLoading) return;
    setSuggestions([]);
    sendMessage({ text });
  }, [sendMessage, isLoading]);

  // Only auto-open the ORDER form when AI asks for personal details
  useEffect(() => {
    if (isLoading) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;

    const fullText = last.parts
      .filter(p => p.type === 'text')
      .map(p => ('text' in p ? p.text : ''))
      .join(' ');

    if (detectOrderFormNeeded(fullText)) {
      setOrderFormOpen(true);
    }

    // Auto-open product detail modal when get_product tool result arrives
    if (lastAutoProductMsgRef.current !== last.id) {
      const getProductPart = last.parts.find((p) => {
        const part = p as Record<string, unknown>;
        return part.type === 'dynamic-tool' &&
          typeof part.toolName === 'string' &&
          (part.toolName.includes('get_product') || part.toolName.includes('get_prod')) &&
          part.state === 'output-available';
      });
      if (getProductPart) {
        lastAutoProductMsgRef.current = last.id;
        const output = (getProductPart as Record<string, unknown>).output;
        setProductDetailInfo({ rawData: output });
        setProductDetailOpen(true);
      }
    }
  }, [messages, isLoading]);

  // Fetch contextual quick-reply suggestions after each AI message
  useEffect(() => {
    if (isLoading) { setSuggestions([]); return; }
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.id === lastSuggestionMsgRef.current) return;
    lastSuggestionMsgRef.current = last.id;

    // Build slim message list for the suggestions API
    const slim = messages.slice(-6).map(m => ({
      role: m.role,
      text: (m.parts as Array<{ type: string; text?: string }>)
        .filter(p => p.type === 'text' && p.text?.trim())
        .map(p => p.text ?? '')
        .join(' ')
        .slice(0, 300),
    })).filter(m => m.text);

    fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: slim }),
    })
      .then(r => r.json())
      .then(({ suggestions: s }: { suggestions: string[] }) => {
        if (Array.isArray(s)) setSuggestions(s);
      })
      .catch(() => {});
  }, [messages, isLoading]);

  // "Order Now" clicked — send directly to AI for conversational city/date collection
  const handleOrderNow = useCallback((msg: string) => {
    const product = parseOrderNowMsg(msg);
    if (product) {
      const priceStr = product.price ? ` (${product.price})` : '';
      const idStr    = product.id    ? ` — product ID ${product.id}` : '';
      sendMessage({ text: `I'd like to order "${product.name}"${priceStr}${idStr}.` });
    } else {
      sendMessage({ text: msg });
    }
  }, [sendMessage]);

  // Delivery retry form submitted (from "Try different" button in DeliveryQuote)
  const handleDeliverySubmit = useCallback((data: DeliveryCheckData) => {
    setDeliveryFormOpen(false);
    sendMessage({ text: `Please check delivery to ${data.city} on ${data.date}.` });
  }, [sendMessage]);

  // "Try a different city/date" from DeliveryQuote — open retry form pre-filled
  const openDeliveryForm = useCallback((city: string, date: string) => {
    setDeliveryInitialCity(city);
    setDeliveryInitialDate(date);
    setDeliveryFormOpen(true);
  }, []);

  // Product card "Order Now" clicked → show detail modal first
  const handleViewProduct = useCallback((product: KaprukProduct) => {
    const priceVal = typeof product.price === 'number' ? product.price : (product.price as { amount?: number })?.amount ?? 0;
    setProductDetailInfo({ id: product.id, name: product.name, price: priceVal, image: product.image ?? product.imageUrl ?? product.image_url });
    setProductDetailOpen(true);
  }, []);

  // "Order Now" pressed inside ProductDetailModal → send to AI directly
  const handleProductDetailOrder = useCallback((product: ProductDetail) => {
    const priceVal = typeof product.price === 'number' ? product.price : (product.price as { amount?: number })?.amount ?? 0;
    const priceStr = priceVal ? ` (LKR ${priceVal.toLocaleString()})` : '';
    sendMessage({ text: `I'd like to order "${product.name ?? ''}"${priceStr}${product.id ? ` — product ID ${product.id}` : ''}.` });
  }, [sendMessage]);

  // Order form submitted
  const handleOrderSubmit = useCallback((data: OrderFormData) => {
    setLastOrderForm(data);
    setOrderFormOpen(false);
    const address = [data.streetAddress, data.deliveryCity].filter(Boolean).join(', ');
    const lines = [
      `Here are the order details:`,
      `- Recipient's Full Name: ${data.recipientName}`,
      `- Recipient's Phone Number: ${data.recipientPhone}`,
      `- Delivery City: ${data.deliveryCity}`,
      `- Delivery Address: ${address}`,
      `- Desired Delivery Date: ${data.deliveryDate}`,
      `- My Name (Sender): ${data.senderName}`,
      data.giftMessage ? `- Gift Message: ${data.giftMessage}` : `- Gift Message: (none)`,
    ];
    handleSend(lines.join('\n'));
  }, [handleSend]);

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

          <ThemeSwitcher />
        </header>

        {/* Messages + overlaid suggestions */}
        <div className="flex-1 relative overflow-hidden">
          <main className="h-full overflow-y-auto">
            {isEmpty
              ? <SuggestedPrompts onSelect={handleSend} />
              : <MessageList
                  messages={messages}
                  isLoading={isLoading}
                  onOrderForm={() => setOrderFormOpen(true)}
                  onDeliveryForm={openDeliveryForm}
                  onSend={handleSend}
                  onOrderNow={handleOrderNow}
                  onViewProduct={handleViewProduct}
                  lastOrderForm={lastOrderForm}
                />
            }
          </main>

          {/* Suggestions overlaid at the bottom of the chat */}
          {suggestions.length > 0 && !isLoading && (
            <div className="absolute bottom-0 left-0 right-0 px-4 pt-10 pb-3 flex flex-col gap-1.5 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, hsl(var(--background) / 0.85) 40%)' }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { handleSend(s); setSuggestions([]); }}
                  className="pointer-events-auto self-start text-left text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm border transition-all duration-150 active:scale-95"
                  style={{
                    background: 'transparent',
                    borderColor: 'hsl(var(--accent) / 0.45)',
                    color: 'hsl(var(--accent))',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(var(--accent) / 0.85)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--accent) / 0.06)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(var(--accent) / 0.45)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error toast */}
        {apiError && (
          <div className="shrink-0 mx-4 mb-2 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium">
            <AlertCircle size={13} className="shrink-0" />
            {apiError}
          </div>
        )}

        {/* Input */}
        <footer className="shrink-0 px-4 pb-4 pt-2 border-t border-border bg-card/80 backdrop-blur-md">
          <InputBar onSend={handleSend} isLoading={isLoading} onType={() => setSuggestions([])} />
          <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
            Gemini 2.5 Flash Lite · Kapruka MCP · Vercel AI SDK v5
          </p>
        </footer>

      </div>

      {/* Order form popup — collects personal details only */}
      <OrderFormModal
        open={orderFormOpen}
        onClose={() => setOrderFormOpen(false)}
        onSubmit={handleOrderSubmit}
      />

      {/* Delivery check popup */}
      <DeliveryCheckModal
        open={deliveryFormOpen}
        onClose={() => setDeliveryFormOpen(false)}
        onSubmit={handleDeliverySubmit}
        initialCity={deliveryInitialCity}
        initialDate={deliveryInitialDate}
      />

      {/* Product detail popup */}
      <ProductDetailModal
        open={productDetailOpen}
        onClose={() => setProductDetailOpen(false)}
        onOrder={handleProductDetailOrder}
        rawData={productDetailInfo?.rawData}
        productId={productDetailInfo?.id}
        productName={productDetailInfo?.name}
        productPrice={productDetailInfo?.price}
        productImage={productDetailInfo?.image}
      />
    </div>
  );
}
