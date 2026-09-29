import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatIDR } from "@/lib/currency";
import RupiahInput from "@/components/ui/RupiahInput";

const SIZE_CATEGORIES = ["Reguler", "Jumbo Size"] as const;
type SizeCategory = (typeof SIZE_CATEGORIES)[number];

interface SizeItem {
  id: string;
  category: SizeCategory;
  name: string | null;
  ld: number;
  stock: number;
  price: number | null;
  hpp_price: number | null;
  sort_order: number;
}

interface ProductSizesProps {
  productId: string;
  masterPrice?: number;
  masterHpp?: number;
  onStockChange?: (totalStock: number, sizeCount: number) => void;
}

/**
 * Komponen cell khusus tabel untuk inline editing Rupiah dengan auto-format titik live
 */
function TableRupiahCell({
  value,
  placeholder,
  onSave,
}: {
  value: number | null;
  placeholder?: string;
  onSave: (val: number | null) => void;
}) {
  const [val, setVal] = useState<number | null>(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  return (
    <RupiahInput
      size="sm"
      allowNull
      value={val}
      onChange={setVal}
      onBlur={() => {
        if (val !== value) {
          onSave(val);
        }
      }}
      placeholder={placeholder}
      className="border-border/80"
    />
  );
}

export default function ProductSizes({
  productId,
  masterPrice = 0,
  masterHpp = 0,
  onStockChange,
}: ProductSizesProps) {
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State Tambah Ukuran
  const [category, setCategory] = useState<SizeCategory>("Reguler");
  const [name, setName] = useState("");
  const [ld, setLd] = useState("");
  const [stock, setStock] = useState("10");
  const [price, setPrice] = useState("");
  const [hppPrice, setHppPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  // ── Load sizes ─────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_sizes")
      .select("id,category,name,ld,stock,price,hpp_price,sort_order")
      .eq("product_id", productId)
      .order("sort_order");
    setLoading(false);
    if (error) {
      return toast({
        title: "Gagal memuat ukuran",
        description: error.message,
        variant: "destructive",
      });
    }
    const list = (data as SizeItem[]) || [];
    setSizes(list);
    const total = list.reduce((sum, s) => sum + (s.stock || 0), 0);
    onStockChange?.(total, list.length);
  };

  useEffect(() => {
    load();
  }, [productId]);

  // ── Tambah Ukuran Baru ─────────────────────────────────────────────────────
  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ldVal = Number(ld);
    if (!ldVal || ldVal <= 0) {
      return toast({
        title: "Lingkar Dada (LD) belum diisi",
        description: "Masukkan nilai LD dalam cm (contoh: 105).",
        variant: "destructive",
      });
    }

    setSaving(true);
    const valStock = Math.max(0, parseInt(stock, 10) || 0);
    const valPrice = price.trim() !== "" ? Number(price.replace(/\D/g, "")) : null;
    const valHpp = hppPrice.trim() !== "" ? Number(hppPrice.replace(/\D/g, "")) : null;

    const { error } = await supabase.from("product_sizes").insert({
      product_id: productId,
      category,
      name: name.trim() || null,
      ld: ldVal,
      stock: valStock,
      price: valPrice,
      hpp_price: valHpp,
      sort_order: sizes.length,
    });

    setSaving(false);
    if (error) {
      return toast({
        title: "Gagal menambah ukuran",
        description: error.message,
        variant: "destructive",
      });
    }

    setName("");
    setLd("");
    setStock("10");
    setPrice("");
    setHppPrice("");
    toast({ title: "Ukuran berhasil ditambahkan" });
    load();
  };

  // ── Update field inline ────────────────────────────────────────────────────
  const handleUpdate = async (id: string, patch: Partial<SizeItem>) => {
    const { error } = await supabase
      .from("product_sizes")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast({
        title: "Gagal memperbarui ukuran",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSizes((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
        const total = next.reduce((sum, s) => sum + (s.stock || 0), 0);
        onStockChange?.(total, next.length);
        return next;
      });
    }
  };

  // ── Hapus ukuran ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Hapus ukuran "${label}"? Stok terkait akan dihilangkan.`)) return;
    const { error } = await supabase
      .from("product_sizes")
      .delete()
      .eq("id", id);
    if (error) {
      return toast({
        title: "Gagal menghapus",
        description: error.message,
        variant: "destructive",
      });
    }
    toast({ title: "Ukuran berhasil dihapus" });
    load();
  };

  // ── Quick Presets ──────────────────────────────────────────────────────────
  const applyPreset = (presetCat: SizeCategory, presetName: string, presetLd: number) => {
    setCategory(presetCat);
    setName(presetName);
    setLd(String(presetLd));
  };

  const totalStock = sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
  const outOfStockCount = sizes.filter((s) => (s.stock || 0) === 0).length;

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
              Pengaturan Varian Ukuran & Stok
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Kelola stok fisik & harga khusus per ukuran. Ukuran tanpa harga khusus otomatis menggunakan harga master produk.
            </p>
          </div>
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted border border-border text-foreground">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            {sizes.length} Varian
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
            Total: {totalStock} pcs
          </span>
          {outOfStockCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
              {outOfStockCount} Habis
            </span>
          )}
        </div>
      </div>

      {/* ── FORM TAMBAH UKURAN BARU (Clean, Spacious, Never Overflows) ── */}
      <div className="bg-muted/20 border border-border rounded-lg p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-primary" />
            Tambah Ukuran Baru
          </span>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Contoh cepat:
            </span>
            <button
              type="button"
              onClick={() => applyPreset("Reguler", "S", 95)}
              className="text-[11px] px-2 py-0.5 bg-background border border-border rounded hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
            >
              S (95cm)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("Reguler", "M", 100)}
              className="text-[11px] px-2 py-0.5 bg-background border border-border rounded hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
            >
              M (100cm)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("Reguler", "L", 105)}
              className="text-[11px] px-2 py-0.5 bg-background border border-border rounded hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
            >
              L (105cm)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("Reguler", "XL", 110)}
              className="text-[11px] px-2 py-0.5 bg-background border border-border rounded hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
            >
              XL (110cm)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("Jumbo Size", "Jumbo XXL", 125)}
              className="text-[11px] px-2 py-0.5 bg-background border border-border rounded hover:border-primary transition-colors text-muted-foreground hover:text-foreground"
            >
              Jumbo (125cm)
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* 1. Kategori */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SizeCategory)}
              className="w-full px-3 py-2 border border-border text-sm rounded bg-background focus:outline-none focus:border-primary"
            >
              {SIZE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Label Size */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Label Size
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: S, M, L, XL"
              className="w-full px-3 py-2 border border-border text-sm rounded bg-background focus:outline-none focus:border-primary"
            />
          </div>

          {/* 3. Lingkar Dada (LD) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              LD (Lingkar Dada) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border border-border rounded bg-background focus-within:border-primary overflow-hidden shadow-sm">
              <input
                type="text"
                inputMode="numeric"
                value={ld}
                onChange={(e) => setLd(e.target.value.replace(/\D/g, ""))}
                placeholder="105"
                className="w-full px-3 py-2 text-sm font-medium bg-transparent text-left focus:outline-none"
              />
              <span className="px-2.5 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-l border-border select-none shrink-0">
                cm
              </span>
            </div>
          </div>

          {/* 4. Stok Fisik */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Stok Fisik
            </label>
            <div className="flex items-center border border-border rounded bg-background focus-within:border-primary overflow-hidden shadow-sm">
              <input
                type="text"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-bold bg-transparent text-left focus:outline-none"
              />
              <span className="px-2.5 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 border-l border-border select-none shrink-0">
                pcs
              </span>
            </div>
          </div>

          {/* 5. Harga Khusus */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Harga Khusus <span className="text-muted-foreground/60 font-normal lowercase">(opsional)</span>
            </label>
            <RupiahInput
              allowNull
              value={price ? Number(price) : null}
              onChange={(val) => setPrice(val !== null ? String(val) : "")}
              placeholder={masterPrice > 0 ? `Ikuti master (${masterPrice.toLocaleString("id-ID")})` : "Sama master"}
            />
          </div>

          {/* 6. HPP Khusus */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              HPP Khusus <span className="text-muted-foreground/60 font-normal lowercase">(opsional)</span>
            </label>
            <RupiahInput
              allowNull
              value={hppPrice ? Number(hppPrice) : null}
              onChange={(val) => setHppPrice(val !== null ? String(val) : "")}
              placeholder={masterHpp > 0 ? `Ikuti master (${masterHpp.toLocaleString("id-ID")})` : "Sama master"}
            />
          </div>
        </div>

        {/* Submit Button Row - Guaranteed Never Overflows */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => handleAdd()}
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? "Menyimpan..." : "Tambah Ukuran ke Daftar"}
          </button>
        </div>
      </div>

      {/* ── DAFTAR UKURAN (DATA TABLE DENGAN INLINE EDITING) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Daftar Ukuran ({sizes.length})
          </span>
          <span className="text-xs text-muted-foreground">
            💡 Edit langsung di kolom tabel, perubahan tersimpan otomatis saat kursor berpindah.
          </span>
        </div>

        {loading ? (
          <div className="p-8 border border-border rounded-lg text-center text-sm text-muted-foreground animate-pulse">
            Memuat daftar ukuran...
          </div>
        ) : sizes.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-lg text-center bg-card/50">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Belum ada varian ukuran</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tambahkan ukuran pertama produk ini melalui formulir di atas.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-x-auto bg-card shadow-sm">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 w-36">Kategori</th>
                  <th className="py-3 px-3 w-28">Label Size</th>
                  <th className="py-3 px-3 w-32">LD</th>
                  <th className="py-3 px-3 w-40">Stok Fisik</th>
                  <th className="py-3 px-3 min-w-[170px]">Harga Jual</th>
                  <th className="py-3 px-3 min-w-[170px]">HPP / Modal</th>
                  <th className="py-3 px-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {sizes.map((s, idx) => {
                  const effectivePrice = s.price ?? masterPrice;
                  const effectiveHpp = s.hpp_price ?? masterHpp;
                  const isOutOfStock = (s.stock || 0) === 0;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* # */}
                      <td className="py-3 px-3 text-center text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-3">
                        <select
                          value={s.category}
                          onChange={(e) =>
                            handleUpdate(s.id, {
                              category: e.target.value as SizeCategory,
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-border/80 rounded text-xs bg-background focus:outline-none focus:border-primary font-medium"
                        >
                          {SIZE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Label Size */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          defaultValue={s.name ?? ""}
                          placeholder="misal: M"
                          onBlur={(e) =>
                            handleUpdate(s.id, {
                              name: e.target.value.trim() || null,
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-border/80 rounded text-xs bg-background focus:outline-none focus:border-primary font-medium"
                        />
                      </td>

                      {/* LD */}
                      <td className="py-3 px-3">
                        <div className="flex items-center border border-border/80 rounded bg-background focus-within:border-primary overflow-hidden">
                          <input
                            type="text"
                            inputMode="numeric"
                            defaultValue={s.ld}
                            onBlur={(e) => {
                              const val = Number(e.target.value.replace(/\D/g, "")) || 0;
                              e.target.value = String(val);
                              handleUpdate(s.id, { ld: val });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs font-medium bg-transparent text-left focus:outline-none"
                          />
                          <span className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground bg-muted/40 border-l border-border select-none shrink-0">
                            cm
                          </span>
                        </div>
                      </td>

                      {/* Stok Fisik (Spacious & Clearly Visible) */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className={`flex items-center border rounded bg-background focus-within:border-primary overflow-hidden shadow-sm ${
                            isOutOfStock ? "border-red-300 bg-red-50/30" : "border-border/80"
                          }`}>
                            <input
                              type="text"
                              inputMode="numeric"
                              defaultValue={s.stock}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                                e.target.value = String(val);
                                handleUpdate(s.id, { stock: val });
                              }}
                              className={`w-full px-2.5 py-1.5 text-xs font-bold bg-transparent text-left focus:outline-none ${
                                isOutOfStock ? "text-red-600" : "text-foreground"
                              }`}
                            />
                            <span className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/40 border-l border-border select-none shrink-0">
                              pcs
                            </span>
                          </div>
                          {isOutOfStock ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                              Habis (0 pcs)
                            </span>
                          ) : s.stock <= 5 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                              Sisa {s.stock} pcs
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Harga Jual */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <TableRupiahCell
                            value={s.price}
                            placeholder={
                              masterPrice > 0
                                ? `Master (${masterPrice.toLocaleString("id-ID")})`
                                : "Ikuti master"
                            }
                            onSave={(val) => handleUpdate(s.id, { price: val })}
                          />
                          <div className="text-[11px]">
                            {s.price !== null ? (
                              <span className="font-semibold text-primary">
                                Khusus: {formatIDR(s.price)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Mengikuti master: {formatIDR(effectivePrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* HPP */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <TableRupiahCell
                            value={s.hpp_price}
                            placeholder={
                              masterHpp > 0
                                ? `Master (${masterHpp.toLocaleString("id-ID")})`
                                : "Ikuti master"
                            }
                            onSave={(val) => handleUpdate(s.id, { hpp_price: val })}
                          />
                          <div className="text-[11px]">
                            {s.hpp_price !== null ? (
                              <span className="font-semibold text-foreground">
                                Khusus: {formatIDR(s.hpp_price)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Mengikuti master: {formatIDR(effectiveHpp)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Aksi Hapus */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              s.id,
                              `${s.category} - ${s.name || `LD ${s.ld}cm`}`
                            )
                          }
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="Hapus varian ukuran ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
