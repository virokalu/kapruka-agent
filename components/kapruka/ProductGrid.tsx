'use client';

import { useState, useEffect } from 'react';
import { Zap, Star, Package, ExternalLink, Tag } from 'lucide-react';
import { formatLKR, truncate, cn } from '@/lib/utils';

export interface KaprukProduct {
  id?: string;
  name?: string;
  price?: number | { amount?: number; currency?: string };
  originalPrice?: number;
  compare_at_price?: { amount: number; currency: string };
  image?: string;
  imageUrl?: string;
  image_url?: string;
  category?: string | { name?: string };
  rating?: number;
  available?: boolean;
  inStock?: boolean;
  in_stock?: boolean;
  url?: string;
  summary?: string;
}

interface ProductGridProps { data: unknown; onOrder?: (msg: string) => void; onViewProduct?: (product: KaprukProduct) => void }

function parseMarkdownProducts(text: string): KaprukProduct[] {
  const products: KaprukProduct[] = [];
  const re = /\*\*\d+\.\s+(.+?)\*\*\s*ID:\s*`([^`]+)`\s*·\s*LKR\s*([\d,]+)\s*·\s*(.*?)\[View product\]\(([^)]+)\)/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [, name, id, priceStr, statusPart, url] = m;
    const price = parseInt(priceStr.replace(/,/g, ''), 10);
    const available = !statusPart.toLowerCase().includes('out of stock');
    const cleanName = name.trim().replace(/n#(\d+);/g, (_, n) => String.fromCharCode(+n));
    products.push({ id: id.trim(), name: cleanName, price: isNaN(price) ? 0 : price, available, url: url.trim() });
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

    if (Array.isArray(d.content)) {
      for (const item of d.content as Array<{ type: string; text?: string }>) {
        if (item.type === 'text' && item.text) {
          try { const r = normalise(JSON.parse(item.text)); if (r.length > 0) return r; } catch { /* not JSON */ }
          const r = parseMarkdownProducts(item.text);
          if (r.length > 0) return r;
        }
      }
    }

    if (d.name || d.id) return [d as KaprukProduct];
  }

  return [];
}

function getPrice(product: KaprukProduct): number {
  const raw = product.price;
  if (typeof raw === 'number') return raw;
  if (raw && typeof raw === 'object') return raw.amount ?? 0;
  return 0;
}

function getCategory(product: KaprukProduct): string {
  const c = product.category;
  if (!c) return '';
  if (typeof c === 'string') return c;
  return c.name ?? '';
}

function ProductCard({ product, onOrder, onViewProduct }: { product: KaprukProduct; onOrder?: (msg: string) => void; onViewProduct?: (product: KaprukProduct) => void }) {
  const name      = product.name ?? 'Product';
  const price     = getPrice(product);
  const original  = product.originalPrice ?? product.compare_at_price?.amount;
  const category  = getCategory(product);
  const available = product.available ?? product.inStock ?? product.in_stock ?? true;
  const url       = product.url;
  const discount  = original && original > price ? Math.round((1 - price / original) * 100) : null;

  const [imgSrc, setImgSrc] = useState<string | null>(
    product.image ?? product.imageUrl ?? product.image_url ?? null
  );
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (imgSrc || !product.id) return;
    fetch(`/api/product-image?id=${encodeURIComponent(product.id)}`)
      .then(r => r.json())
      .then(({ imageUrl }: { imageUrl: string | null }) => { if (imageUrl) setImgSrc(imageUrl); })
      .catch(() => {});
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const showImage = imgSrc && !imgError;

  const openDetail = () => { if (onViewProduct) onViewProduct(product); };

  return (
    <div
      className="group flex flex-col rounded-2xl border border-border bg-card hover:border-accent/40 hover:shadow-md hover:shadow-accent/10 transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={openDetail}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} className={cn('text-muted-foreground/40', !imgSrc && product.id && 'animate-pulse')} />
          </div>
        )}

        {discount && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold shadow-sm">
            -{discount}%
          </div>
        )}

        {!available && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xs font-medium bg-background/90 border border-border px-3 py-1 rounded-full text-muted-foreground">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3 flex-grow">
        {category && (
          <div className="flex items-center gap-1 text-[10px] text-accent font-medium uppercase tracking-wide">
            <Tag size={9} />
            {truncate(category, 20)}
          </div>
        )}

        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
          {name}
        </p>

        {product.rating != null && (
          <div className="flex items-center gap-1">
            <Star size={10} className="text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-muted-foreground">{product.rating.toFixed(1)}</span>
          </div>
        )}

        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
          <span className="text-sm font-bold text-foreground">{formatLKR(price)}</span>
          {original && original > price && (
            <span className="text-[10px] text-muted-foreground line-through">{formatLKR(original)}</span>
          )}
        </div>

        <div className="flex gap-1.5 mt-1">
          <button
            disabled={!available}
            onClick={(e) => {
              e.stopPropagation();
              if (!available) return;
              if (onViewProduct) { onViewProduct(product); return; }
              if (!onOrder) return;
              const priceStr = price ? ` (${formatLKR(price)})` : '';
              onOrder(`I want to order "${name}"${priceStr}${product.id ? ` — product ID ${product.id}` : ''}.`);
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
              available && onOrder
                ? 'bg-accent text-accent-foreground hover:bg-accent/90 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
            )}
          >
            <Zap size={11} />
            {available ? 'Order Now' : 'Unavailable'}
          </button>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-all duration-150"
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({ data, onOrder, onViewProduct }: ProductGridProps) {
  const products = normalise(data);

  if (products.length === 0) {
    const rawText = (() => {
      if (!data || typeof data !== 'object') return null;
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.content)) {
        const t = (d.content as Array<{ type: string; text?: string }>).find(c => c.type === 'text' && c.text);
        return t?.text ?? null;
      }
      return null;
    })();

    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-card text-sm text-muted-foreground">
        <Package size={15} className="shrink-0 mt-0.5 text-accent" />
        <span>{rawText ?? 'No products found. Try a different search term.'}</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      <p className="text-[11px] text-muted-foreground px-0.5">
        {products.length} result{products.length !== 1 ? 's' : ''} from Kapruka
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {products.map((product, i) => (
          <ProductCard key={product.id ?? i} product={product} onOrder={onOrder} onViewProduct={onViewProduct} />
        ))}
      </div>
    </div>
  );
}
