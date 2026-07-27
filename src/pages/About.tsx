import aboutBg from "@/assets/about-bg.jpg";

export default function About() {
  return (
    <article className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-20 md:pb-32">
      {/* Headline */}
      <h1 className="text-3xl md:text-5xl font-light text-foreground mb-10 md:mb-16 leading-tight">
        An exploration in fiber and form.
      </h1>

      {/* First text block */}
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground mb-16 md:mb-24">
        <p>
          Niskala bermula dari sebuah keyakinan sederhana: bahwa pakaian yang kita kenakan di ruang paling privat tidak seharusnya mengorbankan keanggunan demi sebuah kenyamanan. Setiap koleksi kami dirancang untuk memeluk rasa lelah Anda, menggunakan material pilihan seperti Rayon Crinkle dan Rayon Twill yang sejuk, sangat jatuh (flowy), dan menyerap keringat. Lahir dari denyut nadi industri konveksi di Tasikmalaya, kami memadukan tradisi jahitan tangan yang presisi dengan standar kualitas homewear butik premium        </p>
        <p>
          Proses desain kami menitikberatkan pada kebebasan gerak dan fungsionalitas. Menolak kerumitan, setiap potongan siluet A-Line dan setelan piyama Niskala diciptakan agar longgar, ramah untuk ibu menyusui, dan memiliki keunggulan Ironless (tidak perlu disetrika). Ini adalah pakaian yang bergerak selaras dengan tubuh Anda—sangat nyaman untuk rebahan, namun tetap memancarkan keanggunan (front-door ready) saat Anda harus menyambut tamu atau mengambil paket di depan pintu rumah.        </p>
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
          Kami merangkul palet warna yang membumi dan menenangkan jiwa—seperti Charcoal, Sage Green, hingga Oat/Krem yang lembut. Warna-warna ini dipilih bukan sekadar demi estetika, melainkan untuk menciptakan resonansi ketenangan di ruang pribadi Anda, memantulkan ritme lambat dari momen istirahat yang paling berharga.        </p>
        <p>
          Koleksi Niskala dirilis dalam skala batch yang kecil dan penuh perhitungan. Kami percaya pada prinsip memproduksi secara lebih esensial, namun mengeksekusinya dengan sangat baik. Saat Anda mengenakan Niskala, Anda tidak hanya memakai sepotong daster atau piyama; Anda sedang mengenakan sebuah ketenangan, keleluasaan, dan intensi dari kami yang peduli pada setiap detail jahitan        </p>
      </div>

      {/* Attribution */}
      <p className="text-sm text-muted-foreground">
        Homewear premium oleh Niskala.
      </p>
    </article>
  );
}
