'use client';

import { Package, MapPin, Phone, User, Calendar, CreditCard, MessageSquare, CheckCircle2, Circle, Camera, Video, Clock } from 'lucide-react';
import { cn, formatLKR } from '@/lib/utils';

interface TrackOrder {
  order_number?:          string;
  status?:                string;
  status_display?:        string;
  order_date?:            string;
  delivery_date?:         string;
  shipped_date?:          string | null;
  amount?:                string;
  payment_method?:        string;
  comments?:              string | null;
  recipient?:             { name?: string; phone?: string; address?: string; city?: string };
  greeting_message?:      string | null;
  special_instructions?:  string | null;
  progress?:              Array<{ step: string; timestamp: string }>;
  live_tracking_available?: boolean;
  has_delivery_video?:    boolean;
  has_delivery_photo?:    boolean;
  items?:                 Array<{ product_id?: string; name?: string; quantity?: number; selling_price?: number }>;
}

function parseMcp(data: unknown): TrackOrder | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.content)) {
    for (const item of d.content as Array<{ type: string; text?: string }>) {
      if (item.type === 'text' && item.text) {
        try { return JSON.parse(item.text) as TrackOrder; } catch { /* noop */ }
      }
    }
  }
  if (d.structuredContent && typeof d.structuredContent === 'object') {
    const sc = d.structuredContent as Record<string, unknown>;
    if (typeof sc.result === 'string') {
      try { return JSON.parse(sc.result) as TrackOrder; } catch { /* noop */ }
    }
  }
  if ('order_number' in d || 'status' in d) return d as TrackOrder;
  return null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  received:         { label: 'Received',          color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/25' },
  confirmed:        { label: 'Confirmed',          color: 'text-accent',                          bg: 'bg-accent/10',      border: 'border-accent/25' },
  processing:       { label: 'Processing',         color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/25' },
  shipped:          { label: 'Shipped',            color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25' },
  'out-for-delivery': { label: 'Out for Delivery', color: 'text-accent',                         bg: 'bg-accent/10',      border: 'border-accent/25' },
  delivered:        { label: 'Delivered',          color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  cancelled:        { label: 'Cancelled',          color: 'text-destructive',                     bg: 'bg-destructive/10', border: 'border-destructive/25' },
};

function statusCfg(status?: string) {
  if (!status) return STATUS_CONFIG.received;
  return STATUS_CONFIG[status.toLowerCase().replace(/ /g, '-')] ?? { label: status, color: 'text-foreground', bg: 'bg-muted', border: 'border-border' };
}

export default function OrderTrackingPanel({ data }: { data: unknown }) {
  const o = parseMcp(data);
  if (!o) return null;

  const cfg      = statusCfg(o.status);
  const progress = o.progress ?? [];
  const items    = o.items ?? [];

  return (
    <div className="w-full rounded-2xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border" style={{ background: 'hsl(var(--muted))' }}>
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Package size={16} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">Order Tracking</p>
          {o.order_number && <p className="text-[10px] text-muted-foreground font-mono">{o.order_number}</p>}
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border', cfg.color, cfg.bg, cfg.border)}>
          {o.status_display ?? cfg.label}
        </span>
      </div>

      <div className="divide-y divide-border">

        {/* ── Dates + Amount ── */}
        <div className="grid grid-cols-3 divide-x divide-border">
          {[
            { icon: Calendar, label: 'Ordered',  value: o.order_date    },
            { icon: Calendar, label: 'Delivery', value: o.delivery_date },
            { icon: CreditCard, label: 'Amount', value: o.amount ? `LKR ${parseFloat(o.amount).toLocaleString()}` : null },
          ].map(({ icon: Icon, label, value }) => value && (
            <div key={label} className="px-3 py-2.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-0.5 mb-0.5">
                <Icon size={8} /> {label}
              </p>
              <p className="text-xs font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Recipient ── */}
        {o.recipient && (
          <div className="px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recipient</p>
            <div className="space-y-1">
              {o.recipient.name && (
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <User size={11} className="text-accent shrink-0" /> {o.recipient.name}
                </div>
              )}
              {o.recipient.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone size={11} className="text-accent shrink-0" /> {o.recipient.phone}
                </div>
              )}
              {(o.recipient.address || o.recipient.city) && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin size={11} className="text-accent shrink-0 mt-0.5" />
                  <span>{[o.recipient.address, o.recipient.city].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Items ── */}
        {items.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Items</p>
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-accent">
                      {item.quantity ?? 1}
                    </div>
                    <span className="text-xs text-foreground truncate">{item.name ?? item.product_id}</span>
                  </div>
                  {item.selling_price != null && (
                    <span className="text-xs font-semibold text-foreground shrink-0">{formatLKR(item.selling_price)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Progress timeline ── */}
        {progress.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Clock size={9} /> Delivery Progress
            </p>
            <div className="relative pl-4">
              {/* vertical line */}
              <div className="absolute left-1.5 top-1 bottom-1 w-px" style={{ background: 'hsl(var(--border))' }} />
              <div className="space-y-3">
                {progress.map((p, i) => {
                  const isLast = i === progress.length - 1;
                  return (
                    <div key={i} className="relative flex gap-2.5">
                      <div className={cn('absolute -left-[13px] top-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0',
                        isLast
                          ? 'bg-accent border-accent'
                          : 'bg-card border-border'
                      )}>
                        {isLast
                          ? <CheckCircle2 size={7} className="text-accent-foreground" />
                          : <Circle size={5} className="text-border" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{p.step}</p>
                        {p.timestamp && (
                          <p className="text-[10px] text-muted-foreground">{p.timestamp}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Greeting / Special instructions ── */}
        {(o.greeting_message || o.special_instructions) && (
          <div className="px-4 py-3 space-y-2">
            {o.greeting_message && (
              <div className="flex items-start gap-2">
                <MessageSquare size={11} className="text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground italic">"{o.greeting_message}"</p>
              </div>
            )}
            {o.special_instructions && (
              <p className="text-[11px] text-muted-foreground bg-muted/60 rounded-lg px-3 py-1.5">
                📝 {o.special_instructions}
              </p>
            )}
          </div>
        )}

        {/* ── Media flags ── */}
        {(o.has_delivery_photo || o.has_delivery_video) && (
          <div className="px-4 py-2.5 flex gap-3">
            {o.has_delivery_photo && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Camera size={11} /> Delivery photo available
              </span>
            )}
            {o.has_delivery_video && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Video size={11} /> Delivery video available
              </span>
            )}
          </div>
        )}

        {/* ── Payment method ── */}
        {o.payment_method && (
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'hsl(var(--muted))' }}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Payment</span>
            <span className="text-[11px] font-medium text-foreground">{o.payment_method}</span>
          </div>
        )}
      </div>
    </div>
  );
}
