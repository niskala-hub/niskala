import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X, Upload } from "lucide-react";
import { formatIDR } from "@/lib/currency";
import { resolveProductImage } from "@/lib/productImage";
import { getProductStatusInfo } from "@/lib/product";
import ProductVariants from "@/components/admin/ProductVariants";
import ProductSizes from "@/components/admin/ProductSizes";

interface Category { id: string; name: string; }
interface Product {
  id: string; name: string; slug: string; description: string | null;
  price: number; original_price: number | null; hpp_price: number; stock: number;
  status: string | null; image_url: string | null;
  image_urls: string[] | null; category_id: string | null;
}

const MAX_IMAGES = 5;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", price: 0, original_price: 0, hpp_price: 0, stock: 0,
    status: "ready", category_id: "", image_urls: [] as string[],
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
    setForm({
      name: "", slug: "", description: "", price: 0, original_price: 0, hpp_price: 0, stock: 0,
      status: "ready", category_id: "", image_urls: []
    });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const imgs = (p.image_urls && p.image_urls.length > 0) ? p.image_urls : (p.image_url ? [p.image_url] : []);
    setForm({
      name: p.name, slug: p.slug, description: p.description || "",
      price: Number(p.price), original_price: p.original_price ? Number(p.original_price) : 0,
      hpp_price: Number(p.hpp_price), stock: p.stock, status: p.status || "ready",
      category_id: p.category_id || "", image_urls: imgs.slice(0, MAX_IMAGES),
    });
    setOpen(true);
  };

  const upload = async (files: FileList) => {
    const remaining = MAX_IMAGES - form.image_urls.length;
    if (remaining <= 0) {
      return toast({ title: `Maksimal ${MAX_IMAGES} gambar`, variant: "destructive" });
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
      original_price: form.original_price > 0 ? form.original_price : null,
      hpp_price: form.hpp_price,
      stock: form.stock,
      status: form.status,
      category_id: form.category_id || null,
      image_url: imgs[0] || null,
      image_urls: imgs,
    };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Product updated" });
      setOpen(false);
      load();
      return;
    }
    const { data, error } = await supabase.from("products").insert(payload).select().maybeSingle();
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Produk dibuat", description: "Lanjutkan menambahkan model & motif." });
    if (data) setEditing(data as Product);
    load();
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
        <button onClick={openNew} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" /> New product
        </button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map(p => {
          const st = getProductStatusInfo(p);
          return (
            <div key={p.id} className="border border-border p-3 flex gap-3">
              <div className="relative w-16 h-16 shrink-0">
                <img src={resolveProductImage(p.image_url)} alt={p.name} className="w-16 h-16 object-cover" />
                {st.isSold && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                    Sold
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 font-medium rounded ${
                    st.isComingSoon ? "bg-amber-100 text-amber-800" :
                    st.isSold ? "bg-slate-200 text-slate-700" :
                    "bg-emerald-100 text-emerald-800"
                  }`}>
                    {st.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{p.slug} · {imageCount(p)} img</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold">{formatIDR(Number(p.price))}</span>
                  {p.original_price && Number(p.original_price) > Number(p.price) && (
                    <span className="text-xs text-muted-foreground line-through">{formatIDR(Number(p.original_price))}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  HPP {formatIDR(Number(p.hpp_price))} · Stok {p.stock}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => openEdit(p)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(p.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="border border-border py-10 text-center text-sm text-muted-foreground">No products yet.</p>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-20">Image</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Price (Diskon)</th>
              <th className="px-4 py-3 font-medium">Harga Asli</th>
              <th className="px-4 py-3 font-medium">HPP</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const st = getProductStatusInfo(p);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="relative w-12 h-12">
                      <img src={resolveProductImage(p.image_url)} alt={p.name} className="w-12 h-12 object-cover" />
                      {st.isSold && (
                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-[8px] font-bold text-white uppercase">
                          Sold
                        </div>
                      )}
                      {imageCount(p) > 1 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1">
                          {imageCount(p)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 font-medium rounded ${
                      st.isComingSoon ? "bg-amber-100 text-amber-800" :
                      st.isSold ? "bg-slate-200 text-slate-700" :
                      "bg-emerald-100 text-emerald-800"
                    }`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatIDR(Number(p.price))}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.original_price && Number(p.original_price) > 0 ? (
                      <span className="line-through">{formatIDR(Number(p.original_price))}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatIDR(Number(p.hpp_price))}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(p)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(p.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-background w-full max-w-5xl rounded-none border border-border shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-background shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-light text-foreground">
                  {editing ? "Edit Product" : "New Product"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editing ? `Mengedit info & varian untuk ${editing.name}` : "Tambahkan produk baru ke katalog NISKALA"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body - 2 Columns on Desktop */}
            <form onSubmit={save} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* LEFT COLUMN: Media & Basic Info */}
                <div className="space-y-4">
                  <div className="bg-muted/30 border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider font-medium text-foreground">
                        Product Images ({form.image_urls.length}/{MAX_IMAGES})
                      </label>
                      <span className="text-[11px] text-muted-foreground">Format JPG/PNG</span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {form.image_urls.map((url, i) => (
                        <div key={url} className="relative aspect-square border border-border bg-background group overflow-hidden">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(url)}
                            className="absolute top-1 right-1 bg-background/90 text-destructive p-1 shadow hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            aria-label="Hapus gambar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {i === 0 ? (
                            <span className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[10px] py-0.5 text-center font-medium">
                              Utama
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => makePrimary(url)}
                              className="absolute bottom-0 left-0 right-0 bg-background/95 text-[10px] py-0.5 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors opacity-90 group-hover:opacity-100"
                            >
                              Set Utama
                            </button>
                          )}
                        </div>
                      ))}
                      {form.image_urls.length < MAX_IMAGES && (
                        <label className="aspect-square border border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer text-xs text-muted-foreground hover:bg-muted hover:border-primary transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[11px] font-medium">{uploading ? "…" : "Upload"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={e => e.target.files?.length && upload(e.target.files)}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Maksimal 5 gambar. Gambar pertama otomatis menjadi gambar utama.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                      Product Name
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))}
                      placeholder="misal: Daster Rayon Motif Bunga"
                      className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                      URL Slug
                    </label>
                    <input
                      required
                      value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="daster-rayon-motif-bunga"
                      className="w-full px-3 py-2.5 border border-border bg-background font-mono text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                      Category
                    </label>
                    <select
                      value={form.category_id}
                      onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="">Uncategorised</option>
                      {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Tuliskan deskripsi produk..."
                      className="w-full px-3 py-2.5 border border-border bg-background text-sm leading-relaxed focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Pricing, Status, Stock, and Variants */}
                <div className="space-y-4">
                  <div className="bg-muted/30 border border-border p-4 space-y-4">
                    <p className="text-xs uppercase tracking-wider font-medium text-foreground">
                      Harga, Status &amp; Stok
                    </p>

                    {/* Status Picker */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                        Status Produk
                      </label>
                      <select
                        value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-border bg-background text-sm focus:outline-none focus:border-primary font-medium"
                      >
                        <option value="ready">Ready (Otomatis Sold jika Stok 0)</option>
                        <option value="coming_soon">Coming Soon (Manual - Tombol Pesan Nonaktif)</option>
                        <option value="sold">Sold Out (Habis)</option>
                      </select>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        * Jika memilih "Coming Soon", gambar produk tetap muncul namun tombol pesan di detail akan tidak dapat dipencet.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                          Harga Jual / Diskon (Rp)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            value={form.price ? form.price.toLocaleString("id-ID") : ""}
                            onChange={e => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setForm(f => ({ ...f, price: raw ? parseInt(raw, 10) : 0 }));
                            }}
                            placeholder="0"
                            className="w-full pl-9 pr-3 py-2 border border-border bg-background text-sm font-semibold focus:outline-none focus:border-primary"
                          />
                        </div>
                        {form.price > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1 font-mono">{formatIDR(form.price)}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                          Harga Asli / Normal (Rp)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={form.original_price ? form.original_price.toLocaleString("id-ID") : ""}
                            onChange={e => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setForm(f => ({ ...f, original_price: raw ? parseInt(raw, 10) : 0 }));
                            }}
                            placeholder="Opsional (misal: 400.000)"
                            className="w-full pl-9 pr-3 py-2 border border-border bg-background text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        {form.original_price > 0 ? (
                          <p className="text-[11px] text-muted-foreground mt-1 font-mono line-through">
                            {formatIDR(form.original_price)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-1">Muncul dicoret di UI jika diisi</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                          HPP / Modal (Rp)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            value={form.hpp_price ? form.hpp_price.toLocaleString("id-ID") : ""}
                            onChange={e => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setForm(f => ({ ...f, hpp_price: raw ? parseInt(raw, 10) : 0 }));
                            }}
                            placeholder="0"
                            className="w-full pl-9 pr-3 py-2 border border-border bg-background text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        {form.hpp_price > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1 font-mono">{formatIDR(form.hpp_price)}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                          Stock Total
                        </label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={form.stock}
                          onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-border bg-background text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {editing ? (
                    <div className="space-y-4">
                      <ProductSizes productId={editing.id} />
                      <ProductVariants productId={editing.id} />
                    </div>
                  ) : (
                    <div className="border border-dashed border-border p-4 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
                      <p className="font-medium text-foreground mb-1">Pengaturan Ukuran, Model &amp; Motif</p>
                      Simpan data utama produk terlebih dahulu, lalu opsi penambahan Size (LD), Model, dan Motif akan langsung dapat dikelola di form ini.
                    </div>
                  )}
                </div>

              </div>
            </form>

            {/* Sticky Footer Action Bar */}
            <div className="sticky bottom-0 bg-background border-t border-border p-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-lg">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 border border-border text-sm text-foreground hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={save}
                disabled={uploading}
                className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {editing ? "Simpan Perubahan" : "Simpan & Lanjut"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
