// components/chat/SuggestedPrompts.tsx
'use client';

import { Cake, Flower, Gift, Smartphone, Candy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PROMPTS = [
  { icon: Cake,        label: 'Birthday cakes',  prompt: 'Show me birthday cakes under LKR 3000' },
  { icon: Flower,      label: 'Fresh flowers',   prompt: 'Find fresh flower bouquets for delivery' },
  { icon: Gift,        label: 'Gift ideas',      prompt: 'What are popular gifts for anniversaries?' },
  { icon: Smartphone,  label: 'Electronics',     prompt: 'Show me mobile phones under LKR 50000' },
  { icon: Candy,   label: 'Chocolates',      prompt: 'Find premium chocolate boxes' },
] as const;

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-20 px-4">
      <div className="text-center space-y-3">
        <div className="text-6xl mb-4">✨🛒</div>
        <h1 className="text-3xl font-bold text-foreground">
          Kapruka Shopping Agent
        </h1>
        <p className="text-muted-foreground text-base max-w-sm">
          Ask me to find products, get delivery quotes, or place an order — anywhere in Sri Lanka.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
        {PROMPTS.map(({ icon: Icon, label, prompt }) => (
          <Button
            key={label}
            onClick={() => onSelect(prompt)}
            variant="outline"
            className="
              flex items-center gap-2 px-4 py-5 rounded-full text-sm
              border border-border
              hover:bg-accent hover:text-accent-foreground
              transition-all duration-150
            "
          >
            <Icon size={16} className="text-accent" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}