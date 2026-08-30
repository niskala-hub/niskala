import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

export const SIZE_CATEGORIES = ["Reguler", "Jumbo Size"] as const;
export type SizeCategory = (typeof SIZE_CATEGORIES)[number];

interface Size {
  id: string;
  category: SizeCategory;
  ld: number;
  sort_order: number;
}

export default function ProductSizes({ productId }: { productId: string }) {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [category, setCategory] = useState<SizeCategory>("Reguler");
  const [ld, setLd] = useState<string>("");
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from("product_sizes")
      .select("id,category,ld,sort_order")
      .eq("product_id", productId)
      .order("sort_order");
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setSizes((data as Size[]) || []);
  };

  useEffect(() => { load(); }, [productId]);

  const add = async () => {
    const value = Number(ld);
    if (!value || value <= 0) return toast({ title: "Isi LD (cm) dulu", variant: "destructive" });
    const { error } = await supabase
      .from("product_sizes")
      .insert({ product_id: productId, category, ld: value, sort_order: sizes.length });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setLd("");
    load();
  };

  const update = async (id: string, patch: Partial<Size>) => {
    const { error } = await supabase.from("product_sizes").update(patch).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("product_sizes").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <div className="border border-border p-3 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Size</p>
        <p className="text-xs text-muted-foreground mt-1">
          Kategori Reguler atau Jumbo Size, cukup isi LD (Lingkar Dada) dalam cm.
        </p>
      </div>

      {sizes.length === 0 && (
        <p className="text-xs text-muted-foreground">Belum ada ukuran untuk produk ini.</p>
      )}

      <div className="space-y-2">
        {sizes.map(s => (
          <div key={s.id} className="flex items-center gap-2">
            <select
              defaultValue={s.category}
              onChange={e => update(s.id, { category: e.target.value as SizeCategory })}
              className="flex-1 px-2 py-1.5 border border-border text-sm bg-background"
            >
              {SIZE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">LD</span>
              <input
                type="number"
                min={1}
                defaultValue={s.ld}
                onBlur={e => update(s.id, { ld: Number(e.target.value) })}
                className="w-20 px-2 py-1.5 border border-border text-sm"
              />
              <span className="text-xs text-muted-foreground">cm</span>
            </div>
            <button type="button" onClick={() => remove(s.id)} className="p-2 text-destructive hover:bg-muted">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value as SizeCategory)}
          className="flex-1 px-3 py-2 border border-border text-sm bg-background"
        >
          {SIZE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number"
          min={1}
          value={ld}
          onChange={e => setLd(e.target.value)}
          placeholder="LD (cm), mis. 100"
          className="w-full sm:w-40 px-3 py-2 border border-border text-sm"
        />
        <button type="button" onClick={add} className="px-3 py-2 bg-primary text-primary-foreground text-sm flex items-center justify-center gap-1">
          <Plus className="w-4 h-4" /> Size
        </button>
      </div>
    </div>
  );
}
