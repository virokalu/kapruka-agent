'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingBag, User, Phone, MapPin, Calendar, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CitySearch } from './CitySearch';

export interface OrderFormData {
  recipientName:   string;
  recipientPhone:  string;
  deliveryCity:    string;
  streetAddress:   string;
  deliveryDate:    string;
  senderName:      string;
  giftMessage:     string;
}

interface OrderFormModalProps {
  open:          boolean;
  onClose:       () => void;
  onSubmit:      (data: OrderFormData) => void;
  initialCity?:  string;
  initialDate?:  string;
}

export function detectOrderFormNeeded(text: string): boolean {
  const lower = text.toLowerCase();
  const signals = [
    "recipient's full name", "recipient's name",
    'your full name', 'full name',
    'phone number', 'contact number',
    'street address', 'house number',
    'sender', 'sender name', 'your name',
    'gift message',
    'finalize your order', 'place the order',
    'remaining details', 'few more details',
  ];
  return signals.filter(s => lower.includes(s)).length >= 2;
}

type FieldKey = keyof OrderFormData;

export default function OrderFormModal({ open, onClose, onSubmit, initialCity = '', initialDate = '' }: OrderFormModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const makeEmpty = (): OrderFormData => ({
    recipientName:  '',
    recipientPhone: '',
    deliveryCity:   initialCity,
    streetAddress:  '',
    deliveryDate:   initialDate,
    senderName:     '',
    giftMessage:    '',
  });

  const [form,   setForm]   = useState<OrderFormData>(makeEmpty);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  // Reset form when opening, picking up the latest initialCity/Date
  useEffect(() => {
    if (open) { setForm(makeEmpty()); setErrors({}); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCity, initialDate]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const set = (key: FieldKey) => (v: string) => setForm(prev => ({ ...prev, [key]: v }));

  const validate = () => {
    const next: Partial<Record<FieldKey, string>> = {};
    const required: FieldKey[] = ['recipientName', 'recipientPhone', 'deliveryCity', 'streetAddress', 'deliveryDate', 'senderName'];
    for (const k of required) if (!form[k].trim()) next[k] = 'Required';
    if (form.deliveryDate && form.deliveryDate < today) next.deliveryDate = 'Must be today or later';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validate()) onSubmit(form); };

  if (!open) return null;

  const cityLocked = Boolean(initialCity);
  const dateLocked = Boolean(initialDate);

  const field = (key: FieldKey, label: string, icon: React.ElementType, placeholder: string, type = 'text', required = true) => {
    const Icon = icon;
    return (
      <div key={key} className="space-y-1">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          <Icon size={10} /> {label} {required && <span className="text-accent">*</span>}
        </label>
        <input
          type={type}
          value={form[key]}
          onChange={e => set(key)(e.target.value)}
          placeholder={placeholder}
          min={type === 'date' ? today : undefined}
          className={cn(
            'w-full px-3 py-2 rounded-xl text-sm border transition-all outline-none text-foreground placeholder:text-muted-foreground/50',
            errors[key] ? 'border-destructive ring-1 ring-destructive/30' : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
          )}
          style={{ background: 'hsl(var(--background))' }}
        />
        {errors[key] && <p className="text-[10px] text-destructive">{errors[key]}</p>}
      </div>
    );
  };

  // A read-only pill for city/date already confirmed via delivery check
  const lockedField = (label: string, icon: React.ElementType, value: string) => {
    const Icon = icon;
    return (
      <div className="space-y-1">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          <Icon size={10} /> {label}
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/30 text-sm text-foreground" style={{ background: 'hsl(var(--background))' }}>
          <span className="flex-1">{value}</span>
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
        </div>
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Delivery confirmed for this {label.toLowerCase()}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className={cn(
          'relative z-10 w-full sm:max-w-md border border-border shadow-2xl',
          'rounded-t-2xl sm:rounded-2xl overflow-hidden',
          'animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200'
        )}
        style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border" style={{ background: 'hsl(var(--muted))' }}>
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <ShoppingBag size={16} className="text-accent-foreground" />
          </div>
          <div className="flex-grow">
            <h2 className="text-sm font-bold text-foreground">Order Details</h2>
            <p className="text-[11px] text-muted-foreground">
              {cityLocked ? 'City & date confirmed — just fill in your personal details' : 'Fill in your delivery details to place the order'}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[72vh] p-5 space-y-3.5">
          {field('recipientName',  "Recipient's Name",  User,  'e.g. Saman Perera')}
          {field('recipientPhone', "Recipient's Phone", Phone, 'e.g. 0771234567', 'tel')}

          {/* Delivery city — locked if pre-filled from delivery check */}
          {cityLocked
            ? lockedField('Delivery City', MapPin, form.deliveryCity)
            : (
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <MapPin size={10} /> Delivery City <span className="text-accent">*</span>
                </label>
                <CitySearch value={form.deliveryCity} onChange={set('deliveryCity')} error={errors.deliveryCity} />
              </div>
            )
          }

          {field('streetAddress', 'Street / House No.', MapPin, 'e.g. No. 12, Main Street')}

          {/* Delivery date — locked if pre-filled from delivery check */}
          {dateLocked
            ? lockedField('Delivery Date', Calendar, form.deliveryDate)
            : field('deliveryDate', 'Delivery Date', Calendar, '', 'date')
          }

          {field('senderName',  'Your Name (Sender)', User,          'e.g. Nimal Silva')}
          {field('giftMessage', 'Gift Message',        MessageSquare, 'e.g. Happy Birthday! 🎂', 'text', false)}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-all">
              Cancel
            </button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-all shadow-sm shadow-accent/25">
              <Send size={13} />
              Place Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
