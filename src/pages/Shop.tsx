import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/currency";
import { resolveProductImage } from "@/lib/productImage";

interface DBProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
}

export default function Shop() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,slug,name,price,stock,image_url")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--warm-bg))]">
      <div className="py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-light text-foreground">Shop</h1>
      </div>
      <div className="max-w-7xl mx-auto px-6 pb-24">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {products.map((p, i) => {
              const soldOut = p.stock <= 0;
              return (
                <Link key={p.id} to={`/product/${p.slug}`} className="group relative block">
                  <div className="relative overflow-hidden bg-[hsl(var(--warm-bg))]">
                    <img
                      src={resolveProductImage(p.image_url, i % 2 === 0 ? "daster" : "pajamas")}
                      alt={p.name}
                      className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-base font-medium text-foreground">{p.name}</h3>
                      {soldOut && <span className="text-xs text-accent font-medium">Sold out</span>}
                    </div>
                    <p className="text-sm text-foreground mt-1">{formatIDR(Number(p.price))}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
