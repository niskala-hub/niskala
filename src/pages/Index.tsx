import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import coreCollection from "@/assets/collections/core-collection.jpg";
import setsAndPairs from "@/assets/collections/sets-and-pairs.jpg";
import NewsletterSignup from "@/components/NewsletterSignup";
import { featuredProducts as fallbackFeatured } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/productImage";
import ProductCard from "@/components/ProductCard";

interface DBProduct {
  slug: string;
  name: string;
  price: number;
  original_price: number | null;
  status: string | null;
  price_status: string | null;
  stock: number;
  image_url: string | null;
}

export default function Index() {
  const [dbProducts, setDbProducts] = useState<DBProduct[] | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<{ daster: number; pajamas: number }>({ daster: 0, pajamas: 0 });

  useEffect(() => {
    (async () => {
      // 1. Fetch featured products
      const { data: pData } = await supabase
        .from("products")
        .select("slug,name,price,original_price,status,price_status,stock,image_url")
        .order("created_at", { ascending: false })
        .limit(3);
      setDbProducts(pData || []);

      // 2. Fetch categories with slug 'daster' and 'pajamas'
      const { data: cats } = await supabase
        .from("categories")
        .select("id,slug")
        .in("slug", ["daster", "pajamas"]);

      const dasterCat = cats?.find(c => c.slug === "daster");
      const pajamasCat = cats?.find(c => c.slug === "pajamas");

      let dasterCount = 0;
      let pajamasCount = 0;

      if (dasterCat) {
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("category_id", dasterCat.id);
        dasterCount = count ?? 0;
      }

      if (pajamasCat) {
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("category_id", pajamasCat.id);
        pajamasCount = count ?? 0;
      }

      setCategoryCounts({ daster: dasterCount, pajamas: pajamasCount });
    })();
  }, []);

  const featured = dbProducts && dbProducts.length > 0
    ? dbProducts.map((p, i) => ({
      slug: p.slug,
      name: p.name,
      price: Number(p.price),
      original_price: p.original_price ? Number(p.original_price) : undefined,
      image: resolveProductImage(p.image_url, i % 2 === 0 ? "daster" : "pajamas"),
      status: (p.status as any) || "ready",
      price_status: p.price_status,
      stock: p.stock,
    }))
    : fallbackFeatured.map(p => ({
      slug: p.slug,
      name: p.name,
      price: p.price,
      original_price: p.originalPrice,
      image: p.image,
      status: (p.status as any) || "ready",
      price_status: p.price_status,
      stock: p.stock ?? 10,
    }));

  return (
    <>
      {/* Hero — full bleed, header overlays this */}
      <section className="w-full h-[70vh] min-h-[480px] relative -mt-[72px] overflow-hidden">
        <img
          src={heroBg}
          alt="Handcrafted artisan knitwear"
          className="w-full h-full object-cover object-[68%_center] sm:object-[65%_center] md:object-[62%_center] lg:object-center"
        />
        <div className="absolute inset-0 bg-black/20 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-12 md:pb-20">
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-light text-white tracking-wide max-w-7xl mx-auto leading-none">
            New Collection
          </h1>
        </div>
      </section>

      {/* Featured Products — side-by-side layout */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-12 items-start">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-snug">
            Premium homewear for your everyday retreat.
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
            {featured.map(product => (
              <ProductCard
                key={product.slug}
                product={{
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  original_price: product.original_price,
                  image: product.image,
                  description: "",
                  status: product.status,
                  price_status: product.price_status,
                  stock: product.stock,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Collections — tight gap, polished overlays */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* The Sleep Dress (Daster) */}
          <Link to="/collections/sleep-dress" className="relative overflow-hidden group block">
            <img
              src={coreCollection}
              alt="The Core Collection"
              className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />

            {/* COMING SOON Overlay when 0 products in category */}
            {categoryCounts.daster === 0 && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                <span className="text-white/95 font-extrabold text-xl md:text-3xl tracking-[0.25em] uppercase border-2 border-white/80 px-6 py-2 rotate-[-8deg] shadow-2xl bg-black/40 select-none">
                  COMING SOON
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-500 flex flex-col justify-between p-8 z-20">
              <span className="text-sm uppercase tracking-widest text-white/80">Explore</span>
              <h3 className="text-2xl md:text-3xl font-light text-white">The Sleep Dress</h3>
            </div>
          </Link>

          {/* The Lounge Sets (Pajamas) */}
          <Link to="/collections/lounge-sets" className="relative overflow-hidden group block">
            <img
              src={setsAndPairs}
              alt="Sets and Pairs"
              className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />

            {/* COMING SOON Overlay when 0 products in category */}
            {categoryCounts.pajamas === 0 && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                <span className="text-white/95 font-extrabold text-xl md:text-3xl tracking-[0.25em] uppercase border-2 border-white/80 px-6 py-2 rotate-[-8deg] shadow-2xl bg-black/40 select-none">
                  COMING SOON
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-500 flex flex-col justify-between p-8 z-20">
              <span className="text-sm uppercase tracking-widest text-white/80">Start Fresh</span>
              <h3 className="text-2xl md:text-3xl font-light text-white">The Lounge Sets</h3>
            </div>
          </Link>
        </div>
      </section>

      {/* Newsletter */}
      <div className="mt-12">
        <NewsletterSignup />
      </div>
    </>
  );
}
