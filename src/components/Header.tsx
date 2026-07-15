import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, Instagram } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  
];

export default function Header() {
  const { totalItems } = useCart();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = isHome && !scrolled && !mobileOpen;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        transparent
          ? "bg-transparent border-b border-transparent"
          : "bg-white border-b border-border shadow-sm"
      )}
    >
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link
          to="/"
          className={cn(
            "text-2xl font-light tracking-wide transition-colors",
            transparent ? "text-white" : "text-foreground"
          )}
        >
          Terra Studios
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-sm uppercase tracking-wider transition-colors",
                transparent
                  ? "text-white/80 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
                pathname === link.to && (transparent ? "text-white font-medium" : "text-foreground font-medium")
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-5">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Instagram className={cn("w-[18px] h-[18px] transition-colors", transparent ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground")} />
          </a>
          <Link to="/cart" className="relative" aria-label="Shopping cart">
            <ShoppingCart className={cn("w-[18px] h-[18px] transition-colors", transparent ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground")} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-medium">
                {totalItems}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-4">
          <Link to="/cart" className="relative" aria-label="Shopping cart">
            <ShoppingCart className={cn("w-5 h-5 transition-colors", transparent ? "text-white" : "text-foreground")} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-medium">
                {totalItems}
              </span>
            )}
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen
              ? <X className={cn("w-6 h-6", transparent ? "text-white" : "text-foreground")} />
              : <Menu className={cn("w-6 h-6", transparent ? "text-white" : "text-foreground")} />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-white px-6 py-6 space-y-4">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block text-sm uppercase tracking-wider text-muted-foreground",
                pathname === link.to && "text-foreground font-medium"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
