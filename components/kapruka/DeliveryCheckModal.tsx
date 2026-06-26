'use client';

import { useState, useEffect } from 'react';
import { X, Truck, MapPin, Calendar, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CitySearch } from './CitySearch';

export interface DeliveryCheckData {
  city: string;
  date: string;
}

interface DeliveryCheckModalProps {
  open:         boolean;
  onClose:      () => void;
  onSubmit:     (data: DeliveryCheckData) => void;
  initialCity?: string;
  initialDate?: string;
}

export function detectDeliveryFormNeeded(text: string): boolean {
  const lower = text.toLowerCase();
  // If it already triggers the full order form, don't show this one
  const orderSignals = ['full name', 'phone number', "recipient's", 'sender name', 'street address'];
  if (orderSignals.filter(s => lower.includes(s)).length >= 2) return false;

  const signals = [
    'delivery date', 'preferred date', 'which date', 'what date',
    'when would you like', 'which city', 'what city',
    'city and date', 'date and city', 'city for delivery',
    'delivery city', 'check delivery', 'verify delivery',
  ];
  return signals.filter(s => lower.includes(s)).length >= 1;
}

export default function DeliveryCheckModal({
  open, onClose, onSubmit, initialCity = '', initialDate = '',
}: DeliveryCheckModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [city,   setCity]   = useState(initialCity);
  const [date,   setDate]   = useState(initialDate);
  const [errors, setErrors] = useState<{ city?: string; date?: string }>({});

  useEffect(() => {
    if (open) { setCity(initialCity); setDate(initialDate); setErrors({}); }
  }, [open, initialCity, initialDate]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: { city?: string; date?: string } = {};
    if (!city.trim()) next.city = 'Required';
    if (!date.trim()) next.date = 'Required';
    else if (date < today) next.date = 'Must be today or later';
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit({ city, date });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full sm:max-w-sm border border-border shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border" style={{ background: 'hsl(var(--muted))' }}>
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <Truck size={16} className="text-accent-foreground" />
          </div>
          <div className="flex-grow">
            <h2 className="text-sm font-bold text-foreground">Check Delivery</h2>
            <p className="text-[11px] text-muted-foreground">Select a city and date to check availability</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* City */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <MapPin size={10} /> Delivery City <span className="text-accent">*</span>
            </label>
            <CitySearch value={city} onChange={setCity} error={errors.city} />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <Calendar size={10} /> Delivery Date <span className="text-accent">*</span>
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-xl text-sm border transition-all outline-none text-foreground',
                errors.date
                  ? 'border-destructive ring-1 ring-destructive/30'
                  : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
              )}
              style={{ background: 'hsl(var(--background))' }}
            />
            {errors.date && <p className="text-[10px] text-destructive">{errors.date}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-all">
              Cancel
            </button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-all shadow-sm shadow-accent/25">
              <Send size={13} />
              Check
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
