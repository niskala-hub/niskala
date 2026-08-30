import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({
  title = "Coming Soon",
  description = "Koleksi ini belum memiliki produk dan akan segera hadir dengan pilihan terbatas untuk Anda. Tetap nantikan rilis terbaru dari NISKALA!",
}: ComingSoonProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-center bg-[hsl(var(--warm-bg))]">
      <div className="max-w-lg mx-auto p-8 sm:p-12 border border-border/80 bg-background/60 backdrop-blur-sm shadow-xl space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 mb-1">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-xs uppercase tracking-[0.25em] font-semibold text-amber-700 bg-amber-100/80 px-3 py-1 rounded-full">
            Coming Soon
          </span>
          <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-foreground uppercase pt-2">
            {title}
          </h1>
        </div>

        <div className="w-16 h-0.5 bg-primary/40 mx-auto" />

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Halaman Utama
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center px-6 py-3 border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            Jelajahi Katalog Produk
          </Link>
        </div>
      </div>
    </div>
  );
}
