import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import ProductCard from "@/components/ProductCard";

interface DBProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  original_price: number | null;
  status: string | null;
  price_status: string | null;
  stock: number;
  image_url: string | null;
}

export default function Shop() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,slug,name,price,original_price,status,price_status,stock,image_url")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--warm-bg))]">
      <div className="py-10 md:py-16 text-center">
        <h1 className="text-3xl md:text-5xl font-light text-foreground">Shop</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-16 md:pb-24">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground">No products available yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {products.map((p, i) => (
              <ProductCard
                key={p.id}
                product={{
                  slug: p.slug,
                  name: p.name,
                  price: Number(p.price),
                  original_price: p.original_price ? Number(p.original_price) : undefined,
                  image: resolveProductImage(p.image_url, i % 2 === 0 ? "daster" : "pajamas"),
                  description: "",
                  status: (p.status as any) || "ready",
                  price_status: p.price_status,
                  stock: p.stock,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
