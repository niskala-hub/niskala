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
  image_urls: string[] | null;
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [related, setRelated] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { addItem } = useCart();
  const { toast } = useToast();

  /* ── Build deduplicated image list ── */
  const buildImageList = (p: DBProduct): string[] => {
    const urls: string[] = [];
    if (p.image_urls && p.image_urls.length > 0) {
      urls.push(...p.image_urls);
    } else if (p.image_url) {
      urls.push(p.image_url);
    }
    // deduplicate while preserving order
    const seen = new Set<string>();
    const unique = urls.filter(u => {
      if (!u || seen.has(u)) return false;
      seen.add(u);
      return true;
    });
    // cap at 4 images max
    const capped = unique.slice(0, 4);
    return capped.length > 0 ? capped : [resolveProductImage(null)];
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setSelectedIdx(0);
    supabase
      .from("products")
      .select("id,slug,name,price,stock,description,image_url,image_urls")
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

  const images = buildImageList(product);
  const mainImage = images[selectedIdx] || images[0];
  const isSoldOut = product.stock <= 0;

  const handleAddToCart = () => {
    if (isSoldOut) return;
    addItem(
      { slug: product.slug, name: product.name, price: Number(product.price), image: images[0] },
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
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <nav className="text-sm text-muted-foreground mb-4 md:mb-6">
          <Link to="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">
          {/* ── Image gallery ── */}
          <div className="flex flex-col gap-3">
            {/* Main image */}
            <div className="w-full aspect-[4/5] bg-warm-bg overflow-hidden">
              <img
                key={mainImage}
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover animate-[fadeIn_0.3s_ease]"
              />
            </div>

            {/* Thumbnails — 4-col grid, no empty space */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((url, i) => (
                  <button
                    key={url + i}
                    onClick={() => setSelectedIdx(i)}
                    className={`
                      w-full aspect-square overflow-hidden border-2 transition-all duration-200
                      ${i === selectedIdx
                        ? "border-primary ring-1 ring-primary/30 opacity-100"
                        : "border-transparent opacity-60 hover:opacity-100"
                      }
                    `}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img
                      src={url}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold uppercase tracking-wide text-foreground mb-3 md:mb-4">{product.name}</h1>
            <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6">{formatIDR(Number(product.price))}</p>
            {!isSoldOut && product.stock <= 5 && (
              <p className="text-sm text-accent font-medium mb-4">Only {product.stock} available</p>
            )}
            {product.description && (
              <p className="text-sm md:text-base leading-relaxed text-muted-foreground mb-6 md:mb-8">{product.description}</p>
            )}

            {!isSoldOut ? (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Halo NISKALA, saya ingin memesan:\n\n${product.name}\n${typeof window !== "undefined" ? window.location.origin : ""}/product/${product.slug}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity text-center"
              >
                Order Via WhatsApp
              </a>
            ) : (
              <button disabled className="w-full py-3 bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                Sold Out
              </button>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <h2 className="text-xl md:text-2xl font-light text-foreground mb-6 md:mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {related.map((p, i) => (
              <Link key={p.id} to={`/product/${p.slug}`} className="group block">
                <div className="bg-[hsl(var(--warm-bg))] aspect-square overflow-hidden mb-3 md:mb-4">
                  <img
                    src={resolveProductImage(p.image_url, i % 2 === 0 ? "daster" : "pajamas")}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-sm md:text-base font-light text-foreground mb-1 truncate">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{formatIDR(Number(p.price))}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
