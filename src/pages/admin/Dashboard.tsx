import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Tags } from "lucide-react";

export default function Dashboard() {
  const [counts, setCounts] = useState({ products: 0, categories: 0 });

  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
      ]);
      setCounts({ products: p.count ?? 0, categories: c.count ?? 0 });
    })();
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-light mb-2">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-8">Welcome to NISKALA admin.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="border border-border p-6">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Package className="w-5 h-5" /> <span className="text-sm uppercase tracking-wider">Products</span>
          </div>
          <p className="text-4xl font-light">{counts.products}</p>
        </div>
        <div className="border border-border p-6">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Tags className="w-5 h-5" /> <span className="text-sm uppercase tracking-wider">Categories</span>
          </div>
          <p className="text-4xl font-light">{counts.categories}</p>
        </div>
      </div>
    </div>
  );
}
