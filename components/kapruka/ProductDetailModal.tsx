'use client';

import { useState, useEffect } from 'react';
import { X, Zap, ExternalLink, Package, Tag, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn, formatLKR } from '@/lib/utils';

export interface ProductDetail {
  id?:              string;
  name?:            string;
  description?:     string;
  summary?:         string;
  price?:           { amount: number; currency: string } | number;
  compare_at_price?: { amount: number; currency: string } | number;
  in_stock?:        boolean;
  stock_level?:     string;
  images?:          string[];
  image_url?:       string;
  image?:           string;
  category?:        { name?: string } | string;
  variants?:        Array<{ id: string; name: string; price?: { amount: number }; in_stock?: boolean }>;
  url?:             string;
}

interface ProductDetailModalProps {
  open:        boolean;
  onClose:     () => void;
  onOrder:     (product: ProductDetail) => void;
  /** Raw MCP output (from tool result) — parsed internally */
  rawData?:    unknown;
  /** Basic card data — modal will fetch full details */
  productId?:  string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
}

function getPrice(p: ProductDetail['price']): number {
  if (!p) return 0;
  if (typeof p === 'number') return p;
  return p.amount ?? 0;
}

function parseMcp(raw: unknown): ProductDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (Array.isArray(d.content)) {
    for (const item of d.content as Array<{ type: string; text?: string }>) {
      if (item.type === 'text' && item.text) {
        try { return JSON.parse(item.text) as ProductDetail; } catch { /* noop */ }
      }
    }
  }
  if (d.structuredContent && typeof d.structuredContent === 'object') {
    const sc = d.structuredContent as Record<string, unknown>;
    if (typeof sc.result === 'string') {
      try { return JSON.parse(sc.result) as ProductDetail; } catch { /* noop */ }
    }
  }
  if ('name' in d || 'id' in d) return d as ProductDetail;
  return null;
}

export default function ProductDetailModal({ open, onClose, onOrder, rawData, productId, productName, productPrice, productImage }: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgIdx,  setImgIdx]  = useState(0);

  useEffect(() => {
    if (!open) { setProduct(null); setImgIdx(0); setLoading(false); return; }

    // If we have raw MCP data, parse it directly — no fetch needed
    if (rawData) {
      const parsed = parseMcp(rawData);
      setProduct(parsed ?? { id: productId, name: productName, price: productPrice, image_url: productImage });
      setLoading(false);
      return;
    }

    // Fetch full details by ID
    if (productId) {
      setLoading(true);
      setProduct(null); // keep null so skeleton shows instead of partial data
      fetch(`/api/product-detail?id=${encodeURIComponent(productId)}`)
        .then(r => r.json())
        .then((data: ProductDetail) => setProduct(data))
        .catch(() => setProduct({ id: productId, name: productName, price: productPrice, image_url: productImage }))
        .finally(() => setLoading(false));
    }
  }, [open, rawData, productId, productName, productPrice, productImage]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const images     = product?.images?.length ? product.images : [product?.image_url ?? product?.image ?? ''].filter(Boolean);
  const price      = getPrice(product?.price);
  const original   = getPrice(product?.compare_at_price);
  const discount   = original && original > price ? Math.round((1 - price / original) * 100) : null;
  const inStock    = product?.in_stock ?? true;
  const catName    = typeof product?.category === 'string' ? product.category : product?.category?.name ?? '';
  const currentImg = images[imgIdx] ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full sm:max-w-lg border border-border shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all" style={{ background: 'hsl(var(--card))' }}>
          <X size={16} />
        </button>

        {/* ── SKELETON — show whenever product hasn't loaded yet ── */}
        {!product && (
          <>
            {/* Image skeleton */}
            <div className="w-full aspect-[4/3] shrink-0 animate-pulse" style={{ background: 'hsl(var(--foreground) / 0.08)' }} />

            {/* Content skeleton */}
            <div className="flex-1 p-5 space-y-4">
              {/* category chip */}
              <div className="h-3 w-16 rounded-full animate-pulse" style={{ background: 'hsl(var(--foreground) / 0.08)' }} />
              {/* name + price */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-3/4 rounded-lg animate-pulse" style={{ background: 'hsl(var(--foreground) / 0.1)' }} />
                  <div className="h-4 w-1/2 rounded-lg animate-pulse" style={{ background: 'hsl(var(--foreground) / 0.08)' }} />
                </div>
                <div className="space-y-2 shrink-0">
                  <div className="h-5 w-20 rounded-lg animate-pulse" style={{ background: 'hsl(var(--foreground) / 0.1)' }} />
                  <div className="h-3 w-14 rounded-lg animate-pulse" style={{ background: 'hsl(var(--foreground) / 0.06)' }} />
                </div>
              </div>
              {/* stock pill */}
              <div className="h-3 w-24 rounded-full animate-pulse" style={{ background: 'hsl(var(--foreground) / 0.08)' }} />
              {/* description lines */}
              <div className="space-y-2.5 pt-1">
                <div className="h-3 w-full rounded-lg animate-pulse"  style={{ background: 'hsl(var(--foreground) / 0.07)' }} />
                <div className="h-3 w-5/6 rounded-lg animate-pulse"  style={{ background: 'hsl(var(--foreground) / 0.07)' }} />
                <div className="h-3 w-4/6 rounded-lg animate-pulse"  style={{ background: 'hsl(var(--foreground) / 0.07)' }} />
              </div>
            </div>

            {/* Actions skeleton */}
            <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border" style={{ background: 'hsl(var(--foreground) / 0.03)' }}>
              <div className="h-10 w-28 rounded-xl animate-pulse" style={{ background: 'hsl(var(--foreground) / 0.08)' }} />
              <div className="flex-1 h-10 rounded-xl animate-pulse" style={{ background: 'hsl(var(--accent) / 0.25)' }} />
            </div>
          </>
        )}

        {/* ── LOADED content ── */}
        {!!product && (
          <>
            {/* Image */}
            <div className="relative w-full aspect-[4/3] bg-muted shrink-0 overflow-hidden">
              {currentImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentImg} alt={product?.name ?? ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={48} className="text-muted-foreground/30" />
                </div>
              )}

              {discount && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold shadow">
                  -{discount}%
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all"
                    style={{ background: 'hsl(var(--card) / 0.9)' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all"
                    style={{ background: 'hsl(var(--card) / 0.9)' }}>
                    <ChevronRight size={14} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={cn('w-1.5 h-1.5 rounded-full transition-all', i === imgIdx ? 'bg-accent scale-125' : 'bg-white/60')} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Details */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {catName && (
                <div className="flex items-center gap-1 text-[10px] text-accent font-semibold uppercase tracking-wider">
                  <Tag size={9} /> {catName}
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold text-foreground leading-snug flex-1">
                  {product?.name ?? productName ?? '—'}
                </h2>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground">{price ? formatLKR(price) : '—'}</p>
                  {original && original > price && (
                    <p className="text-xs text-muted-foreground line-through">{formatLKR(original)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {inStock
                  ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  : <AlertCircle  size={13} className="text-destructive shrink-0" />
                }
                <span className={cn('text-xs font-medium', inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                  {inStock ? `In stock${product?.stock_level ? ` · ${product.stock_level} availability` : ''}` : 'Out of stock'}
                </span>
              </div>

              {(product?.summary || product?.description) && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.summary ?? product.description}
                </p>
              )}

              {product?.variants && product.variants.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Options</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.variants.map(v => (
                      <span key={v.id} className={cn(
                        'px-2.5 py-1 rounded-lg border text-xs font-medium',
                        v.in_stock
                          ? 'border-border text-foreground'
                          : 'border-border/40 text-muted-foreground/50 line-through'
                      )}>
                        {v.name}{v.price?.amount ? ` · ${formatLKR(v.price.amount)}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border" style={{ background: 'hsl(var(--muted))' }}>
              {product?.url && (
                <a href={product.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/40 transition-all">
                  <ExternalLink size={12} /> View on Kapruka
                </a>
              )}
              <button
                disabled={!inStock}
                onClick={() => { onClose(); if (product) onOrder(product); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm',
                  inStock
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-accent/25 active:scale-95'
                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                )}
              >
                <Zap size={14} />
                {inStock ? 'Order Now' : 'Out of Stock'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
