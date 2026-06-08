// components/kapruka/DeliveryQuote.tsx
'use client';

import { Truck, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { formatLKR, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

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
  if (Array.isArray(d.options))         options = d.options;
  else if (Array.isArray(d.deliveryOptions)) options = d.deliveryOptions;
  else {
    if (d.standardDelivery) options.push({ label: 'Standard', ...d.standardDelivery });
    if (d.expressDelivery)  options.push({ label: 'Express',  ...d.expressDelivery });
  }

  return { city, productName, options };
}

function OptionCard({ option, index }: { option: DeliveryOption; index: number }) {
  const label    = option.label ?? option.name ?? option.type ?? `Option ${index + 1}`;
  const price    = option.price ?? option.cost ?? option.fee ?? 0;
  const days     = option.estimatedDays ?? option.days;
  const eta      = option.eta;
  const isExpress = label.toLowerCase().includes('express');

  return (
    <Card className={cn(
      'flex items-center justify-between p-4 border transition-all',
      isExpress
        ? 'border-accent bg-accent/5'
        : 'border-border'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center',
          isExpress ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
        )}>
          <Truck size={16} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock size={10} />
            <span>
              {eta ?? (days !== undefined ? `${days} day${days !== 1 ? 's' : ''}` : 'Contact for ETA')}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-foreground">
          {price === 0 ? 'Free' : formatLKR(price)}
        </p>
        {isExpress && (
          <span className="text-[10px] text-accent font-medium">Fastest</span>
        )}
      </div>
    </Card>
  );
}

export default function DeliveryQuote({ data }: { data: unknown }) {
  const { city, productName, options } = normalise(data);

  return (
    <Card className="w-full border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted">
        <MapPin size={16} className="text-accent flex-shrink-0" />
        <div className="flex-grow">
          <p className="text-sm font-semibold text-foreground">
            Delivery to {city || 'your address'}
          </p>
          {productName && (
            <p className="text-xs text-muted-foreground">{productName}</p>
          )}
        </div>
        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
      </div>

      {/* Options */}
      <div className="p-4 space-y-3">
        {options.length > 0 ? (
          options.map((opt, i) => <OptionCard key={i} option={opt} index={i} />)
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No delivery options available for this location.
          </p>
        )}
      </div>
    </Card>
  );
}