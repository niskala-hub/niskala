import aboutBg from "@/assets/about-bg.jpg";

export default function About() {
  return (
    <article className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-20 md:pb-32">
      {/* Headline */}
      <h1 className="text-3xl md:text-5xl font-light text-foreground mb-10 md:mb-16 leading-tight">
        The Joy of Everyday Lounging.
      </h1>

      {/* First text block */}
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground mb-16 md:mb-24">
        <p>
          Niskala bermula dari pemikiran sederhana: pakaian di dalam rumah seharusnya bisa membuat Anda merasa bebas, nyaman, sekaligus bahagia. Kami merancang setiap koleksi untuk menyambut keseharian Anda dengan energi positif, menggunakan material pilihan seperti Rayon Crinkle dan Rayon Twill yang sejuk, sangat jatuh (flowy), dan menyerap keringat. Lahir dari denyut nadi industri konveksi di Tasikmalaya, kami memadukan kualitas jahitan yang presisi dengan standar homewear butik premium.
        </p>
        <p>
          Desain kami merayakan kebebasan gerak dan kepraktisan. Menolak kerumitan, setiap potongan siluet A-Line dan setelan piyama Niskala diciptakan agar longgar, ramah untuk ibu menyusui, dan memiliki keunggulan Ironless (tidak perlu disetrika). Ini adalah pakaian yang dirancang untuk ritme kehidupan Anda yang dinamis—sangat leluasa untuk sekadar bersantai, namun tetap memancarkan keanggunan (front-door ready) saat Anda harus menyambut tamu atau mengambil paket di depan pintu rumah.
        </p>
      </div>

      {/* Full-width image */}
      <div className="w-full mb-16 md:mb-24">
        <img
          src={aboutBg}
          alt="Artisan knitting natural wool with wooden needles"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Second text block */}
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground mb-12 md:mb-16">
        <p>
          Kami menolak rona yang monoton. Niskala merangkul keceriaan melalui eksplorasi motif yang kaya dan palet warna-warni yang hidup. Dari kesegaran corak floral (bunga) yang membangkitkan suasana hati, hingga pesona ritmis dari motif polkadot yang ekspresif. Setiap rona dan pola ini dipilih secara saksama untuk mewakili karakter Anda, menghadirkan percikan kebahagiaan (mood-boosting) di setiap momen istirahat Anda.
        </p>
        <p>
          Koleksi Niskala diproduksi dengan penuh perhitungan dan perhatian. Saat Anda mengenakan Niskala, Anda tidak hanya memakai sepotong daster atau piyama; Anda sedang mengenakan semangat positif, keleluasaan, dan dedikasi dari kami yang peduli pada setiap detail jahitan.
        </p>
      </div>

      {/* Attribution */}
      <p className="text-sm text-muted-foreground">
        Homewear premium oleh Niskala.
      </p>
    </article>
  );
}
