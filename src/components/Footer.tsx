import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import logoTypografi from "@/assets/logo/Logo NISKALA Typografi.svg";
import { TikTokIcon } from "@/components/icons/TikTok";

const INSTAGRAM_URL = "https://www.instagram.com/niskala.wear/";
const TIKTOK_URL = "https://www.tiktok.com/@niskala.wear.official";

export default function Footer() {
  return (
    <footer className="bg-background py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-12">
          <div>
            <img src={logoTypografi} alt="NISKALA" className="h-6 w-auto mb-4" />
            <p className="text-sm text-muted-foreground">Premium homewear & casual wear for modern women.</p>
            <div className="flex gap-4 mt-6">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram className="w-[18px] h-[18px] text-muted-foreground hover:text-foreground transition-colors" />
              </a>
              <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <TikTokIcon className="w-[18px] h-[18px] text-muted-foreground hover:text-foreground transition-colors" />
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Shop</Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
          </div>
          <div className="flex flex-col gap-3">
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
