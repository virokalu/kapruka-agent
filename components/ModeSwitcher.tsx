'use client';

import { useEffect, useState } from 'react';
import { Search, Zap, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ShoppingMode = 'search' | 'quick' | 'delivery';

interface ModeSwitcherProps {
  currentMode: ShoppingMode;
  onModeChange: (mode: ShoppingMode) => void;
}

const MODES = [
  { id: 'search'   as const, label: 'Explore',     icon: Search  },
  { id: 'quick'    as const, label: 'Quick Order',  icon: Zap     },
  { id: 'delivery' as const, label: 'Delivery',     icon: MapPin  },
] as const;

export function ModeSwitcher({ currentMode, onModeChange }: ModeSwitcherProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onModeChange(id)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
            currentMode === id
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon size={12} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
