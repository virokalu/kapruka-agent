// components/kapruka/ProductGrid.tsx
'use client';

import { ShoppingCart, Star, Package } from 'lucide-react';
import { formatLKR, truncate, cn } from '@/lib/utils';

/*
 * Kapruka product shape — we use a loose type because MCP dynamic tools
 * return `unknown`. We defensively access every field.
 */
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

/*
 * normalise() — converts whatever shape Kapruka returns into a clean array.
 * MCP tool results can come back as an array directly, or wrapped in a
 * { products: [...] } or { results: [...] } envelope. We handle all three.
 */
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
    <div className="
      group relative flex flex-col overflow-hidden rounded-2xl
      bg-(--bg-elevated) border border-(--border)
      hover:border-(--accent) transition-all duration-200
    ">
      {/* Image area */}
      <div className="relative aspect-square bg-(--bg-surface) overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-(--text-muted)" />
          </div>
        )}

        {/* Discount badge */}
        {discount && (
          <div className="absolute top-2 left-2 bg-(--accent) text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </div>
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
      <div className="flex flex-col gap-2 p-3">
        {category && (
          <span className="text-[10px] uppercase tracking-wider text-(--accent) font-medium">
            {category}
          </span>
        )}

        <p className="text-sm font-medium text-(--text-primary) leading-snug">
          {truncate(name, 60)}
        </p>

        {/* Rating */}
        {rating !== null && (
          <div className="flex items-center gap-1">
            <Star size={11} className="text-amber-400 fill-amber-400" />
            <span className="text-xs text-(--text-secondary)">
              {rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="text-base font-bold text-(--text-primary)">
            {formatLKR(price)}
          </span>
          {original && original > price && (
            <span className="text-xs text-(--text-muted) line-through">
              {formatLKR(original)}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          disabled={!available}
          className={cn(
            'mt-1 flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium transition-all duration-150',
            available
              ? 'bg-(--accent-subtle) text-(--accent) hover:bg-(--accent) hover:text-white border border-(--accent)'
              : 'bg-(--bg-surface) text-(--text-muted) cursor-not-allowed border border-(--border)'
          )}
        >
          <ShoppingCart size={12} />
          {available ? 'Add to Order' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
}

export default function ProductGrid({ data }: ProductGridProps) {
  const products = normalise(data);

  if (products.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-(--bg-elevated) border border-(--border) text-sm text-(--text-secondary)">
        <Package size={16} className="text-(--text-muted)" />
        No products found. Try a different search term.
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <p className="text-xs text-(--text-muted)">
        {products.length} result{products.length !== 1 ? 's' : ''} from Kapruka
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products.map((product, i) => (
          <ProductCard key={product.id ?? i} product={product} />
        ))}
      </div>
    </div>
  );
}