import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatIDR } from "@/lib/currency";
import { resolveProductImage } from "@/lib/productImage";
import { Check } from "lucide-react";

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

interface Motif {
  id: string;
  name: string;
  image_url: string | null;
  stock: number;
  sort_order: number;
}

interface Model {
  id: string;
  name: string;
  sort_order: number;
  product_motifs: Motif[];
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [related, setRelated] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelId, setModelId] = useState<string | null>(null);
  const [motifId, setMotifId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const { toast } = useToast();

  const buildImageList = (p: DBProduct): string[] => {
    const urls =
      p.image_urls && p.image_urls.length > 0 ? [...p.image_urls] : p.image_url ? [p.image_url] : [];
    const seen = new Set<string>();
    const unique = urls.filter(u => {
      if (!u || seen.has(u)) return false;
      seen.add(u);
      return true;
    });
    const capped = unique.slice(0, 4);
    return capped.length > 0 ? capped : [resolveProductImage(null)];
  };

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setModelId(null);
    setMotifId(null);
    setActiveImage(null);

    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,slug,name,price,stock,description,image_url,image_urls")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      setProduct(data);
      setLoading(false);
      if (!data) return;

      const [{ data: mods }, { data: rel }] = await Promise.all([
        supabase
          .from("product_models")
          .select("id,name,sort_order,product_motifs(id,name,image_url,stock,sort_order)")
          .eq("product_id", data.id)
          .order("sort_order"),
        supabase
          .from("products")
          .select("id,slug,name,price,stock,description,image_url,image_urls")
          .neq("slug", slug)
          .gt("stock", 0)
          .limit(3),
      ]);
      if (cancelled) return;
      const sorted = ((mods as Model[]) || []).map(m => ({
        ...m,
        product_motifs: [...(m.product_motifs || [])].sort((a, b) => a.sort_order - b.sort_order),
      }));
      setModels(sorted);
      if (sorted.length > 0) setModelId(sorted[0].id);
      setRelated((rel as DBProduct[]) || []);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-16 text-muted-foreground">Loading…</div>;
  }
  if (!product) return <Navigate to="/shop" replace />;

  const images = buildImageList(product);
  const selectedModel = models.find(m => m.id === modelId) || null;
  const motifs = selectedModel?.product_motifs || [];
  const selectedMotif = motifs.find(m => m.id === motifId) || null;

  const mainImage = activeImage || selectedMotif?.image_url || images[0];
  const galleryThumbs = [
    ...(selectedMotif?.image_url ? [selectedMotif.image_url] : []),
    ...images,
  ].filter((u, i, arr) => arr.indexOf(u) === i);

  const hasVariants = models.length > 0;
  const needsChoice = hasVariants && (!modelId || (motifs.length > 0 && !motifId));
  const isSoldOut =
    product.stock <= 0 || (selectedMotif ? selectedMotif.stock <= 0 : false);

  const productUrl =
    typeof window !== "undefined" ? `${window.location.origin}/product/${product.slug}` : "";
  const waText = `Halo NISKALA, saya ingin memesan:\n\n${product.name}${
    selectedModel ? `\nModel: ${selectedModel.name}` : ""
  }${selectedMotif ? `\nMotif: ${selectedMotif.name}` : ""}\n${productUrl}`;

  const selectModel = (id: string) => {
    setModelId(id);
    setMotifId(null);
    setActiveImage(null);
  };
  const selectMotif = (m: Motif) => {
    setMotifId(m.id);
    setActiveImage(null);
    if (!m.image_url) toast({ title: `Motif ${m.name} dipilih` });
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
          {/* ── Gallery ── */}
          <div className="lg:sticky lg:top-24 flex flex-col gap-3">
            <div className="w-full aspect-[4/5] bg-[hsl(var(--warm-bg))] overflow-hidden">
              <img
                key={mainImage}
                src={mainImage}
                alt={`${product.name}${selectedMotif ? ` – motif ${selectedMotif.name}` : ""}`}
                className="w-full h-full object-cover animate-[fadeIn_0.3s_ease]"
              />
            </div>

            {galleryThumbs.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {galleryThumbs.map((url, i) => {
                  const active = url === mainImage;
                  return (
                    <button
                      key={url + i}
                      onClick={() => setActiveImage(url)}
                      className={`w-full aspect-square overflow-hidden border transition-all duration-200 ${
                        active
                          ? "border-primary opacity-100"
                          : "border-border opacity-60 hover:opacity-100"
                      }`}
                      aria-label={`Lihat gambar ${i + 1}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Info & variant picker ── */}
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold uppercase tracking-wide text-foreground mb-3 md:mb-4">
              {product.name}
            </h1>
            <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6">
              {formatIDR(Number(product.price))}
            </p>
            {!isSoldOut && product.stock > 0 && product.stock <= 5 && !selectedMotif && (
              <p className="text-sm text-accent font-medium mb-4">Hanya {product.stock} tersedia</p>
            )}
            {product.description && (
              <p className="text-sm md:text-base leading-relaxed text-muted-foreground mb-6 md:mb-8">
                {product.description}
              </p>
            )}

            {hasVariants && (
              <div className="space-y-6 mb-8">
                {/* Step 1 – Model */}
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    1. Pilih Model
                    {selectedModel && <span className="ml-2 normal-case tracking-normal text-foreground">{selectedModel.name}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {models.map(m => (
                      <button
                        key={m.id}
                        onClick={() => selectModel(m.id)}
                        className={`px-4 py-2 text-sm border transition-colors ${
                          m.id === modelId
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:border-primary"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2 – Motif */}
                <div className={selectedModel ? "" : "opacity-40 pointer-events-none"}>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    2. Pilih Motif
                    {selectedMotif && <span className="ml-2 normal-case tracking-normal text-foreground">{selectedMotif.name}</span>}
                  </p>
                  {motifs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada motif untuk model ini.</p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {motifs.map(mo => {
                        const out = mo.stock <= 0;
                        return (
                          <button
                            key={mo.id}
                            onClick={() => !out && selectMotif(mo)}
                            disabled={out}
                            title={mo.name}
                            className={`relative border text-left transition-all ${
                              mo.id === motifId ? "border-primary" : "border-border hover:border-primary"
                            } ${out ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <div className="aspect-square bg-[hsl(var(--warm-bg))] overflow-hidden">
                              <img
                                src={resolveProductImage(mo.image_url)}
                                alt={mo.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            {mo.id === motifId && (
                              <span className="absolute top-1 right-1 bg-primary text-primary-foreground p-0.5">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                            <span className="block px-1 py-1 text-[11px] leading-tight truncate">
                              {out ? "Habis" : mo.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isSoldOut ? (
              <button disabled className="w-full py-3 bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                Sold Out
              </button>
            ) : needsChoice ? (
              <button disabled className="w-full py-3 bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                Pilih model & motif terlebih dahulu
              </button>
            ) : (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity text-center"
              >
                Order Via WhatsApp
              </a>
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
