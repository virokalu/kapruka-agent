'use client';

import { Cake, Flower2, Gift, Smartphone, Candy, Truck, Heart, Star } from 'lucide-react';

const PROMPTS = [
  { icon: Cake,       label: 'Birthday Cakes',    prompt: 'Show me birthday cakes under LKR 3000',            color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { icon: Flower2,    label: 'Fresh Flowers',      prompt: 'Find fresh flower bouquets for delivery',          color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { icon: Gift,       label: 'Anniversary Gifts',  prompt: 'What are popular gifts for anniversaries?',        color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { icon: Smartphone, label: 'Electronics',        prompt: 'Show me mobile phones under LKR 50000',           color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { icon: Candy,      label: 'Chocolates',         prompt: 'Find premium chocolate gift boxes',               color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { icon: Heart,      label: "Mother's Day",       prompt: "Show me gifts for Mother's Day",                  color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
] as const;

const FEATURES = [
  { icon: Star,  text: 'Search 10,000+ products' },
  { icon: Truck, text: 'Deliver anywhere in Sri Lanka' },
  { icon: Gift,  text: 'Guest checkout, no account needed' },
];

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-10 gap-8">

      {/* Hero */}
      <div className="text-center space-y-3 max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/30 mb-2">
          <span className="text-2xl">🛒</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          What would you like today?
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          I can search Kapruka&apos;s catalog, get delivery quotes, and place orders — anywhere in Sri Lanka.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {FEATURES.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-xs text-muted-foreground">
            <Icon size={11} className="text-accent" />
            {text}
          </div>
        ))}
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {PROMPTS.map(({ icon: Icon, label, prompt, color }) => (
          <button
            key={label}
            onClick={() => onSelect(prompt)}
            className="flex flex-col items-start gap-2 p-3.5 rounded-xl border bg-card hover:bg-muted/60 hover:border-accent/40 hover:shadow-sm transition-all duration-150 text-left group"
          >
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${color}`}>
              <Icon size={15} />
            </div>
            <span className="text-xs font-medium text-foreground group-hover:text-accent transition-colors leading-snug">
              {label}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground/50">
        Press Enter or click Send after typing your request
      </p>
    </div>
  );
}
