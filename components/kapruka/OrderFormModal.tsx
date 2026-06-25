'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingBag, User, Phone, MapPin, Calendar, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrderFormData {
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  senderName: string;
  giftMessage: string;
}

interface OrderFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OrderFormData) => void;
}

const FIELDS = [
  { key: 'recipientName',    label: "Recipient's Full Name",   icon: User,           type: 'text',  placeholder: 'e.g. Saman Perera',             required: true  },
  { key: 'recipientPhone',   label: "Recipient's Phone Number", icon: Phone,          type: 'tel',   placeholder: 'e.g. 0771234567',               required: true  },
  { key: 'deliveryAddress',  label: 'Delivery Address',         icon: MapPin,         type: 'text',  placeholder: 'House no., street, city',        required: true  },
  { key: 'deliveryDate',     label: 'Desired Delivery Date',    icon: Calendar,       type: 'date',  placeholder: '',                              required: true  },
  { key: 'senderName',       label: 'Your Name (Sender)',       icon: User,           type: 'text',  placeholder: 'e.g. Nimal Silva',              required: true  },
  { key: 'giftMessage',      label: 'Gift Message (optional)',  icon: MessageSquare,  type: 'text',  placeholder: 'e.g. Happy Birthday! 🎂',        required: false },
] as const;

type FieldKey = typeof FIELDS[number]['key'];

export function detectOrderFormNeeded(text: string): boolean {
  const lower = text.toLowerCase();
  const signals = [
    "recipient's full name",
    "recipient's name",
    'phone number',
    'delivery address',
    'delivery date',
    'sender',
    'finalize your order',
    'place the order',
    'a few more details',
  ];
  const hits = signals.filter(s => lower.includes(s));
  return hits.length >= 3;
}

export default function OrderFormModal({ open, onClose, onSubmit }: OrderFormModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<OrderFormData>({
    recipientName:   '',
    recipientPhone:  '',
    deliveryAddress: '',
    deliveryDate:    '',
    senderName:      '',
    giftMessage:     '',
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  useEffect(() => {
    if (open) {
      setForm({ recipientName: '', recipientPhone: '', deliveryAddress: '', deliveryDate: '', senderName: '', giftMessage: '' });
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const validate = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {};
    for (const f of FIELDS) {
      if (f.required && !form[f.key].trim()) {
        next[f.key] = `${f.label} is required`;
      }
    }
    if (form.deliveryDate && form.deliveryDate < today) {
      next.deliveryDate = 'Delivery date must be today or later';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        'relative w-full sm:max-w-md bg-card border border-border shadow-2xl',
        'rounded-t-2xl sm:rounded-2xl overflow-hidden',
        'animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200'
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-accent/5">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <ShoppingBag size={16} className="text-accent-foreground" />
          </div>
          <div className="flex-grow">
            <h2 className="text-sm font-bold text-foreground">Order Details</h2>
            <p className="text-[11px] text-muted-foreground">Fill in the details to place your order on Kapruka</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh] p-5 space-y-3.5">
          {FIELDS.map(({ key, label, icon: Icon, type, placeholder, required }) => (
            <div key={key} className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <Icon size={10} />
                {label}
                {required && <span className="text-accent">*</span>}
              </label>
              <input
                type={type}
                value={form[key]}
                min={type === 'date' ? today : undefined}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className={cn(
                  'w-full px-3 py-2 rounded-xl text-sm bg-background border transition-all outline-none',
                  'placeholder:text-muted-foreground/50 text-foreground',
                  errors[key]
                    ? 'border-destructive ring-1 ring-destructive/30'
                    : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
                )}
              />
              {errors[key] && (
                <p className="text-[10px] text-destructive">{errors[key]}</p>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-all shadow-sm shadow-accent/25"
            >
              <Send size={13} />
              Place Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
