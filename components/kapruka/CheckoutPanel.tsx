'use client';

import { CheckCircle2, ExternalLink, Package, Copy, AlertCircle, MapPin, Clock, User } from 'lucide-react';
import { useState } from 'react';
import { formatLKR, cn } from '@/lib/utils';

interface CheckoutResult {
  orderId?: string;
  order_id?: string;
  id?: string;
  paymentUrl?: string;
  payment_url?: string;
  checkoutUrl?: string;
  totalAmount?: number;
  total?: number;
  amount?: number;
  status?: string;
  message?: string;
  productName?: string;
  customerName?: string;
  deliveryAddress?: string;
  estimatedDelivery?: string;
  error?: string;
}

function normalise(data: unknown): CheckoutResult {
  if (!data || typeof data !== 'object') return {};
  return data as CheckoutResult;
}

function Row({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs py-1.5 border-b border-border last:border-0">
      <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {icon}
        {label}
      </span>
      <span className={cn('text-right', highlight ? 'font-bold text-foreground text-sm' : 'text-muted-foreground')}>
        {value}
      </span>
    </div>
  );
}

export default function CheckoutPanel({ data }: { data: unknown }) {
  const result = normalise(data);
  const [copied, setCopied] = useState(false);

  const orderId    = result.orderId ?? result.order_id ?? result.id;
  const paymentUrl = result.paymentUrl ?? result.payment_url ?? result.checkoutUrl;
  const total      = result.totalAmount ?? result.total ?? result.amount;
  const isError    = !!result.error || result.status === 'error';

  if (isError) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/25 text-sm">
        <AlertCircle size={15} className="text-destructive mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-destructive text-xs">Order could not be created</p>
          <p className="text-destructive/80 mt-1 text-[11px]">
            {result.error ?? result.message ?? 'Please try again or contact support.'}
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    if (!orderId) return;
    await navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-emerald-500/25 bg-card overflow-hidden">
      {/* Success header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/8 border-b border-emerald-500/20">
        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-emerald-500">Order Created!</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80">
            {result.message ?? 'Your Kapruka order is confirmed.'}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Order ID */}
        {orderId && (
          <div className="relative flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Order Reference</p>
              <p className="text-sm font-mono font-semibold text-foreground">{orderId}</p>
            </div>
            <button
              onClick={handleCopy}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-all duration-150"
              title="Copy order ID"
            >
              <Copy size={13} />
            </button>
            {copied && (
              <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 bg-card border border-emerald-500/25 px-2 py-1 rounded-lg shadow-sm">
                Copied!
              </span>
            )}
          </div>
        )}

        {/* Summary rows */}
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          <div className="px-3 py-2 bg-muted/50">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Order Summary</p>
          </div>
          <div className="px-3 py-1">
            {result.productName  && <Row icon={<Package size={10} />}  label="Product"   value={result.productName} />}
            {result.customerName && <Row icon={<User size={10} />}     label="Customer"  value={result.customerName} />}
            {result.deliveryAddress && <Row icon={<MapPin size={10} />} label="Deliver to" value={result.deliveryAddress} />}
            {result.estimatedDelivery && <Row icon={<Clock size={10} />} label="ETA" value={result.estimatedDelivery} />}
            {total !== undefined && <Row label="Total" value={formatLKR(total)} highlight />}
          </div>
        </div>

        {/* Pay CTA */}
        {paymentUrl && (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-all duration-150 shadow-sm shadow-accent/25"
          >
            Pay Now on Kapruka
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}
