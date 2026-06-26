'use client';

import { Truck, MapPin, CheckCircle2, XCircle, Calendar, RefreshCw, Zap } from 'lucide-react';
import { formatLKR } from '@/lib/utils';

interface CheckResult {
  city?:               string;
  checked_date?:       string;
  available?:          boolean;
  rate?:               number;
  currency?:           string;
  reason?:             string | null;
  next_available_date?: string | null;
  perishable_warning?: string | null;
}

function parseMcp(data: unknown): CheckResult | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  // Unwrap MCP envelope
  if (Array.isArray(d.content)) {
    for (const item of d.content as Array<{ type: string; text?: string }>) {
      if (item.type === 'text' && item.text) {
        try { return JSON.parse(item.text) as CheckResult; } catch { /* noop */ }
      }
    }
  }
  if (d.structuredContent && typeof d.structuredContent === 'object') {
    const sc = d.structuredContent as Record<string, unknown>;
    if (typeof sc.result === 'string') {
      try { return JSON.parse(sc.result) as CheckResult; } catch { /* noop */ }
    }
  }

  // Already parsed
  if ('available' in d || 'city' in d) return d as CheckResult;
  return null;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DeliveryQuote({ data, onChangeCityDate, onPlaceOrder }: {
  data: unknown;
  onChangeCityDate?: (city: string, date: string) => void;
  onPlaceOrder?: () => void;
}) {
  const r = parseMcp(data);
  if (!r) return null;

  const available = r.available ?? false;
  const city      = r.city ?? '';
  const date      = r.checked_date ?? '';
  const rate      = r.rate ?? 0;

  return (
    <div className="w-full rounded-2xl border overflow-hidden" style={{
      borderColor: available ? 'hsl(var(--border))' : 'hsl(var(--destructive) / 0.3)',
      background: 'hsl(var(--card))',
    }}>
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{
          background: available ? 'hsl(var(--muted))' : 'hsl(var(--destructive) / 0.08)',
          borderColor: available ? 'hsl(var(--border))' : 'hsl(var(--destructive) / 0.2)',
        }}
      >
        <MapPin size={14} className="text-accent shrink-0" />
        <div className="flex-grow min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            Delivery to {city || 'your address'}
          </p>
          {date && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar size={9} /> {fmt(date)}
            </p>
          )}
        </div>
        {available
          ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
          : <XCircle     size={15} className="text-destructive shrink-0" />
        }
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        {available ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Truck size={16} className="text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Delivery available</p>
                <p className="text-[11px] text-muted-foreground">Flat rate</p>
              </div>
              <p className="ml-auto text-sm font-bold text-foreground">
                {rate === 0 ? <span className="text-emerald-500">Free</span> : formatLKR(rate)}
              </p>
            </div>
            {onPlaceOrder && (
              <button
                onClick={onPlaceOrder}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 active:scale-95 transition-all shadow-sm shadow-accent/20"
              >
                <Zap size={13} />
                Place Order
              </button>
            )}
            {onChangeCityDate && (
              <button
                onClick={() => onChangeCityDate(city, date)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-muted-foreground text-xs font-medium hover:border-accent/40 hover:text-foreground transition-all"
              >
                <RefreshCw size={11} />
                Change city or date
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2.5">
              <XCircle size={14} className="text-destructive shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-destructive">Not available on this date</p>
                {r.reason && <p className="text-[11px] text-muted-foreground">{r.reason}</p>}
                {r.next_available_date && (
                  <p className="text-[11px] text-muted-foreground">
                    Next available: <span className="font-medium text-foreground">{fmt(r.next_available_date)}</span>
                  </p>
                )}
              </div>
            </div>

            {onChangeCityDate && (
              <button
                onClick={() => onChangeCityDate(city, date)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/10 transition-all"
              >
                <RefreshCw size={12} />
                Try a different city or date
              </button>
            )}
          </>
        )}

        {r.perishable_warning && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            ⚠️ {r.perishable_warning}
          </p>
        )}
      </div>
    </div>
  );
}
