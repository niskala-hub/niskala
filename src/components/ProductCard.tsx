import { Link } from "react-router-dom";
import type { Product } from "@/data/products";
import { formatIDR } from "@/lib/currency";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.slug}`} className="group relative block">
      <div className="relative overflow-hidden bg-[hsl(var(--warm-bg))]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-medium text-foreground">{product.name}</h3>
          {product.badge === "sale" && (
            <span className="text-xs text-accent font-medium">Sale</span>
          )}
          {product.badge === "sold-out" && (
            <span className="text-xs text-accent font-medium">Sold out</span>
          )}
          {product.availability && (
            <span className="text-xs text-muted-foreground ml-auto">{product.availability}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-foreground">{formatIDR(product.price)}</span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground/60 line-through">{formatIDR(product.originalPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
