import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import ProductCard from "@/components/ProductCard";
import ComingSoon from "@/components/ComingSoon";
import coreCollectionImg from "@/assets/collections/core-collection.jpg";

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

export default function SleepDress() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", "daster")
        .maybeSingle();
      if (!cat) {
        setProducts([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("products")
        .select("id,slug,name,price,original_price,status,price_status,stock,image_url")
        .eq("category_id", cat.id)
        .order("created_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    })();
  }, []);

  if (!loading && products.length === 0) {
    return <ComingSoon title="The Sleep Dress" description="Koleksi The Sleep Dress (Daster) belum memiliki produk saat ini dan akan segera hadir. Tetap nantikan rilis produk terbaru dari NISKALA!" />;
  }

  return (
    <>
      {/* Hero */}
      <section className="relative w-full h-[60vh]">
        <img src={coreCollectionImg} alt="The Sleep Dress" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-sm uppercase tracking-widest mb-3">Explore</p>
            <h1 className="text-4xl md:text-5xl font-light">The Sleep Dress</h1>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-light text-foreground mb-6">
          Effortless comfort, everyday elegance.
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground mb-6">
          The Sleep Dress mewakili fondasi dari Niskala — Niskala merangkul keceriaan melalui eksplorasi motif yang kaya dan palet warna-warni yang hidup. Dari kesegaran corak floral (bunga) yang membangkitkan suasana hati, hingga pesona ritmis dari motif polkadot yang ekspresif. Setiap rona dan pola ini dipilih secara saksama untuk mewakili karakter Anda, menghadirkan percikan kebahagiaan (mood-boosting) di setiap momen istirahat Anda.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Terinspirasi dari kebutuhan akan kepraktisan tanpa mengorbankan estetika, siluet A-Line kami memberikan ruang gerak tak terbatas. Material yang sepenuhnya ironless memastikan Anda selalu tampil rapi tanpa usaha ekstra.
        </p>
      </section>

      {/* Products */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-12">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground">No products in this collection yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  slug: p.slug,
                  name: p.name,
                  price: Number(p.price),
                  original_price: p.original_price ? Number(p.original_price) : undefined,
                  image: resolveProductImage(p.image_url, "daster"),
                  description: "",
                  status: (p.status as any) || "ready",
                  price_status: p.price_status,
                  stock: p.stock,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Process */}
      <section className="bg-muted/30 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-light text-foreground mb-8">The Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-lg font-light text-foreground mb-2">01 — Sourcing</p>
              <p className="text-sm text-muted-foreground">Material kain dipilih secara cermat langsung dari pusat tekstil Tasikmalaya, mengutamakan karakter kain yang sejuk, jatuh (flowy), dan memiliki ketahanan cuci yang sangat baik.</p>
            </div>
            <div>
              <p className="text-lg font-light text-foreground mb-2">02 — Construct</p>
              <p className="text-sm text-muted-foreground">Setiap gaun tidur dipotong dan dijahit presisi menggunakan pola yang dirancang untuk kenyamanan maksimal, termasuk integrasi akses busui yang tersembunyi dengan rapi.</p>
            </div>
            <div>
              <p className="text-lg font-light text-foreground mb-2">03 — Finish</p>
              <p className="text-sm text-muted-foreground">Pakaian yang telah selesai dijahit melewati proses Quality Control ketat untuk memastikan kekuatan jahitan dan penempatan label rajut yang tidak mengganggu kenyamanan kulit.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
