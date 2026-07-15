import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import coreCollectionImg from "@/assets/collections/core-collection.jpg";

const coreProducts = products.filter(p => 
  ["spring-blade", "classic-set", "harvest-moon-cup", "golden-blush-cup"].includes(p.slug)
);

export default function CoreCollection() {
  return (
    <>
      {/* Hero */}
      <section className="relative w-full h-[60vh]">
        <img src={coreCollectionImg} alt="The Core Collection" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-sm uppercase tracking-widest mb-3">Explore</p>
            <h1 className="text-4xl md:text-5xl font-light">The Core Collection</h1>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-light text-gray-900 mb-6">
          Rooted in craft, built to last.
        </h2>
        <p className="text-base leading-relaxed text-gray-700 mb-6">
          The Core Collection represents the foundation of Terra Studios — everyday knitwear designed for quiet ritual. Each piece is hand-knitted from responsibly sourced natural yarns, finished in our signature earth-toned palette that layers effortlessly across seasons.
        </p>
        <p className="text-base leading-relaxed text-gray-700">
          Inspired by the textures of the natural world, these designs celebrate the beauty of imperfection. No two garments are identical — the subtle variations in tension, stitch, and dye are what make each piece unmistakably handmade.
        </p>
      </section>

      {/* Products */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {coreProducts.map(product => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-light text-gray-900 mb-8">The Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-lg font-light text-gray-900 mb-2">01 — Spin</p>
              <p className="text-sm text-gray-600">Raw fleece is washed, carded, and spun into yarn by hand on traditional drop spindles and spinning wheels.</p>
            </div>
            <div>
              <p className="text-lg font-light text-gray-900 mb-2">02 — Knit</p>
              <p className="text-sm text-gray-600">Each garment is hand-knitted stitch by stitch, following patterns developed in-house for fit, drape, and durability.</p>
            </div>
            <div>
              <p className="text-lg font-light text-gray-900 mb-2">03 — Finish</p>
              <p className="text-sm text-gray-600">Completed pieces are gently blocked, seamed, and inspected — ensuring every detail meets our standard before it leaves the studio.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
