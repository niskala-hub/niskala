import { Link } from "react-router-dom";
import type { Product } from "@/data/products";
import { formatIDR } from "@/lib/currency";
import { getProductStatusInfo } from "@/lib/product";

export default function ProductCard({ product }: { product: Product }) {
  const statusInfo = getProductStatusInfo({
    status: product.status || (product.badge === "sold-out" ? "sold" : "ready"),
    stock: product.stock ?? (product.badge === "sold-out" ? 0 : 10),
  });

  const origPrice = product.original_price ?? product.originalPrice;

  return (
    <Link to={`/product/${product.slug}`} className="group relative block">
      <div className="relative overflow-hidden bg-[hsl(var(--warm-bg))]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full aspect-[4/5] object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* SOLD Overlay: Transparent Gray background + Watermark SOLD OUT */}
        {statusInfo.isSold && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="text-white/95 font-bold text-sm sm:text-base tracking-[0.2em] uppercase border-2 border-white/80 px-3.5 py-1 rotate-[-10deg] shadow-xl bg-black/40 select-none">
              SOLD OUT
            </span>
          </div>
        )}

        {/* Coming Soon Badge */}
        {statusInfo.isComingSoon && (
          <div className="absolute top-2 left-2 z-10 bg-amber-600/90 text-white font-medium text-[10px] uppercase tracking-wider px-2 py-0.5 shadow-sm">
            Coming Soon
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-medium text-foreground truncate">{product.name}</h3>
          {statusInfo.isComingSoon ? (
            <span className="text-xs text-amber-600 font-medium shrink-0">Coming Soon</span>
          ) : statusInfo.isSold ? (
            <span className="text-xs text-muted-foreground font-medium shrink-0">Sold out</span>
          ) : origPrice && origPrice > product.price ? (
            <span className="text-xs text-accent font-medium shrink-0">Sale</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-medium text-foreground">{formatIDR(product.price)}</span>
          {origPrice && origPrice > product.price && (
            <span className="text-xs sm:text-sm text-muted-foreground/60 line-through">
              {formatIDR(origPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
