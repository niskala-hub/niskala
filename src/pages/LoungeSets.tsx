import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import ProductCard from "@/components/ProductCard";
import ComingSoon from "@/components/ComingSoon";
import setsImg from "@/assets/collections/sets-and-pairs.jpg";

interface DBProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  original_price: number | null;
  status: string | null;
  stock: number;
  image_url: string | null;
}

export default function LoungeSets() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", "pajamas")
        .maybeSingle();
      if (!cat) {
        setProducts([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("products")
        .select("id,slug,name,price,original_price,status,stock,image_url")
        .eq("category_id", cat.id)
        .order("created_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    })();
  }, []);

  if (!loading && products.length === 0) {
    return <ComingSoon title="The Lounge Sets" description="Koleksi The Lounge Sets (Pajamas) belum memiliki produk saat ini dan akan segera hadir. Tetap nantikan rilis produk terbaru dari NISKALA!" />;
  }

  return (
    <>
      {/* Hero */}
      <section className="relative w-full h-[60vh]">
        <img src={setsImg} alt="The Lounge Sets" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-sm uppercase tracking-widest mb-3">Start Fresh</p>
            <h1 className="text-4xl md:text-5xl font-light">The Lounge Sets</h1>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-light text-foreground mb-6">
          Elevated lounging, uncompromising comfort.
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground mb-6">
          Premium Pajamas mewakili visi Niskala tentang keseimbangan—sebuah harmoni antara kenyamanan mutlak dan siluet yang terstruktur. Setelan dua potong ini dikonstruksi dari material Rayon Crinkle pilihan yang memberikan sirkulasi udara maksimal, menjaga kulit tetap sejuk di iklim tropis.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Dirancang dengan potongan kemeja yang longgar dan celana berpotongan lebar (wide-leg), set piyama kami memberikan kebebasan gerak tanpa batas — cukup pantas dan sopan saat Anda harus menerima tamu atau sekadar bersantai di ruang keluarga.
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
                  image: resolveProductImage(p.image_url, "pajamas"),
                  description: "",
                  status: (p.status as any) || "ready",
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
              <p className="text-sm text-muted-foreground">Pemilihan material Rayon terbaik dari pusat tekstil Tasikmalaya, dengan fokus khusus pada kelembutan serat, kemampuan menyerap keringat, dan tekstur crinkle alami yang praktis karena tidak perlu disetrika.</p>
            </div>
            <div>
              <p className="text-lg font-light text-foreground mb-2">02 — Construct</p>
              <p className="text-sm text-muted-foreground">Setiap setelan dijahit dengan ketelitian tinggi, memperhatikan struktur kerah agar tetap rapi, serta menggunakan karet pinggang (waistband) yang sangat fleksibel dan tidak menekan perut.</p>
            </div>
            <div>
              <p className="text-lg font-light text-foreground mb-2">03 — Finish</p>
              <p className="text-sm text-muted-foreground">Pengecekan kualitas menyeluruh pada setiap detail fungsional, mulai dari kekuatan kancing, kerapian lubang kancing, hingga kekuatan jahitan pada celana untuk memastikan daya tahan saat Anda bergerak bebas.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
