import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Instagram, Mail, ShoppingBag, Globe, Youtube, MessageCircle,
  MapPin, Link2, Facebook, Music2, Phone, Star,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo/Logo NISKALA Circle.svg";

const ICON_MAP: Record<string, LucideIcon> = {
  Instagram, Mail, ShoppingBag, Globe, Youtube, MessageCircle,
  MapPin, Facebook, Music2, Phone, Star, Link2,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

const getIcon = (name: string) => ICON_MAP[name] || Link2;

interface BioLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  order: number;
  is_active: boolean;
  clicks: number;
}

const formatUrl = (url: string) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:") || url.startsWith("tel:")) {
    return url;
  }
  return `https://${url}`;
};

export default function LinkBio() {
  const [links, setLinks] = useState<BioLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("bio_links")
      .select("*")
      .eq("is_active", true)
      .order("order", { ascending: true })
      .then(({ data }) => {
        setLinks(data || []);
        setLoading(false);
      });
  }, []);

  const visible = useMemo(() => links, [links]);

  const handleVisit = async (id: string) => {
    // Optimistic local state update for instant response
    setLinks((prev) =>
      prev.map((link) =>
        link.id === id ? { ...link, clicks: (link.clicks || 0) + 1 } : link
      )
    );

    try {
      const { error } = await supabase.rpc("increment_bio_link_click", { _link_id: id });
      if (error) {
        console.error("Failed to increment link click count:", error);
      }
    } catch (err) {
      console.error("Error incrementing link click count:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--warm-bg))]">
      <div className="w-full max-w-md mx-auto px-6 pt-16 pb-16">
        <Link to="/" className="flex flex-col items-center text-center mb-10 group cursor-pointer">
          <img src={logo} alt="NISKALA" className="w-16 h-16 mb-5 transition-transform group-hover:scale-105" />
          <h1 className="font-serif text-2xl tracking-[0.3em] uppercase text-foreground group-hover:text-accent transition-colors">
            NISKALA
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Handcrafted knitwear for a considered life.
          </p>
        </Link>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No links yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((link, i) => {
              const Icon = getIcon(link.icon);
              const formattedUrl = formatUrl(link.url);
              return (
                <a
                  key={link.id}
                  href={formattedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleVisit(link.id)}
                  className="flex items-center gap-3 w-full px-5 py-4 bg-background border border-border hover:border-accent transition-colors"
                  style={{ animation: `fadeIn 0.4s ease ${i * 70}ms both` }}
                >
                  <Icon size={18} className="text-accent" />
                  <span className="text-sm font-medium tracking-wide text-foreground">
                    {link.title}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
