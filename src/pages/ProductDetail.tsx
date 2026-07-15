import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import QuantitySelector from "@/components/QuantitySelector";
import { formatIDR } from "@/lib/currency";
import { resolveProductImage } from "@/lib/productImage";

interface DBProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  description: string | null;
  image_url: string | null;
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [related, setRelated] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase
      .from("products")
      .select("id,slug,name,price,stock,description,image_url")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data);
        setLoading(false);
        if (data) {
          supabase
            .from("products")
            .select("id,slug,name,price,stock,description,image_url")
            .neq("slug", slug)
            .gt("stock", 0)
            .limit(3)
            .then(({ data: rel }) => setRelated(rel || []));
        }
      });
  }, [slug]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-16 text-muted-foreground">Loading…</div>;
  }
  if (!product) return <Navigate to="/shop" replace />;

  const image = resolveProductImage(product.image_url);
  const isSoldOut = product.stock <= 0;

  const handleAddToCart = () => {
    if (isSoldOut) return;
    addItem(
      { slug: product.slug, name: product.name, price: Number(product.price), image },
      quantity,
    );
    toast({
      title: "Added to cart",
      description: `${quantity}× ${product.name} added to your cart.`,
    });
    setQuantity(1);
  };

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 py-8">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="w-full aspect-[4/5] bg-warm-bg">
            <img src={image} alt={product.name} className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-foreground mb-4">{product.name}</h1>
            <p className="text-4xl md:text-5xl font-bold text-foreground mb-6">{formatIDR(Number(product.price))}</p>
            {!isSoldOut && product.stock <= 5 && (
              <p className="text-sm text-accent font-medium mb-4">Only {product.stock} available</p>
            )}
            {product.description && (
              <p className="text-base leading-relaxed text-muted-foreground mb-8">{product.description}</p>
            )}

            {!isSoldOut ? (
              <div className="flex items-stretch gap-3">
                <QuantitySelector quantity={quantity} onChange={setQuantity} />
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Add To Cart
                </button>
              </div>
            ) : (
              <button disabled className="w-full py-3 bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                Sold Out
              </button>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-light text-foreground mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {related.map((p, i) => (
              <Link key={p.id} to={`/product/${p.slug}`} className="group block">
                <div className="bg-[hsl(var(--warm-bg))] aspect-square overflow-hidden mb-4">
                  <img
                    src={resolveProductImage(p.image_url, i % 2 === 0 ? "daster" : "pajamas")}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-base font-light text-foreground mb-1">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{formatIDR(Number(p.price))}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
