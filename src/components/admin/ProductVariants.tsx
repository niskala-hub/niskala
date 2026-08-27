import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { resolveProductImage } from "@/lib/productImage";

interface Motif {
  id: string;
  name: string;
  image_url: string | null;
  stock: number;
  sort_order: number;
}
interface Model {
  id: string;
  name: string;
  sort_order: number;
  product_motifs: Motif[];
}

export default function ProductVariants({ productId }: { productId: string }) {
  const [models, setModels] = useState<Model[]>([]);
  const [modelName, setModelName] = useState("");
  const [motifName, setMotifName] = useState<Record<string, string>>({});
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from("product_models")
      .select("id,name,sort_order,product_motifs(id,name,image_url,stock,sort_order)")
      .eq("product_id", productId)
      .order("sort_order");
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setModels(
      ((data as Model[]) || []).map(m => ({
        ...m,
        product_motifs: [...(m.product_motifs || [])].sort((a, b) => a.sort_order - b.sort_order),
      })),
    );
  };

  useEffect(() => { load(); }, [productId]);

  const addModel = async () => {
    if (!modelName.trim()) return;
    const { error } = await supabase
      .from("product_models")
      .insert({ product_id: productId, name: modelName.trim(), sort_order: models.length });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setModelName("");
    load();
  };

  const removeModel = async (id: string) => {
    if (!confirm("Hapus model ini beserta motifnya?")) return;
    const { error } = await supabase.from("product_models").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };

  const renameModel = async (id: string, name: string) => {
    const { error } = await supabase.from("product_models").update({ name }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const uploadMotifImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `motifs/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) throw error;
    const { data, error: sErr } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (sErr) throw sErr;
    return data.signedUrl;
  };

  const addMotif = async (model: Model, file?: File) => {
    const name = (motifName[model.id] || "").trim();
    if (!name) return toast({ title: "Isi nama motif dulu", variant: "destructive" });
    setUploadingFor(model.id);
    try {
      const image_url = file ? await uploadMotifImage(file) : null;
      const { error } = await supabase.from("product_motifs").insert({
        model_id: model.id,
        name,
        image_url,
        stock: 1,
        sort_order: model.product_motifs.length,
      });
      if (error) throw error;
      setMotifName(s => ({ ...s, [model.id]: "" }));
      load();
    } catch (err: any) {
      toast({ title: "Gagal menambah motif", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFor(null);
    }
  };

  const updateMotif = async (id: string, patch: Partial<Motif>) => {
    const { error } = await supabase.from("product_motifs").update(patch).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const removeMotif = async (id: string) => {
    const { error } = await supabase.from("product_motifs").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };

  const replaceMotifImage = async (id: string, file: File) => {
    setUploadingFor(id);
    try {
      const image_url = await uploadMotifImage(file);
      await updateMotif(id, { image_url });
      load();
    } catch (err: any) {
      toast({ title: "Upload gagal", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <div className="border border-border p-3 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Model & Motif</p>
        <p className="text-xs text-muted-foreground mt-1">
          Pembeli memilih model dulu, lalu motif. Motif tanpa stok tampil sebagai habis.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={modelName}
          onChange={e => setModelName(e.target.value)}
          placeholder="Nama model, mis. Daster Kancing"
          className="flex-1 px-3 py-2 border border-border text-sm"
        />
        <button type="button" onClick={addModel} className="px-3 py-2 bg-primary text-primary-foreground text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Model
        </button>
      </div>

      {models.length === 0 && (
        <p className="text-xs text-muted-foreground">Belum ada model. Produk akan langsung bisa diorder tanpa pilihan.</p>
      )}

      {models.map(model => (
        <div key={model.id} className="border border-border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <input
              defaultValue={model.name}
              onBlur={e => renameModel(model.id, e.target.value)}
              className="flex-1 px-2 py-1.5 border border-border text-sm"
            />
            <button type="button" onClick={() => removeModel(model.id)} className="p-2 text-destructive hover:bg-muted">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {model.product_motifs.map(mo => (
              <div key={mo.id} className="border border-border relative">
                <div className="aspect-square bg-muted overflow-hidden">
                  <img src={resolveProductImage(mo.image_url)} alt={mo.name} className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => removeMotif(mo.id)}
                  className="absolute top-0 right-0 bg-background/90 p-1"
                  aria-label="Hapus motif"
                >
                  <X className="w-3 h-3" />
                </button>
                <input
                  defaultValue={mo.name}
                  onBlur={e => updateMotif(mo.id, { name: e.target.value })}
                  className="w-full px-1 py-1 text-[11px] border-t border-border"
                />
                <div className="flex items-center gap-1 px-1 pb-1">
                  <span className="text-[10px] text-muted-foreground">Stok</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={mo.stock}
                    onBlur={e => updateMotif(mo.id, { stock: Number(e.target.value) })}
                    className="w-full px-1 py-0.5 text-[11px] border border-border"
                  />
                </div>
                <label className="block text-center text-[10px] py-1 border-t border-border cursor-pointer hover:bg-muted">
                  {uploadingFor === mo.id ? "…" : "Ganti gambar"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && replaceMotifImage(mo.id, e.target.files[0])}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={motifName[model.id] || ""}
              onChange={e => setMotifName(s => ({ ...s, [model.id]: e.target.value }))}
              placeholder="Nama motif, mis. Bunga Sakura"
              className="flex-1 px-3 py-2 border border-border text-sm"
            />
            <label className="px-3 py-2 border border-border text-sm flex items-center justify-center gap-1 cursor-pointer hover:bg-muted">
              <Upload className="w-4 h-4" />
              {uploadingFor === model.id ? "Mengunggah…" : "Tambah motif + gambar"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && addMotif(model, e.target.files[0])}
              />
            </label>
            <button type="button" onClick={() => addMotif(model)} className="px-3 py-2 border border-border text-sm">
              Tanpa gambar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
