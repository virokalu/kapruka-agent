'use client';

import { useEffect, useRef } from 'react';
import { UIMessage } from 'ai';
import {
  Search, Truck, ShoppingCart, Sparkles, ClipboardList,
  User, Phone, MapPin, Calendar, MessageSquare,
  Package, Tag, Clock, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

import ProductGrid, { type KaprukProduct } from '@/components/kapruka/ProductGrid';
import DeliveryQuote from '@/components/kapruka/DeliveryQuote';
import CheckoutPanel from '@/components/kapruka/CheckoutPanel';
import OrderTrackingPanel from '@/components/kapruka/OrderTrackingPanel';
import { detectOrderFormNeeded, type OrderFormData } from '@/components/kapruka/OrderFormModal';

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  onOrderForm: () => void;
  onDeliveryForm: (city: string, date: string) => void;
  onSend: (msg: string) => void;
  onOrderNow: (msg: string) => void;
  onViewProduct: (product: KaprukProduct) => void;
  lastOrderForm: OrderFormData | null;
}

// ─── Part helpers ──────────────────────────────────────────────────────────────

type MessagePart = UIMessage['parts'][number];
type ToolPart = MessagePart & Record<string, unknown>;

/** Tools whose output makes the AI's verbal text 100% redundant */
const SILENT_TOOLS = ['create_order', 'checkout'];
/** Tools that should suppress outro text (but keep intro) */
const VISUAL_TOOLS = ['search_products', 'get_product', 'check_delivery', 'list_categor', 'list_delivery', 'track'];

function toolName(p: MessagePart): string {
  return ((p as ToolPart).toolName as string | undefined) ?? '';
}
function toolState(p: MessagePart): string {
  return ((p as ToolPart).state as string | undefined) ?? '';
}

function buildRenderParts(message: UIMessage): MessagePart[] {
  if (message.role !== 'assistant') return message.parts as MessagePart[];
  const parts = message.parts as MessagePart[];

  const rawTools = parts.filter(p => p.type === 'dynamic-tool');
  if (rawTools.length === 0) return parts;

  // Deduplicate: for each tool name keep only the LAST part
  const byName = new Map<string, MessagePart>();
  for (const p of rawTools) byName.set(toolName(p) || String(rawTools.indexOf(p)), p);
  const dedupedTools = [...byName.values()];

  // If a SILENT_TOOL completed successfully → return just the tool panel, no text
  const silentCompleted = dedupedTools.some(p =>
    toolState(p) === 'output-available' &&
    SILENT_TOOLS.some(s => toolName(p).includes(s))
  );
  if (silentCompleted) {
    return dedupedTools.filter(p => toolState(p) !== 'input-available' && toolState(p) !== 'input-streaming');
  }

  // Visual tools: keep intro text (before tool) but drop outro (after tool)
  const visualCompleted = dedupedTools.some(p =>
    toolState(p) === 'output-available' &&
    VISUAL_TOOLS.some(s => toolName(p).includes(s))
  );

  const result: MessagePart[] = [];
  let toolsPlaced = false;

  for (const part of parts) {
    if (part.type === 'dynamic-tool') {
      const key = toolName(part) || String(rawTools.indexOf(part));
      // Only include if this is the deduplicated version of its name
      if (byName.get(key) === part && !toolsPlaced) {
        result.push(...dedupedTools);
        toolsPlaced = true;
      }
      continue;
    }

    if (part.type === 'text' && 'text' in part) {
      const text = (part as { text: string }).text?.trim();
      if (!text) continue;
      // Drop all text that comes after a visual/silent tool's output
      if (toolsPlaced && visualCompleted) continue;
      result.push(part);
    } else {
      result.push(part);
    }
  }

  return result;
}

// ─── Inline markdown renderer ─────────────────────────────────────────────────

function renderInline(str: string): React.ReactNode[] {
  const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, j) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part))
      return <em key={j} className="italic">{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link)
      return <a key={j} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent/80 break-all">{link[1]}</a>;
    return <span key={j}>{part}</span>;
  });
}

// ─── Assistant text with bullets, numbered lists, paragraphs ─────────────────

function AssistantText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="text-sm leading-relaxed text-foreground space-y-1">
      {lines.map((line, i) => {
        const bullet   = /^[ \t]*[-*•][ \t]+/.test(line);
        const numbered = line.match(/^[ \t]*(\d+)[.)]\s+(.+)$/);
        const heading  = line.match(/^#{1,3}\s+(.+)$/);

        if (heading) return (
          <p key={i} className="font-semibold text-foreground text-base mt-1">{renderInline(heading[1])}</p>
        );

        if (numbered) return (
          <div key={i} className="flex items-start gap-2.5 py-0.5">
            <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {numbered[1]}
            </span>
            <span>{renderInline(numbered[2])}</span>
          </div>
        );

        if (bullet) {
          const content = line.replace(/^[ \t]*[-*•][ \t]+/, '');
          return (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              <span>{renderInline(content)}</span>
            </div>
          );
        }

        return line.trim() ? <p key={i}>{renderInline(line)}</p> : <div key={i} className="h-1" />;
      })}
    </div>
  );
}

// ─── User order-details card ──────────────────────────────────────────────────

const ORDER_ICONS: Record<string, React.ElementType> = {
  "Recipient's Full Name": User,
  "Recipient's Phone Number": Phone,
  "Delivery City": MapPin,
  "Delivery Address": MapPin,
  "Street / House No.": MapPin,
  "Desired Delivery Date": Calendar,
  "My Name (Sender)": User,
  "Gift Message": MessageSquare,
};

function OrderDetailsCard({ text }: { text: string }) {
  const [header, ...rest] = text.split('\n');
  const rows: { label: string; value: string }[] = [];
  for (const line of rest) {
    const m = line.match(/^-\s+(.+?):\s+(.+)$/);
    if (m) rows.push({ label: m[1].trim(), value: m[2].trim() });
  }
  return (
    <div className="rounded-2xl rounded-tr-sm overflow-hidden border border-accent/30 shadow-sm" style={{ background: 'hsl(var(--card))' }}>
      <div className="px-4 py-2.5 bg-accent text-accent-foreground">
        <p className="text-xs font-bold uppercase tracking-wider">{header}</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map(({ label, value }) => {
          const Icon = ORDER_ICONS[label] ?? User;
          return (
            <div key={label} className="flex items-start gap-3 px-4 py-2.5">
              <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={11} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-foreground truncate">{value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isOrderDetailsText(text: string) {
  return text.trimStart().startsWith('Here are the order details:');
}

// ─── "Order Now" quick-order bubble ──────────────────────────────────────────

const ORDER_NOW_RE = /^I want to order "(.+?)"(?: \(([^)]+)\))?(?:\s*—\s*product ID [^\s.]+)?[^"]*$/i;

function parseOrderNow(text: string): { name: string; price: string } | null {
  const m = text.trim().match(ORDER_NOW_RE);
  if (!m) return null;
  return { name: m[1], price: m[2] ?? '' };
}

function OrderNowBubble({ name, price }: { name: string; price: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl rounded-tr-sm border border-accent/40 shadow-sm" style={{ background: 'hsl(var(--accent) / 0.12)' }}>
      <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
        <Zap size={14} className="text-accent-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
        {price && <p className="text-[11px] text-accent font-medium">{price}</p>}
      </div>
      <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-accent px-2 py-0.5 rounded-full border border-accent/30">
        Ordering
      </span>
    </div>
  );
}

// ─── Prominent order-form prompt card ────────────────────────────────────────

function OrderPromptCard({ onOrderForm }: { onOrderForm: () => void }) {
  return (
    <div
      className="w-full rounded-2xl rounded-tl-sm border border-accent/40 overflow-hidden shadow-sm"
      style={{ background: 'hsl(40 95% 50% / 0.06)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm shrink-0">
          <ClipboardList size={16} className="text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Ready to place your order?</p>
          <p className="text-[11px] text-muted-foreground">Fill in your delivery details and we'll create the order.</p>
        </div>
        <button
          onClick={onOrderForm}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-all shadow-sm shadow-accent/20"
        >
          <ClipboardList size={12} />
          Open Form
        </button>
      </div>
    </div>
  );
}

// ─── Misc tool output renderers ───────────────────────────────────────────────

function parseMcpText(output: unknown): unknown {
  if (!output || typeof output !== 'object') return output;
  const d = output as Record<string, unknown>;
  if (Array.isArray(d.content)) {
    for (const item of d.content as Array<{ type: string; text?: string }>) {
      if (item.type === 'text' && item.text) {
        try { return JSON.parse(item.text); } catch { return item.text; }
      }
    }
  }
  if (d.structuredContent && typeof d.structuredContent === 'object') {
    const sc = d.structuredContent as Record<string, unknown>;
    if (typeof sc.result === 'string') {
      try { return JSON.parse(sc.result); } catch { /* noop */ }
    }
  }
  return output;
}


function CategoryList({ data }: { data: unknown }) {
  const parsed = parseMcpText(data) as Record<string, unknown> | null;
  const cats = (parsed as Record<string, unknown> | null)?.categories as Array<{ name: string; url?: string; children?: unknown[] }> | undefined;
  if (!cats?.length) return null;
  return (
    <div className="rounded-2xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
      <div className="px-4 py-2.5 border-b border-border" style={{ background: 'hsl(var(--muted))' }}>
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Tag size={12} className="text-accent" /> Categories</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-3">
        {cats.map(cat => (
          <a key={cat.name} href={cat.url ?? '#'} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:border-accent/40 hover:bg-muted/60 text-xs font-medium text-foreground transition-all">
            <Tag size={10} className="text-accent shrink-0" />
            <span className="capitalize">{cat.name}</span>
            {cat.children && (cat.children as unknown[]).length > 0 && <span className="ml-auto text-[10px] text-muted-foreground">+{(cat.children as unknown[]).length}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

function CitiesList({ data }: { data: unknown }) {
  const parsed = parseMcpText(data) as Record<string, unknown> | null;
  const cities = (parsed as Record<string, unknown> | null)?.cities as Array<{ name: string; aliases?: string[] }> | undefined;
  const total  = (parsed as Record<string, unknown> | null)?.total_matched as number | undefined;
  if (!cities?.length) return null;
  return (
    <div className="rounded-2xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between" style={{ background: 'hsl(var(--muted))' }}>
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><MapPin size={12} className="text-accent" /> Delivery Cities</p>
        {total !== undefined && <span className="text-[10px] text-muted-foreground">{total} found</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 p-3">
        {cities.map(city => (
          <span key={city.name} className="px-2.5 py-1 rounded-full border border-border bg-muted text-xs text-foreground">
            {city.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Tool renderer ────────────────────────────────────────────────────────────

function ToolPartRenderer({ part, lastOrderForm, onSend, onOrderNow, onDeliveryForm, onViewProduct, onOrderForm }: {
  part: { type: string; toolName?: string; state: string; input?: unknown; output?: unknown; errorText?: string };
  lastOrderForm: OrderFormData | null;
  onSend: (msg: string) => void;
  onOrderNow: (msg: string) => void;
  onDeliveryForm: (city: string, date: string) => void;
  onViewProduct: (product: KaprukProduct) => void;
  onOrderForm: () => void;
}) {
  const { toolName, state, output, errorText } = part;

  if (state === 'input-streaming' || state === 'input-available') {
    const [Icon, label] =
      toolName?.includes('search')                               ? [Search,      'Searching products…']      :
      toolName?.includes('get_prod')                             ? [Package,     'Loading product…']         :
      toolName?.includes('delivery') || toolName?.includes('check') ? [Truck,   'Checking delivery…']       :
      toolName?.includes('order') || toolName?.includes('checkout') ? [ShoppingCart, 'Creating order…']     :
      toolName?.includes('track')                                ? [Clock,       'Tracking order…']          :
      toolName?.includes('categor')                              ? [Tag,         'Loading categories…']      :
      toolName?.includes('cities')                               ? [MapPin,      'Loading cities…']          :
                                                                   [Sparkles,    'Working…'];
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-tl-sm border border-border w-fit" style={{ background: 'hsl(var(--card))' }}>
        {/* Ring spinner */}
        <div className="w-4 h-4 rounded-full border-2 border-accent/20 border-t-accent animate-spin shrink-0" />
        <Icon size={13} className="text-accent shrink-0" />
        <span className="text-xs text-muted-foreground">{label}</span>
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
    if (toolName?.includes('search'))                                   return <ProductGrid data={output} onOrder={onOrderNow} onViewProduct={onViewProduct} />;
    if (toolName?.includes('get_product') || toolName?.includes('get_prod'))
                                                                        return <ProductGrid data={output} onOrder={onOrderNow} onViewProduct={onViewProduct} />;
    if (toolName?.includes('delivery') || toolName?.includes('check_delivery'))
                                                                        return <DeliveryQuote data={output} onChangeCityDate={onDeliveryForm} onPlaceOrder={onOrderForm} />;
    if (toolName?.includes('create_order') || toolName?.includes('checkout'))
                                                                        return <CheckoutPanel data={output} lastOrderForm={lastOrderForm} />;
    if (toolName?.includes('track'))                                    return <OrderTrackingPanel data={output} />;
    if (toolName?.includes('categor'))                                  return <CategoryList data={output} />;
    if (toolName?.includes('cities'))                                   return <CitiesList data={output} />;

    // Fallback: parse MCP envelope and show readable text
    const parsed = parseMcpText(output);
    const preview = typeof parsed === 'string'
      ? parsed.slice(0, 400)
      : JSON.stringify(parsed, null, 2).slice(0, 600);
    return (
      <div className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-xl px-4 py-3 font-mono overflow-x-auto">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">{toolName}</p>
        <pre className="whitespace-pre-wrap break-all">{preview}{preview.length >= 400 ? '…' : ''}</pre>
      </div>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessageList({ messages, isLoading, onOrderForm, onDeliveryForm, onSend, onOrderNow, onViewProduct, lastOrderForm }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-3 py-6 px-4">
      {messages.map(message => {
        const isUser = message.role === 'user';
        const fullText = !isUser
          ? (message.parts as MessagePart[]).filter(p => p.type === 'text').map(p => ('text' in p ? (p as { text: string }).text : '')).join(' ')
          : '';
        const isOrderPrompt = !isUser && detectOrderFormNeeded(fullText);

        return (
          <div key={message.id} className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>

            {/* AI icon — no background, just the icon */}
            {!isUser && (
              <div className="shrink-0 mt-1 w-6 h-6 flex items-center justify-center">
                <Sparkles size={15} className="text-violet-400" />
              </div>
            )}

            <div className={cn('flex flex-col gap-2', isUser ? 'items-end max-w-[78%]' : 'items-start w-full max-w-[92%]')}>
              {isOrderPrompt && <OrderPromptCard onOrderForm={onOrderForm} />}
              {buildRenderParts(message).flatMap((part, i) => {

                if (part.type === 'text') {
                  const text = 'text' in part ? (part as { text: string }).text : '';
                  if (!text.trim()) return [];

                  // User: order details card
                  if (isUser && isOrderDetailsText(text)) return [<OrderDetailsCard key={i} text={text} />];

                  // User: "Order Now" quick-order bubble
                  const orderNow = isUser ? parseOrderNow(text) : null;
                  if (orderNow) return [<OrderNowBubble key={i} name={orderNow.name} price={orderNow.price} />];

                  // User: plain bubble
                  if (isUser) return [(
                    <div key={i} className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed bg-accent text-accent-foreground shadow-sm shadow-accent/20">
                      <p className="whitespace-pre-wrap">{text}</p>
                    </div>
                  )];

                  // Assistant: single bubble per text part
                  return [(
                    <div
                      key={i}
                      className="px-4 py-3 rounded-2xl rounded-tl-sm border border-border text-sm leading-relaxed"
                      style={{ background: 'hsl(var(--card))' }}
                    >
                      <AssistantText text={text} />
                    </div>
                  )];
                }

                if (part.type === 'dynamic-tool') return [(
                  <div key={i} className="w-full">
                    <ToolPartRenderer part={part as Parameters<typeof ToolPartRenderer>[0]['part']} lastOrderForm={lastOrderForm} onSend={onSend} onOrderNow={onOrderNow} onDeliveryForm={onDeliveryForm} onViewProduct={onViewProduct} onOrderForm={onOrderForm} />
                  </div>
                )];

                if (part.type === 'step-start') return i > 0 ? [<Separator key={i} className="my-1 opacity-30" />] : [];

                return [];
              })}
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {(() => {
        const last = messages[messages.length - 1];
        const show = isLoading && (!last || last.role !== 'assistant' || !(last.parts as MessagePart[]).some(p => p.type === 'text' && 'text' in p && (p as { text: string }).text));
        if (!show) return null;
        return (
          <div className="flex gap-2.5 justify-start">
            <div className="shrink-0 mt-1 w-6 h-6 flex items-center justify-center">
              <Sparkles size={15} className="text-violet-400 animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm border border-border" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
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
