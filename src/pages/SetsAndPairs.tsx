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
            <h1 className="text-4xl md:text-5xl font-light">The Lounge Sets</h1>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-light text-gray-900 mb-6">
          Elevated lounging, uncompromising comfort.
        </h2>
        <p className="text-base leading-relaxed text-gray-700 mb-6">
          Premium Pajamas mewakili visi Niskala tentang keseimbangan—sebuah harmoni antara kenyamanan mutlak dan siluet yang terstruktur. Setelan dua potong ini dikonstruksi dari material Rayon Crinkle pilihan yang memberikan sirkulasi udara maksimal, menjaga kulit tetap sejuk di iklim tropis. Hadir dalam rona warna netral yang elegan, koleksi ini mentransformasi waktu luang Anda menjadi sebuah kemewahan sehari-hari.        </p>
        <p className="text-base leading-relaxed text-gray-700">
          Dirancang dengan potongan kemeja yang longgar dan celana berpotongan lebar (wide-leg), set piyama kami memberikan kebebasan gerak tanpa batas. Perpaduan desain kerah yang rapi dan material yang jatuh (flowy) menjadikannya sangat front-door ready—terlalu nyaman untuk dilepas saat tidur, namun cukup pantas dan sopan saat Anda harus menerima tamu atau sekadar bersantai di ruang keluarga.        </p>
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
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-light text-gray-900 mb-8">The Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-lg font-light text-gray-900 mb-2">01 — Sourcing</p>
              <p className="text-sm text-gray-600">Pemilihan material Rayon terbaik dari pusat tekstil Tasikmalaya, dengan fokus khusus pada kelembutan serat, kemampuan menyerap keringat, dan tekstur crinkle alami yang praktis karena tidak perlu disetrika.</p>
            </div>
            <div>
              <p className="text-lg font-light text-gray-900 mb-2">02 — Construct</p>
              <p className="text-sm text-gray-600">Setiap setelan dijahit dengan ketelitian tinggi, memperhatikan struktur kerah agar tetap rapi, serta menggunakan karet pinggang (waistband) yang sangat fleksibel dan tidak menekan perut, memberikan kenyamanan berjam-jam.</p>
            </div>
            <div>
              <p className="text-lg font-light text-gray-900 mb-2">03 — Finish</p>
              <p className="text-sm text-gray-600">Pengecekan kualitas menyeluruh pada setiap detail fungsional, mulai dari kekuatan kancing, kerapian lubang kancing, hingga kekuatan jahitan pada celana untuk memastikan daya tahan saat Anda bergerak bebas.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
