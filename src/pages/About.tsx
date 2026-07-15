import aboutBg from "@/assets/about-bg.jpg";

export default function About() {
  return (
    <article className="max-w-3xl mx-auto px-6 pt-8 pb-32">
      {/* Headline */}
      <h1 className="text-4xl md:text-5xl font-light text-foreground mb-16 leading-tight">
        An exploration in fiber and form.
      </h1>

      {/* First text block */}
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground mb-24">
        <p>
          Terra Studios began with a simple conviction: that the clothes we wear should carry the warmth of the hands that made them. Every piece in our collection is hand-knitted from natural fibers — merino, alpaca, cashmere, and heritage breed wools — sourced from small farms and independent spinners who share our commitment to ethical, sustainable practice.
        </p>
        <p>
          Our process is slow by design. Each garment begins as a skein of yarn, carefully wound and paired with a pattern developed in-house. From there, skilled artisans work stitch by stitch, shaping fabric that moves and breathes with the body. The result is knitwear with a depth of texture and character that no machine can replicate — pieces that age gracefully, soften over time, and become more personal with every wear.
        </p>
      </div>

      {/* Full-width image */}
      <div className="w-full mb-24">
        <img
          src={aboutBg}
          alt="Artisan knitting natural wool with wooden needles"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Second text block */}
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground mb-16">
        <p>
          We work exclusively with natural, undyed and plant-dyed yarns, embracing the subtle tonal variations that come from the fleece itself. Our earth-toned palette — sand, oatmeal, rust, charcoal, moss — reflects the landscapes that inspire us: windswept coastlines, autumn moorlands, and the quiet beauty of the countryside in every season.
        </p>
        <p>
          Each collection is released in small batches, and many pieces are made to order. We believe in making less and making it well. When you wear Terra Studios, you carry with you the rhythm of the needles, the texture of the yarn, and the intention of a maker who cared about every single stitch.
        </p>
      </div>

      {/* Attribution */}
      <p className="text-sm text-muted-foreground">
        Knitwear by Terra Studios
      </p>
    </article>
  );
}
