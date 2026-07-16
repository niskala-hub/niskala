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
            <h1 className="text-4xl md:text-5xl font-light">The Sleep Dress</h1>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-light text-gray-900 mb-6">
          Effortless comfort, everyday elegance.
        </h2>
        <p className="text-base leading-relaxed text-gray-700 mb-6">
          The Sleep Dress mewakili fondasi dari Niskala — pakaian rumah harian yang dirancang untuk merayakan waktu istirahat Anda. Setiap potongannya dikonstruksi dari material Rayon Crinkle dan Twill yang sangat jatuh dan sejuk di kulit. Diselesaikan dengan palet warna earth-toned yang tenang, menjadikannya kanvas yang sempurna untuk dikenakan dari pagi hingga malam.
        </p>
        <p className="text-base leading-relaxed text-gray-700">
          Terinspirasi dari kebutuhan akan kepraktisan tanpa mengorbankan estetika, siluet A-Line kami memberikan ruang gerak tak terbatas. Material yang sepenuhnya ironless memastikan Anda selalu tampil rapi tanpa usaha ekstra, menjadikannya daster yang tidak hanya nyaman untuk tertidur, namun juga cukup anggun untuk menyambut hari.
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
              <p className="text-lg font-light text-gray-900 mb-2">01 — Sourcing</p>
              <p className="text-sm text-gray-600">Material kain dipilih secara cermat langsung dari pusat tekstil Tasikmalaya, mengutamakan karakter kain yang sejuk, jatuh (flowy), dan memiliki ketahanan cuci yang sangat baik.</p>
            </div>
            <div>
              <p className="text-lg font-light text-gray-900 mb-2">02 — Construct</p>
              <p className="text-sm text-gray-600">Setiap gaun tidur dipotong dan dijahit presisi menggunakan pola yang dirancang untuk kenyamanan maksimal, termasuk integrasi akses busui yang tersembunyi dengan rapi.</p>
            </div>
            <div>
              <p className="text-lg font-light text-gray-900 mb-2">03 — Finish</p>
              <p className="text-sm text-gray-600">Pakaian yang telah selesai dijahit melewati proses Quality Control ketat untuk memastikan kekuatan jahitan dan penempatan label rajut yang tidak mengganggu kenyamanan kulit.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
