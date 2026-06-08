// components/kapruka/ProductGrid.tsx
'use client';

import { ShoppingCart, Star, Package } from 'lucide-react';
import { formatLKR, truncate, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface KaprukProduct {
  id?: string;
  name?: string;
  price?: number;
  originalPrice?: number;
  image?: string;
  imageUrl?: string;
  category?: string;
  rating?: number;
  available?: boolean;
  inStock?: boolean;
}

interface ProductGridProps {
  data: unknown;
}

function normalise(data: unknown): KaprukProduct[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as KaprukProduct[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.products)) return d.products as KaprukProduct[];
    if (Array.isArray(d.results))  return d.results  as KaprukProduct[];
    if (Array.isArray(d.items))    return d.items    as KaprukProduct[];
  }
  return [];
}

function ProductCard({ product }: { product: KaprukProduct }) {
  const name      = product.name     ?? 'Product';
  const price     = product.price    ?? 0;
  const original  = product.originalPrice;
  const image     = product.image    ?? product.imageUrl;
  const category  = product.category ?? '';
  const rating    = product.rating   ?? null;
  const available = product.available ?? product.inStock ?? true;
  const discount  = original && original > price
    ? Math.round((1 - price / original) * 100)
    : null;

  return (
    <Card className="
      group relative flex flex-col overflow-hidden
      border-border hover:border-accent transition-all duration-200
    ">
      {/* Image area */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-muted-foreground" />
          </div>
        )}

        {/* Discount badge */}
        {discount && (
          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </Badge>
        )}

        {/* Out of stock overlay */}
        {!available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-medium bg-black/60 px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="flex flex-col gap-2 p-3 flex-grow">
        {category && (
          <span className="text-[10px] uppercase tracking-wider text-accent font-medium">
            {category}
          </span>
        )}

        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
          {truncate(name, 60)}
        </p>

        {/* Rating */}
        {rating !== null && (
          <div className="flex items-center gap-1">
            <Star size={11} className="text-amber-400 fill-amber-400" />
            <span className="text-xs text-muted-foreground">
              {rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="text-base font-bold text-foreground">
            {formatLKR(price)}
          </span>
          {original && original > price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatLKR(original)}
            </span>
          )}
        </div>

        {/* CTA */}
        <Button
          disabled={!available}
          variant={available ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-2 rounded-lg transition-all duration-150',
            !available && 'cursor-not-allowed opacity-50'
          )}
        >
          <ShoppingCart size={14} />
          {available ? 'Add to Order' : 'Unavailable'}
        </Button>
      </div>
    </Card>
  );
}

export default function ProductGrid({ data }: ProductGridProps) {
  const products = normalise(data);

  if (products.length === 0) {
    return (
      <Card className="flex items-center gap-3 px-4 py-3 border-border text-sm text-muted-foreground">
        <Package size={16} className="text-muted-foreground" />
        No products found. Try a different search term.
      </Card>
    );
  }

  return (
    <div className="w-full space-y-3">
      <p className="text-xs text-muted-foreground">
        {products.length} result{products.length !== 1 ? 's' : ''} from Kapruka
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, i) => (
          <ProductCard key={product.id ?? i} product={product} />
        ))}
      </div>
    </div>
  );
}