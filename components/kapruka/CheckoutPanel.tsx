// components/kapruka/CheckoutPanel.tsx
'use client';

import { CheckCircle2, ExternalLink, Package, Copy, AlertCircle } from 'lucide-react';
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

export default function CheckoutPanel({ data }: { data: unknown }) {
  const result = normalise(data);
  const [copied, setCopied] = useState(false);

  const orderId   = result.orderId ?? result.order_id ?? result.id;
  const paymentUrl = result.paymentUrl ?? result.payment_url ?? result.checkoutUrl;
  const total     = result.totalAmount ?? result.total ?? result.amount;
  const isError   = !!result.error || result.status === 'error';

  /*
   * Error state — order creation failed
   */
  if (isError) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-950/30 border border-red-900 text-sm">
        <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-red-300">Order could not be created</p>
          <p className="text-red-400/80 mt-1 text-xs">
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
    <div className="w-full rounded-2xl border border-emerald-800/60 bg-(--bg-elevated) overflow-hidden">
      {/* Success header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-950/40 border-b border-emerald-800/40">
        <CheckCircle2 size={18} className="text-emerald-400" />
        <div>
          <p className="text-sm font-semibold text-emerald-300">Order Created!</p>
          <p className="text-xs text-emerald-500">
            {result.message ?? 'Your Kapruka order is confirmed.'}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Order ID */}
        {orderId && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-(--bg-surface) border border-(--border)">
            <div>
              <p className="text-xs text-(--text-muted) mb-0.5">Order ID</p>
              <p className="text-sm font-mono font-medium text-(--text-primary)">{orderId}</p>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-(--bg-elevated) transition-colors text-(--text-muted) hover:text-(--text-primary)"
              title="Copy order ID"
            >
              <Copy size={14} />
            </button>
            {copied && (
              <span className="absolute text-xs text-emerald-400 bg-(--bg-elevated) px-2 py-1 rounded-md">
                Copied!
              </span>
            )}
          </div>
        )}

        {/* Order summary rows */}
        <div className="space-y-2">
          {result.productName && (
            <SummaryRow icon={<Package size={13} />} label="Product" value={result.productName} />
          )}
          {result.customerName && (
            <SummaryRow label="Customer" value={result.customerName} />
          )}
          {result.deliveryAddress && (
            <SummaryRow label="Deliver to" value={result.deliveryAddress} />
          )}
          {result.estimatedDelivery && (
            <SummaryRow label="Estimated delivery" value={result.estimatedDelivery} />
          )}
          {total !== undefined && (
            <SummaryRow
              label="Total"
              value={formatLKR(total)}
              valueClass="font-bold text-[var(--text-primary)]"
            />
          )}
        </div>

        {/* Pay Now CTA */}
        {paymentUrl && (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex items-center justify-center gap-2 w-full py-3 rounded-xl
              bg-(--accent) hover:bg-(--accent-hover) text-white
              text-sm font-semibold transition-colors duration-150
            "
          >
            Pay Now on Kapruka
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

/* Small helper to keep the summary rows DRY */
function SummaryRow({
  icon,
  label,
  value,
  valueClass,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5 text-(--text-muted) shrink-0">
        {icon}
        {label}
      </span>
      <span className={cn('text-right text-(--text-secondary)', valueClass)}>
        {value}
      </span>
    </div>
  );
}