import { useEffect, useMemo, useState } from "react";
import {
  Instagram, Mail, ShoppingBag, Globe, Youtube, MessageCircle,
  MapPin, Link2, Facebook, Music2, Phone, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo/Logo NISKALA Circle.svg";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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

  const handleVisit = (id: string) => {
    supabase.rpc("increment_bio_link_click", { _link_id: id });
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--warm-bg))]">
      <div className="w-full max-w-md mx-auto px-6 pt-16 pb-16">
        <div className="flex flex-col items-center text-center mb-10">
          <img src={logo} alt="NISKALA" className="w-16 h-16 mb-5" />
          <h1 className="font-serif text-2xl tracking-[0.3em] uppercase text-foreground">
            NISKALA
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Handcrafted knitwear for a considered life.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No links yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((link, i) => {
              const Icon = getIcon(link.icon);
              return (
                <a
                  key={link.id}
                  href={link.url}
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
