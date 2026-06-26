'use client';

import { CheckCircle2, ExternalLink, Package, Copy, AlertCircle, MapPin, Clock, User, CreditCard, Phone } from 'lucide-react';
import { useState } from 'react';
import { formatLKR, cn } from '@/lib/utils';
import type { OrderFormData } from '@/components/kapruka/OrderFormModal';

interface OrderData {
  order_id?:      string;
  order_number?:  string;
  id?:            string;
  orderId?:       string;

  checkout_url?:  string;
  payment_url?:   string;
  checkoutUrl?:   string;
  paymentUrl?:    string;
  url?:           string;

  total?:         number;
  total_amount?:  number;
  totalAmount?:   number;
  amount?:        number;
  grand_total?:   number;
  currency?:      string;

  status?:        string;
  message?:       string;
  error?:         string;

  product_name?:  string;
  productName?:   string;
  item_name?:     string;

  recipient_name?:  string;
  recipientName?:   string;

  delivery_city?:   string;
  deliveryCity?:    string;
  city?:            string;

  delivery_date?:   string;
  deliveryDate?:    string;

  expires_at?:    string;
  expiry?:        string;
}

/** Extract a Kapruka payment URL from any string */
function extractPaymentUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s"')]+kapruka[^\s"')]+/i);
  return m ? m[0].replace(/[.,)]+$/, '') : null;
}

/** Parse the raw MCP tool output (envelope or plain object) into OrderData */
function parseOrderData(raw: unknown): OrderData | null {
  if (!raw) return null;

  // Already a plain object that's not MCP envelope
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const d = raw as Record<string, unknown>;

    // MCP envelope: { content: [{ type:'text', text:'...' }] }
    if (Array.isArray(d.content)) {
      for (const item of d.content as Array<{ type: string; text?: string }>) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);
            return parsed as OrderData;
          } catch {
            // text isn't JSON — store as message for URL extraction
            return { message: item.text };
          }
        }
      }
    }

    // structuredContent envelope
    if (d.structuredContent && typeof d.structuredContent === 'object') {
      const sc = d.structuredContent as Record<string, unknown>;
      if (typeof sc.result === 'string') {
        try { return JSON.parse(sc.result) as OrderData; } catch { /* fall through */ }
      }
    }

    // Plain order object
    return d as OrderData;
  }

  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as OrderData; } catch { /* not JSON */ }
  }

  return null;
}

function Row({ icon, label, value, accent }: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/60 last:border-0">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 pt-0.5">
        {icon}
        {label}
      </span>
      <span className={cn(
        'text-right text-[12px] leading-snug',
        accent ? 'font-bold text-foreground' : 'text-muted-foreground'
      )}>
        {value}
      </span>
    </div>
  );
}

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-LK', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function CheckoutPanel({ data, lastOrderForm }: { data: unknown; lastOrderForm?: OrderFormData | null }) {
  const [copied, setCopied] = useState(false);

  const order = parseOrderData(data);

  if (!order) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted border border-border text-xs text-muted-foreground">
        <Package size={14} className="shrink-0 mt-0.5 text-accent" />
        <span>Order information unavailable.</span>
      </div>
    );
  }

  const isError = !!order.error || order.status === 'error' || order.status === 'failed';

  if (isError) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/25">
        <AlertCircle size={15} className="text-destructive mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-destructive">Order could not be created</p>
          <p className="text-destructive/80 mt-1 text-[11px]">
            {order.error ?? order.message ?? 'Please try again or contact support.'}
          </p>
        </div>
      </div>
    );
  }

  const orderId = order.order_id ?? order.order_number ?? order.orderId ?? order.id;

  // Payment URL: check all known field names, then extract from message text
  const paymentUrl =
    order.checkout_url ?? order.payment_url ?? order.checkoutUrl ?? order.paymentUrl ?? order.url ??
    (order.message ? extractPaymentUrl(order.message) : null);

  const total = order.total ?? order.total_amount ?? order.totalAmount ?? order.amount ?? order.grand_total;
  const currency = order.currency ?? 'LKR';

  const productName  = order.product_name  ?? order.productName  ?? order.item_name;
  const recipient    = order.recipient_name ?? order.recipientName;
  const city         = order.delivery_city  ?? order.deliveryCity ?? order.city;
  const deliveryDate = order.delivery_date  ?? order.deliveryDate;

  const handleCopy = async () => {
    if (!orderId) return;
    await navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-emerald-500/30 bg-card overflow-hidden shadow-sm shadow-emerald-500/5">

      {/* Success header */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-emerald-500/10 border-b border-emerald-500/20">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <CheckCircle2 size={18} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-500">Order Created!</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">
            Your Kapruka order is confirmed — complete payment to finalize.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Order reference */}
        {orderId && (
          <div className="relative flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted border border-border">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Order Reference</p>
              <p className="text-sm font-mono font-bold text-foreground tracking-wide">{orderId}</p>
            </div>
            <button
              onClick={handleCopy}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              title="Copy order ID"
            >
              <Copy size={13} />
            </button>
            {copied && (
              <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 bg-card border border-emerald-500/30 px-2 py-1 rounded-lg shadow-sm whitespace-nowrap">
                Copied!
              </span>
            )}
          </div>
        )}

        {/* Summary table — merges MCP fields with form data */}
        {(() => {
          const display = {
            product:   productName,
            recipient: recipient ?? lastOrderForm?.recipientName,
            phone:     lastOrderForm?.recipientPhone,
            city:      city ?? lastOrderForm?.deliveryCity,
            date:      deliveryDate ?? lastOrderForm?.deliveryDate,
            sender:    lastOrderForm?.senderName,
            gift:      lastOrderForm?.giftMessage,
            total:     total,
          };
          const hasAny = Object.values(display).some(v => v !== undefined && v !== null && v !== '');
          if (!hasAny) return null;
          return (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/60 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Order Summary</p>
              </div>
              <div className="px-3 divide-y divide-border/60">
                {display.product   && <Row icon={<Package size={11} />}  label="Product"    value={display.product} />}
                {display.recipient && <Row icon={<User size={11} />}     label="Recipient"  value={display.recipient} />}
                {display.phone     && <Row icon={<Phone size={11} />}    label="Phone"      value={display.phone} />}
                {display.city      && <Row icon={<MapPin size={11} />}   label="Deliver to" value={display.city} />}
                {display.date      && <Row icon={<Clock size={11} />}    label="Date"       value={display.date} />}
                {display.sender    && <Row icon={<User size={11} />}     label="From"       value={display.sender} />}
                {display.gift && display.gift !== '(none)' && (
                  <Row icon={<Package size={11} />} label="Gift msg" value={display.gift} />
                )}
                {display.total !== undefined && (
                  <Row icon={<CreditCard size={11} />} label="Grand Total" value={`${currency} ${display.total.toLocaleString()}`} accent />
                )}
              </div>
            </div>
          );
        })()}

        {/* Payment link — primary CTA */}
        {paymentUrl ? (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold',
              'bg-emerald-500 text-white hover:bg-emerald-600',
              'transition-all duration-150 shadow-md shadow-emerald-500/30',
            )}
          >
            <CreditCard size={15} />
            Pay Now on Kapruka
            <ExternalLink size={13} className="opacity-70" />
          </a>
        ) : (
          <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-center">
            Payment link will appear once the order is processed.
          </div>
        )}

        {/* Expiry warning */}
        {(order.expires_at ?? order.expiry) && (
          <p className="text-[10px] text-muted-foreground text-center">
            Link expires: {formatExpiry(order.expires_at ?? order.expiry ?? '')}
          </p>
        )}

      </div>
    </div>
  );
}
