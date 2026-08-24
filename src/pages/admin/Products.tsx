import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X, Upload } from "lucide-react";
import { formatIDR } from "@/lib/currency";
import { resolveProductImage } from "@/lib/productImage";

interface Category { id: string; name: string; }
interface Product {
  id: string; name: string; slug: string; description: string | null;
  price: number; hpp_price: number; stock: number; image_url: string | null; category_id: string | null;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", price: 0, hpp_price: 0, stock: 0, category_id: "", image_url: "" });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("name"),
    ]);
    if (p.error) toast({ title: "Error", description: p.error.message, variant: "destructive" });
    setRows(p.data || []);
    setCats(c.data || []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", price: 0, hpp_price: 0, stock: 0, category_id: "", image_url: "" });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, slug: p.slug, description: p.description || "",
      price: Number(p.price), hpp_price: Number(p.hpp_price), stock: p.stock,
      category_id: p.category_id || "", image_url: p.image_url || "",
    });
    setOpen(true);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr) throw sErr;
      setForm(f => ({ ...f, image_url: signed.signedUrl }));
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      price: form.price,
      hpp_price: form.hpp_price,
      stock: form.stock,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Product updated" : "Product created" });
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Product deleted" });
    load();
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} total</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm">
          <Plus className="w-4 h-4" /> New product
        </button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-20">Image</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <img src={resolveProductImage(p.image_url)} alt={p.name} className="w-12 h-12 object-cover" />
                </td>
                <td className="px-4 py-3">
                  <div>{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.slug}</div>
                </td>
                <td className="px-4 py-3">{formatIDR(Number(p.price))}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(p)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(p.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-background w-full max-w-lg p-6 relative my-8">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-light mb-6">{editing ? "Edit" : "New"} product</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Image</label>
                <div className="mt-2 flex items-center gap-4">
                  <img src={resolveProductImage(form.image_url)} alt="" className="w-20 h-20 object-cover border border-border" />
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-border text-sm hover:bg-muted">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading…" : "Upload"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
                  </label>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                      className="text-xs text-muted-foreground hover:text-destructive">Use default</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Name</label>
                  <input required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-border" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Slug</label>
                  <input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-border font-mono text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-border bg-background">
                  <option value="">Uncategorised</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Price (IDR)</label>
                  <input type="number" min={0} required value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-border" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Stock</label>
                  <input type="number" min={0} required value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-border" />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-border" />
              </div>
              <button type="submit" disabled={uploading} className="w-full py-2 bg-primary text-primary-foreground text-sm disabled:opacity-50">
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
