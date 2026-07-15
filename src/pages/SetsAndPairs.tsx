import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import setsImg from "@/assets/collections/sets-and-pairs.jpg";

const setsProducts = products.filter(p =>
  ["golden-mist-pair", "classic-set", "country-feast-set", "salt-spout"].includes(p.slug)
);

export default function SetsAndPairs() {
  return (
    <>
      {/* Hero */}
      <section className="relative w-full h-[60vh]">
        <img src={setsImg} alt="Sets and Pairs" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-sm uppercase tracking-widest mb-3">Start Fresh</p>
            <h1 className="text-4xl md:text-5xl font-light">Sets and Pairs</h1>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-light text-gray-900 mb-6">
          Better together.
        </h2>
        <p className="text-base leading-relaxed text-gray-700 mb-6">
          Our curated sets and pairs are designed to work in harmony — matched yarns, complementary textures, and coordinated tones that bring cohesion to your wardrobe. Whether you're layering for yourself or gifting to someone special, these groupings take the guesswork out of styling.
        </p>
        <p className="text-base leading-relaxed text-gray-700">
          Each set is thoughtfully composed to balance warmth and form. Mix within a set or combine across collections — the earthy palette ensures everything works beautifully together.
        </p>
      </section>

      {/* Products */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {setsProducts.map(product => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      {/* Gift note */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-light text-gray-900 mb-4">The Perfect Gift</h2>
          <p className="text-base text-gray-700 leading-relaxed mb-6">
            Every set ships in our custom gift packaging — tissue-wrapped and nestled in a recycled kraft box. Add a handwritten note at checkout to make it personal.
          </p>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Free shipping on all sets</p>
        </div>
      </section>
    </>
  );
}
