'use client';

import { Truck, Clock, MapPin, CheckCircle2, Zap } from 'lucide-react';
import { formatLKR, cn } from '@/lib/utils';

interface DeliveryOption {
  type?: string;
  label?: string;
  name?: string;
  price?: number;
  cost?: number;
  fee?: number;
  estimatedDays?: number;
  days?: number;
  eta?: string;
  available?: boolean;
}

interface QuoteData {
  city?: string;
  deliveryCity?: string;
  options?: DeliveryOption[];
  deliveryOptions?: DeliveryOption[];
  standardDelivery?: DeliveryOption;
  expressDelivery?: DeliveryOption;
  productName?: string;
  product?: string;
}

function normalise(data: unknown): { city: string; productName: string; options: DeliveryOption[] } {
  const fallback = { city: '', productName: '', options: [] };
  if (!data || typeof data !== 'object') return fallback;

  const d = data as QuoteData;
  const city        = d.city ?? d.deliveryCity ?? '';
  const productName = d.productName ?? d.product ?? '';

  let options: DeliveryOption[] = [];
  if (Array.isArray(d.options))              options = d.options;
  else if (Array.isArray(d.deliveryOptions)) options = d.deliveryOptions;
  else {
    if (d.standardDelivery) options.push({ label: 'Standard', ...d.standardDelivery });
    if (d.expressDelivery)  options.push({ label: 'Express',  ...d.expressDelivery });
  }

  return { city, productName, options };
}

function OptionRow({ option, index }: { option: DeliveryOption; index: number }) {
  const label    = option.label ?? option.name ?? option.type ?? `Option ${index + 1}`;
  const price    = option.price ?? option.cost ?? option.fee ?? 0;
  const days     = option.estimatedDays ?? option.days;
  const eta      = option.eta;
  const isExpress = label.toLowerCase().includes('express');

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all',
      isExpress
        ? 'border-accent/30 bg-accent/5 shadow-sm shadow-accent/10'
        : 'border-border bg-card'
    )}>
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        isExpress ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {isExpress ? <Zap size={14} /> : <Truck size={14} />}
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          {isExpress && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider">
              Fastest
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
          <Clock size={9} />
          <span>
            {eta ?? (days !== undefined ? `${days} day${days !== 1 ? 's' : ''}` : 'Contact for ETA')}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={cn('text-sm font-bold', isExpress ? 'text-accent' : 'text-foreground')}>
          {price === 0 ? <span className="text-emerald-500">Free</span> : formatLKR(price)}
        </p>
      </div>
    </div>
  );
}

export default function DeliveryQuote({ data }: { data: unknown }) {
  const { city, productName, options } = normalise(data);

  return (
    <div className="w-full rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/50">
        <MapPin size={14} className="text-accent shrink-0" />
        <div className="flex-grow min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            Delivery to {city || 'your address'}
          </p>
          {productName && (
            <p className="text-[10px] text-muted-foreground truncate">{productName}</p>
          )}
        </div>
        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
      </div>

      <div className="p-3 space-y-2">
        {options.length > 0 ? (
          options.map((opt, i) => <OptionRow key={i} option={opt} index={i} />)
        ) : (
          <p className="text-xs text-muted-foreground py-2 px-1">
            No delivery options available for this location.
          </p>
        )}
      </div>
    </div>
  );
}
