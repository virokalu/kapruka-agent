// components/kapruka/ProductGrid.tsx
'use client';

import { ShoppingCart, Star, Package, ExternalLink } from 'lucide-react';
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
  url?: string;
}

interface ProductGridProps {
  data: unknown;
}

// Parses the Kapruka MCP markdown format:
// **N. Product Name** ID: `SKU` · LKR PRICE · In stock (low) · ships internationally [View product](url)
function parseMarkdownProducts(text: string): KaprukProduct[] {
  const products: KaprukProduct[] = [];
  const re = /\*\*\d+\.\s+(.+?)\*\*\s*ID:\s*`([^`]+)`\s*·\s*LKR\s*([\d,]+)\s*·\s*(.*?)\[View product\]\(([^)]+)\)/gs;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [, name, id, priceStr, statusPart, url] = m;
    const price = parseInt(priceStr.replace(/,/g, ''), 10);
    const available = !statusPart.toLowerCase().includes('out of stock');
    // Decode malformed HTML entity artifacts like n#176; → ° (degree sign)
    const cleanName = name.trim().replace(/n#(\d+);/g, (_, n) => String.fromCharCode(+n));
    products.push({
      id: id.trim(),
      name: cleanName,
      price: isNaN(price) ? 0 : price,
      available,
      url: url.trim(),
    });
  }
  return products;
}

function normalise(data: unknown): KaprukProduct[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as KaprukProduct[];

  if (typeof data === 'string') {
    try { return normalise(JSON.parse(data)); } catch { /* not JSON */ }
    return parseMarkdownProducts(data);
  }

  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.products)) return d.products as KaprukProduct[];
    if (Array.isArray(d.results))  return d.results  as KaprukProduct[];
    if (Array.isArray(d.items))    return d.items    as KaprukProduct[];
    if (Array.isArray(d.data))     return d.data     as KaprukProduct[];

    // MCP content array: { content: [{ type: "text", text: "..." }] }
    if (Array.isArray(d.content)) {
      for (const item of d.content as Array<{ type: string; text?: string }>) {
        if (item.type === 'text' && item.text) {
          try {
            const r = normalise(JSON.parse(item.text));
            if (r.length > 0) return r;
          } catch { /* not JSON */ }
          const r = parseMarkdownProducts(item.text);
          if (r.length > 0) return r;
        }
      }
    }

    // Single product object
    if (d.name || d.id) return [d as KaprukProduct];
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
  const url       = product.url;
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
        <div className="mt-2 flex gap-2">
          <Button
            disabled={!available}
            variant={available ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-lg transition-all duration-150',
              !available && 'cursor-not-allowed opacity-50'
            )}
          >
            <ShoppingCart size={14} />
            {available ? 'Add to Order' : 'Unavailable'}
          </Button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="rounded-lg px-2">
                <ExternalLink size={14} />
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function ProductGrid({ data }: ProductGridProps) {
  const products = normalise(data);

  if (products.length === 0) {
    const rawText = (() => {
      if (!data || typeof data !== 'object') return null;
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.content)) {
        const t = (d.content as Array<{ type: string; text?: string }>)
          .find(c => c.type === 'text' && c.text);
        return t?.text ?? null;
      }
      return null;
    })();

    return (
      <Card className="flex items-start gap-3 px-4 py-3 border-border text-sm text-muted-foreground">
        <Package size={16} className="shrink-0 mt-0.5" />
        <span>{rawText ?? 'No products found. Try a different search term.'}</span>
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