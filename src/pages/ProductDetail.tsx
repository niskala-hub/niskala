import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatIDR } from "@/lib/currency";
import { resolveProductImage } from "@/lib/productImage";
import { getProductStatusInfo } from "@/lib/product";
import { Check, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";

interface DBProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  original_price: number | null;
  status: string | null;
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

interface Size {
  id: string;
  category: string;
  ld: number;
  sort_order: number;
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
  const [sizes, setSizes] = useState<Size[]>([]);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
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
    const capped = unique.slice(0, 5);
    return capped.length > 0 ? capped : [resolveProductImage(null)];
  };

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setModelId(null);
    setMotifId(null);
    setActiveImage(null);
    setSizeId(null);
    setLightbox(null);

    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,slug,name,price,original_price,status,stock,description,image_url,image_urls")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      setProduct(data);
      setLoading(false);
      if (!data) return;

      const [{ data: mods }, { data: rel }, { data: szs }] = await Promise.all([
        supabase
          .from("product_models")
          .select("id,name,sort_order,product_motifs(id,name,image_url,stock,sort_order)")
          .eq("product_id", data.id)
          .order("sort_order"),
        supabase
          .from("products")
          .select("id,slug,name,price,original_price,status,stock,description,image_url,image_urls")
          .neq("slug", slug)
          .gt("stock", 0)
          .limit(3),
        supabase
          .from("product_sizes")
          .select("id,category,ld,sort_order")
          .eq("product_id", data.id)
          .order("sort_order"),
      ]);
      if (cancelled) return;
      const sorted = ((mods as Model[]) || []).map(m => ({
        ...m,
        product_motifs: [...(m.product_motifs || [])].sort((a, b) => a.sort_order - b.sort_order),
      }));
      setModels(sorted);
      if (sorted.length > 0) setModelId(sorted[0].id);
      setRelated((rel as DBProduct[]) || []);
      setSizes((szs as Size[]) || []);
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
  ]
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 5);

  const selectedSize = sizes.find(s => s.id === sizeId) || null;
  const hasVariants = models.length > 0;
  const needsChoice =
    (hasVariants && (!modelId || (motifs.length > 0 && !motifId))) || (sizes.length > 0 && !sizeId);

  const statusInfo = getProductStatusInfo({
    status: product.status,
    stock: product.stock,
  });

  const isSoldOut = statusInfo.isSold || (selectedMotif ? selectedMotif.stock <= 0 : false);
  const isComingSoon = statusInfo.isComingSoon;

  const productUrl =
    typeof window !== "undefined" ? `${window.location.origin}/product/${product.slug}` : "";
  const waText = `Halo NISKALA, saya ingin memesan:\n\n${product.name}${
    selectedModel ? `\nModel: ${selectedModel.name}` : ""
  }${selectedMotif ? `\nMotif: ${selectedMotif.name}` : ""}${
    selectedSize ? `\nSize: ${selectedSize.category} (LD ${selectedSize.ld} cm)` : ""
  }\n${productUrl}`;

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
            <button
              type="button"
              onClick={() => setLightbox(Math.max(0, galleryThumbs.indexOf(mainImage)))}
              className="group relative w-full aspect-[4/5] bg-[hsl(var(--warm-bg))] overflow-hidden cursor-zoom-in"
              aria-label="Perbesar gambar"
            >
              <img
                key={mainImage}
                src={mainImage}
                alt={`${product.name}${selectedMotif ? ` – motif ${selectedMotif.name}` : ""}`}
                className="w-full h-full object-cover object-center animate-[fadeIn_0.3s_ease] transition-transform duration-500 group-hover:scale-[1.03]"
              />

              {/* Watermark overlay when SOLD OUT */}
              {isSoldOut && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
                  <span className="text-white/95 font-bold text-lg md:text-2xl tracking-[0.25em] uppercase border-2 border-white/80 px-5 py-2 rotate-[-10deg] shadow-2xl bg-black/40 select-none">
                    SOLD OUT
                  </span>
                </div>
              )}

              {/* Coming Soon overlay tag */}
              {isComingSoon && !isSoldOut && (
                <span className="absolute top-3 left-3 bg-amber-600/90 text-white font-medium text-xs px-2.5 py-1 tracking-wider uppercase shadow">
                  Coming Soon
                </span>
              )}

              <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-background/85 text-foreground text-[11px] px-2 py-1 z-20">
                <ZoomIn className="w-3.5 h-3.5" /> Zoom
              </span>
            </button>

            {galleryThumbs.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {galleryThumbs.map((url, i) => {
                  const active = url === mainImage;
                  return (
                    <button
                      key={url + i}
                      onClick={() => setActiveImage(url)}
                      className={`w-full aspect-[4/5] overflow-hidden border transition-all duration-200 ${
                        active
                          ? "border-primary opacity-100"
                          : "border-border opacity-60 hover:opacity-100"
                      }`}
                      aria-label={`Lihat gambar ${i + 1}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover object-center" loading="lazy" />
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

            {/* Price section: Discount price (normal) & Original price (strikethrough) */}
            <div className="flex items-baseline gap-3 mb-4 md:mb-6">
              <span className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                {formatIDR(Number(product.price))}
              </span>
              {product.original_price && Number(product.original_price) > Number(product.price) && (
                <span className="text-xl md:text-2xl text-muted-foreground/60 line-through font-normal">
                  {formatIDR(Number(product.original_price))}
                </span>
              )}
            </div>

            {!isSoldOut && !isComingSoon && product.stock > 0 && product.stock <= 5 && !selectedMotif && (
              <p className="text-sm text-accent font-medium mb-4">Hanya {product.stock} tersedia</p>
            )}
            {product.description && (
              <p className="text-sm md:text-base leading-relaxed text-muted-foreground mb-6 md:mb-8">
                {product.description}
              </p>
            )}

            {sizes.length > 0 && (
              <div className="mb-8">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Pilih Size
                  {selectedSize && (
                    <span className="ml-2 normal-case tracking-normal text-foreground">
                      {selectedSize.category} · LD {selectedSize.ld} cm
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSizeId(s.id)}
                      className={`px-4 py-2 text-sm border text-left transition-colors ${
                        s.id === sizeId
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-foreground hover:border-primary"
                      }`}
                    >
                      {s.category}
                      <span className="block text-[11px] opacity-80">LD {s.ld} cm</span>
                    </button>
                  ))}
                </div>
              </div>
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
              <button disabled className="w-full py-3.5 bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed border border-border">
                Sold Out
              </button>
            ) : isComingSoon ? (
              <button disabled className="w-full py-3.5 bg-muted text-muted-foreground/80 text-sm font-medium cursor-not-allowed border border-border opacity-70">
                Coming Soon
              </button>
            ) : needsChoice ? (
              <button disabled className="w-full py-3.5 bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                Pilih size, model & motif terlebih dahulu
              </button>
            ) : (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity text-center block"
              >
                Order Via WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {lightbox !== null && galleryThumbs[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 text-background"
            aria-label="Tutup"
          >
            <X className="w-6 h-6" />
          </button>

          {galleryThumbs.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setLightbox((lightbox - 1 + galleryThumbs.length) % galleryThumbs.length); }}
                className="absolute left-2 md:left-6 p-2 text-background"
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setLightbox((lightbox + 1) % galleryThumbs.length); }}
                className="absolute right-2 md:right-6 p-2 text-background"
                aria-label="Berikutnya"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          <img
            src={galleryThumbs[lightbox]}
            alt={product.name}
            onClick={e => e.stopPropagation()}
            className="max-h-[85vh] max-w-full object-contain"
          />
          <span className="absolute bottom-5 text-background/80 text-xs">
            {lightbox + 1} / {galleryThumbs.length}
          </span>
        </div>
      )}

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <h2 className="text-xl md:text-2xl font-light text-foreground mb-6 md:mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {related.map((p, i) => (
              <Link key={p.id} to={`/product/${p.slug}`} className="group block">
                <div className="bg-[hsl(var(--warm-bg))] aspect-[4/5] overflow-hidden mb-3 md:mb-4">
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
