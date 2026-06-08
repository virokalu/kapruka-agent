// components/ModeSwitcher.tsx
'use client';

import { useEffect, useState } from 'react';
import { Search, Zap, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ShoppingMode = 'search' | 'quick' | 'delivery';

interface ModeSwitcherProps {
  currentMode: ShoppingMode;
  onModeChange: (mode: ShoppingMode) => void;
}

const MODES = [
  { id: 'search' as const, label: 'Explore', icon: Search, description: 'Browse & Search' },
  { id: 'quick' as const, label: 'Quick Order', icon: Zap, description: 'Fast Checkout' },
  { id: 'delivery' as const, label: 'Delivery', icon: MapPin, description: 'Track & Quote' },
] as const;

export function ModeSwitcher({ currentMode, onModeChange }: ModeSwitcherProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1">
      {MODES.map(({ id, label, icon: Icon, description }) => (
        <Button
          key={id}
          onClick={() => onModeChange(id)}
          variant={currentMode === id ? 'default' : 'ghost'}
          size="sm"
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md
            transition-all duration-200
            ${currentMode === id
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
          title={description}
        >
          <Icon size={16} />
          <span className="text-xs font-medium">{label}</span>
        </Button>
      ))}
    </div>
  );
}
