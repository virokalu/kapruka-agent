'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CitySearch({ value, onChange, error }: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [query,       setQuery]       = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setSuggestions([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/search-cities?q=${encodeURIComponent(q)}`);
        const data = await res.json() as { cities: string[] };
        setSuggestions(data.cities ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 600);
  }, []);

  const handleInput = (v: string) => { setQuery(v); onChange(v); search(v); };
  const pick = (city: string) => { setQuery(city); onChange(city); setOpen(false); setSuggestions([]); };

  return (
    <div ref={wrapRef} className="relative">
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
        error
          ? 'border-destructive ring-1 ring-destructive/30'
          : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'
      )} style={{ background: 'hsl(var(--background))' }}>
        <Search size={12} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => query && suggestions.length > 0 && setOpen(true)}
          placeholder="e.g. Colombo 03, Kandy, Galle…"
          className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
        />
        {loading  && <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin shrink-0" />}
        {!loading && suggestions.length > 0 && <ChevronDown size={12} className="text-muted-foreground shrink-0" />}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border shadow-lg overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          {suggestions.map(city => (
            <li key={city}>
              <button
                type="button"
                onMouseDown={() => pick(city)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors text-left"
              >
                <MapPin size={11} className="text-accent shrink-0" />
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
    </div>
  );
}
