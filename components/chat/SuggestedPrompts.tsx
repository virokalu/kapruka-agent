// components/chat/SuggestedPrompts.tsx
'use client';

import { ShoppingBag, Cake, Flower2, Gift, Smartphone } from 'lucide-react';

const PROMPTS = [
  { icon: Cake,        label: 'Birthday cakes',  prompt: 'Show me birthday cakes under LKR 3000' },
  { icon: Flower2,     label: 'Fresh flowers',   prompt: 'Find fresh flower bouquets for delivery' },
  { icon: Gift,        label: 'Gift ideas',      prompt: 'What are popular gifts for anniversaries?' },
  { icon: Smartphone,  label: 'Electronics',     prompt: 'Show me mobile phones under LKR 50000' },
  { icon: ShoppingBag, label: 'Chocolates',      prompt: 'Find premium chocolate boxes' },
] as const;

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 px-4">
      <div className="text-center space-y-2">
        <div className="text-5xl mb-4">🛍️</div>
        <h1 className="text-2xl font-semibold text-(--text-primary)">
          Kapruka Shopping Agent
        </h1>
        <p className="text-(--text-secondary) text-sm max-w-sm">
          Ask me to find products, get delivery quotes, or place an order — anywhere in Sri Lanka.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {PROMPTS.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => onSelect(prompt)}
            className="
              flex items-center gap-2 px-4 py-2 rounded-full text-sm cursor-pointer
              bg-(--bg-elevated) border border-[var(--border)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)]
              hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]
              transition-all duration-150
            "
          >
            <Icon size={14} className="text-(--accent)" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}