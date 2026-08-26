import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X, Upload } from "lucide-react";
import { formatIDR } from "@/lib/currency";
import { resolveProductImage } from "@/lib/productImage";

interface Category { id: string; name: string; }
interface Product {
  id: string; name: string; slug: string; description: string | null;
  price: number; hpp_price: number; stock: number; image_url: string | null;
  image_urls: string[] | null; category_id: string | null;
}

const MAX_IMAGES = 4;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", price: 0, hpp_price: 0, stock: 0,
    category_id: "", image_urls: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("name"),
    ]);
    if (p.error) toast({ title: "Error", description: p.error.message, variant: "destructive" });
    setRows((p.data as Product[]) || []);
    setCats(c.data || []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", price: 0, hpp_price: 0, stock: 0, category_id: "", image_urls: [] });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const imgs = (p.image_urls && p.image_urls.length > 0) ? p.image_urls : (p.image_url ? [p.image_url] : []);
    setForm({
      name: p.name, slug: p.slug, description: p.description || "",
      price: Number(p.price), hpp_price: Number(p.hpp_price), stock: p.stock,
      category_id: p.category_id || "", image_urls: imgs.slice(0, MAX_IMAGES),
    });
    setOpen(true);
  };

  const upload = async (files: FileList) => {
    const remaining = MAX_IMAGES - form.image_urls.length;
    if (remaining <= 0) {
      return toast({ title: "Maksimal 4 gambar", variant: "destructive" });
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of list) {
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file);
        if (error) throw error;
        const { data: signed, error: sErr } = await supabase.storage
          .from("product-images")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (sErr) throw sErr;
        urls.push(signed.signedUrl);
      }
      setForm(f => ({ ...f, image_urls: [...f.image_urls, ...urls].slice(0, MAX_IMAGES) }));
      toast({ title: `${urls.length} gambar diunggah` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) =>
    setForm(f => ({ ...f, image_urls: f.image_urls.filter(u => u !== url) }));

  const makePrimary = (url: string) =>
    setForm(f => ({ ...f, image_urls: [url, ...f.image_urls.filter(u => u !== url)] }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const imgs = form.image_urls.slice(0, MAX_IMAGES);
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      price: form.price,
      hpp_price: form.hpp_price,
      stock: form.stock,
      category_id: form.category_id || null,
      image_url: imgs[0] || null,
      image_urls: imgs,
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

  const imageCount = (p: Product) =>
    (p.image_urls && p.image_urls.length) || (p.image_url ? 1 : 0);

  return (
    <div className="p-4 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} total</p>
        </div>
        <button onClick={openNew} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm">
          <Plus className="w-4 h-4" /> New product
        </button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map(p => (
          <div key={p.id} className="border border-border p-3 flex gap-3">
            <img src={resolveProductImage(p.image_url)} alt={p.name} className="w-16 h-16 object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.slug} · {imageCount(p)} img</p>
              <p className="text-sm mt-1">{formatIDR(Number(p.price))}</p>
              <p className="text-xs text-muted-foreground">
                HPP {formatIDR(Number(p.hpp_price))} · Stok {p.stock}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => openEdit(p)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(p.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="border border-border py-10 text-center text-sm text-muted-foreground">No products yet.</p>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-20">Image</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">HPP</th>
              <th className="px-4 py-3 font-medium">Margin</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="relative w-12 h-12">
                    <img src={resolveProductImage(p.image_url)} alt={p.name} className="w-12 h-12 object-cover" />
                    {imageCount(p) > 1 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1">
                        {imageCount(p)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.slug}</div>
                </td>
                <td className="px-4 py-3">{formatIDR(Number(p.price))}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatIDR(Number(p.hpp_price))}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatIDR(Number(p.price) - Number(p.hpp_price))}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(p)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(p.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-background w-full max-w-lg p-4 sm:p-6 relative my-4 sm:my-8">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4"><X className="w-4 h-4" /></button>
            <h2 className="text-lg sm:text-xl font-light mb-5">{editing ? "Edit" : "New"} product</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Images ({form.image_urls.length}/{MAX_IMAGES})
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {form.image_urls.map((url, i) => (
                    <div key={url} className="relative aspect-square border border-border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(url)}
                        className="absolute top-0 right-0 bg-background/90 p-1" aria-label="Hapus gambar">
                        <X className="w-3 h-3" />
                      </button>
                      {i === 0 ? (
                        <span className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[10px] text-center">Utama</span>
                      ) : (
                        <button type="button" onClick={() => makePrimary(url)}
                          className="absolute bottom-0 left-0 right-0 bg-background/90 text-[10px]">Jadikan utama</button>
                      )}
                    </div>
                  ))}
                  {form.image_urls.length < MAX_IMAGES && (
                    <label className="aspect-square border border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer text-xs text-muted-foreground hover:bg-muted">
                      <Upload className="w-4 h-4" />
                      {uploading ? "…" : "Upload"}
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={e => e.target.files?.length && upload(e.target.files)} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Maksimal 4 gambar. Gambar pertama menjadi gambar utama.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Name</label>
                  <input required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2.5 border border-border" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Slug</label>
                  <input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 border border-border font-mono text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2.5 border border-border bg-background">
                  <option value="">Uncategorised</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Price (IDR)</label>
                  <input type="number" min={0} required value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2.5 border border-border" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">HPP / Modal</label>
                  <input type="number" min={0} required value={form.hpp_price}
                    onChange={e => setForm(f => ({ ...f, hpp_price: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2.5 border border-border" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Stock</label>
                  <input type="number" min={0} required value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2.5 border border-border" />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2.5 border border-border" />
              </div>
              <button type="submit" disabled={uploading} className="w-full py-2.5 bg-primary text-primary-foreground text-sm disabled:opacity-50">
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
