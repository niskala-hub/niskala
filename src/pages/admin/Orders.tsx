import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createOrder } from "@/services/orderService";

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_hpp: number;
}

interface Order {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  payment_status: string;
  channel: string;
  notes: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  stock_deducted: boolean;
  total_price: number;
  total_hpp: number;
  created_at: string;
  order_items: OrderItem[];
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  hpp_price: number;
}

interface DraftItem {
  product_id: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  unit_hpp: string;
}

interface Draft {
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  channel: string;
  notes: string;
  order_date: string;
  items: DraftItem[];
}

const STATUSES = ["pending", "processing", "shipped", "done", "cancelled"];
const STATUS_LABEL: Record<string, string> = {
  pending: "Baru",
  processing: "Diproses",
  shipped: "Dikirim",
  done: "Selesai",
  cancelled: "Dibatalkan",
  paid: "Selesai",
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyItem: DraftItem = {
  product_id: "manual",
  product_name: "",
  quantity: "1",
  unit_price: "",
  unit_hpp: "0",
};

const emptyDraft = (): Draft => ({
  customer_name: "",
  customer_phone: "",
  status: "pending",
  payment_status: "unpaid",
  channel: "offline",
  notes: "",
  order_date: todayStr(),
  items: [{ ...emptyItem }],
});

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function Orders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const [filterPayment, setFilterPayment] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");

  const load = async () => {
    setLoading(true);
    const [ordersRes, productsRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, customer_name, customer_phone, status, payment_status, channel, notes, paid_at, cancelled_at, cancellation_reason, stock_deducted, total_price, total_hpp, created_at, order_items(id, product_id, product_name, quantity, unit_price, unit_hpp)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, price, hpp_price").order("name"),
    ]);
    if (ordersRes.error) {
      toast({ title: "Gagal memuat pesanan", description: ordersRes.error.message, variant: "destructive" });
    } else {
      setOrders((ordersRes.data as Order[]) || []);
    }
    if (!productsRes.error) setProducts((productsRes.data as ProductOption[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (filterPayment !== "all" && o.payment_status !== filterPayment) return false;
        if (filterChannel !== "all" && o.channel !== filterChannel) return false;
        return true;
      }),
    [orders, filterPayment, filterChannel]
  );

  const summary = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    for (const o of filtered) {
      if (o.payment_status === "paid") paid += Number(o.total_price);
      else unpaid += Number(o.total_price);
    }
    return { paid, unpaid };
  }, [filtered]);

  const draftTotals = useMemo(() => {
    let price = 0;
    let hpp = 0;
    for (const it of draft.items) {
      const qty = Number(it.quantity) || 0;
      price += qty * (Number(it.unit_price) || 0);
      hpp += qty * (Number(it.unit_hpp) || 0);
    }
    return { price, hpp };
  }, [draft.items]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEdit = (o: Order) => {
    setEditing(o);
    setDraft({
      customer_name: o.customer_name ?? "",
      customer_phone: o.customer_phone ?? "",
      status: STATUSES.includes(o.status) ? o.status : "pending",
      payment_status: o.payment_status,
      channel: o.channel,
      notes: o.notes ?? "",
      order_date: o.created_at.slice(0, 10),
      items:
        o.order_items?.length > 0
          ? o.order_items.map((it) => ({
              product_id: it.product_id ?? "manual",
              product_name: it.product_name,
              quantity: String(it.quantity),
              unit_price: String(it.unit_price),
              unit_hpp: String(it.unit_hpp),
            }))
          : [{ ...emptyItem }],
    });
    setDialogOpen(true);
  };

  const setItem = (index: number, patch: Partial<DraftItem>) => {
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  };

  const pickProduct = (index: number, productId: string) => {
    if (productId === "manual") {
      setItem(index, { product_id: "manual" });
      return;
    }
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItem(index, {
      product_id: p.id,
      product_name: p.name,
      unit_price: String(Number(p.price)),
      unit_hpp: String(Number(p.hpp_price)),
    });
  };

  const addItem = () => setDraft((d) => ({ ...d, items: [...d.items, { ...emptyItem }] }));
  const removeItem = (index: number) =>
    setDraft((d) => ({
      ...d,
      items: d.items.length === 1 ? d.items : d.items.filter((_, i) => i !== index),
    }));

  const save = async () => {
    const items = draft.items
      .map((it) => ({
        product_id: it.product_id === "manual" ? null : it.product_id,
        product_name: it.product_name.trim(),
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        unit_hpp: Number(it.unit_hpp) || 0,
      }))
      .filter((it) => it.product_name && it.quantity > 0);

    if (items.length === 0) {
      toast({ title: "Item pesanan kosong", description: "Isi minimal satu produk dengan jumlah.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const paidAt =
      draft.payment_status === "paid"
        ? new Date(`${draft.order_date}T12:00:00`).toISOString()
        : null;
    const payload = {
      customer_name: draft.customer_name.trim() || null,
      customer_phone: draft.customer_phone.trim() || null,
      status: draft.status,
      payment_status: draft.payment_status,
      channel: draft.channel,
      notes: draft.notes.trim() || null,
      paid_at: paidAt,
      total_price: draftTotals.price,
      total_hpp: draftTotals.hpp,
      created_at: new Date(`${draft.order_date}T12:00:00`).toISOString(),
    };

    try {
      if (editing) {
        if (editing.payment_status === "paid") {
          // Hanya update customer info, notes, channel agar immutability item terjaga
          const { error } = await supabase.from("orders").update({
            customer_name: payload.customer_name,
            customer_phone: payload.customer_phone,
            channel: payload.channel,
            notes: payload.notes,
          }).eq("id", editing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("orders").update(payload).eq("id", editing.id);
          if (error) throw error;
          const { error: delErr } = await supabase.from("order_items").delete().eq("order_id", editing.id);
          if (delErr) throw delErr;
          const { error: itemErr } = await supabase
            .from("order_items")
            .insert(items.map((it) => ({ ...it, order_id: editing.id })));
          if (itemErr) throw itemErr;
        }
      } else {
        await createOrder({
          customer_name: draft.customer_name.trim() || undefined,
          customer_phone: draft.customer_phone.trim() || undefined,
          channel: draft.channel as any,
          status: draft.status as any,
          payment_status: draft.payment_status as any,
          paid_at: paidAt ?? undefined,
          notes: draft.notes.trim() || undefined,
          order_date: draft.order_date,
          items: items.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            quantity: it.quantity,
            unit_price: it.unit_price,
            unit_hpp: it.unit_hpp,
          })),
        });
      }

      toast({
        title: editing ? "Pesanan diperbarui" : "Pesanan tersimpan",
        description:
          draft.payment_status === "paid"
            ? "Stok produk terpotong & pemasukan otomatis tercatat di Buku Kas."
            : "Ditandai belum lunas, belum masuk Buku Kas.",
      });
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Gagal menyimpan pesanan", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const togglePayment = async (o: Order) => {
    if (o.status === "cancelled") {
      toast({
        title: "Pesanan telah dibatalkan",
        description: "Pesanan yang berstatus dibatalkan tidak bisa diubah status pembayarannya.",
        variant: "destructive",
      });
      return;
    }
    const next = o.payment_status === "paid" ? "unpaid" : "paid";
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: next, paid_at: next === "paid" ? new Date().toISOString() : null })
      .eq("id", o.id);
    if (error) {
      toast({ title: "Gagal mengubah status bayar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: next === "paid" ? "Ditandai lunas ✓" : "Ditandai belum lunas",
      description:
        next === "paid"
          ? "Stok produk terpotong & pemasukan otomatis tercatat di Buku Kas."
          : "Koreksi kas pembalik dicatat di Buku Kas.",
    });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Gagal memperbarui status", description: error.message, variant: "destructive" });
      load();
      return;
    }
    if (status === "cancelled") {
      toast({
        title: "Pesanan dibatalkan",
        description: "Stok produk otomatis dikembalikan & transaksi pembalik dicatat di Buku Kas.",
      });
    } else {
      toast({
        title: "Status diperbarui",
        description: `Status pesanan diubah ke ${STATUS_LABEL[status] ?? status}.`,
      });
    }
    load();
  };

  const remove = async (o: Order) => {
    if (o.payment_status === "paid") {
      toast({
        title: "Pesanan lunas tidak dapat dihapus",
        description: "Demi integritas pembukuan & audit, pesanan lunas tidak boleh dihapus. Silakan ubah status menjadi 'Dibatalkan' (Cancelled) agar stok dikembalikan dan jurnal pembalik dibuat di Buku Kas.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm("Hapus pesanan ini?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", o.id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pesanan dihapus" });
    load();
  };

  const paidBadge = (o: Order) => (
    <Badge
      variant="outline"
      className={cn(
        "rounded-none text-[10px]",
        o.payment_status === "paid"
          ? "border-emerald-600 text-emerald-700"
          : "border-amber-600 text-amber-700"
      )}
    >
      {o.payment_status === "paid" ? "Lunas" : "Belum Lunas"}
    </Badge>
  );

  return (
    <div className="p-4 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light mb-2">Pesanan</h1>
          <p className="text-sm text-muted-foreground">
            Catat pesanan online maupun penjualan offline. Pesanan lunas otomatis masuk Buku Kas.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Pesanan
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-6 mb-8">
        <div className="border border-border p-4 md:p-6">
          <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mb-2">Sudah Lunas</p>
          <p className="text-lg md:text-3xl font-light text-emerald-700 truncate">{formatIDR(summary.paid)}</p>
        </div>
        <div className="border border-border p-4 md:p-6">
          <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mb-2">Belum Lunas</p>
          <p className="text-lg md:text-3xl font-light text-amber-700 truncate">{formatIDR(summary.unpaid)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground">Status bayar</Label>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="paid">Lunas</SelectItem>
              <SelectItem value="unpaid">Belum lunas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground">Saluran</Label>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filterPayment !== "all" || filterChannel !== "all") && (
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setFilterPayment("all"); setFilterChannel("all"); }}>
            <X className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {loading ? (
        <p className="border border-border py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-border p-10 text-center">
          <ShoppingBag className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pesanan. Klik "Tambah Pesanan" untuk mulai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <div key={o.id} className="border border-border p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{o.customer_name || "Tanpa nama"}</p>
                    {paidBadge(o)}
                    {o.status === "cancelled" && (
                      <Badge variant="destructive" className="rounded-none text-[10px]">
                        Dibatalkan
                      </Badge>
                    )}
                    {o.stock_deducted ? (
                      <Badge variant="outline" className="rounded-none text-[10px] border-emerald-600/70 text-emerald-700 bg-emerald-50/50">
                        Stok Terpotong
                      </Badge>
                    ) : o.status === "cancelled" ? (
                      <Badge variant="outline" className="rounded-none text-[10px] border-blue-600/70 text-blue-700 bg-blue-50/50">
                        Stok Dikembalikan
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="rounded-none text-[10px]">
                      {o.channel === "online" ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {o.customer_phone || "—"} · {formatDateTime(o.created_at)}
                    {o.cancelled_at && ` · Dibatalkan: ${formatDateTime(o.cancelled_at)}`}
                  </p>
                  {o.cancellation_reason && (
                    <p className="text-xs text-red-600 mt-1">Alasan pembatalan: {o.cancellation_reason}</p>
                  )}
                  {o.notes && <p className="text-xs text-muted-foreground mt-1 italic">{o.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{formatIDR(Number(o.total_price))}</span>
                  <select
                    value={STATUSES.includes(o.status) ? o.status : "pending"}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="border border-border bg-background text-xs px-2 py-1.5 focus:outline-none focus:border-foreground"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => togglePayment(o)}>
                    {o.payment_status === "paid" ? "Tandai belum lunas" : "Tandai lunas"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(o)} aria-label="Ubah pesanan">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(o)} aria-label="Hapus pesanan">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {o.order_items?.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-border space-y-1">
                  {o.order_items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-4 text-xs text-muted-foreground">
                      <span className="truncate">{it.product_name} × {it.quantity}</span>
                      <span className="shrink-0">{formatIDR(Number(it.unit_price) * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-light">
              {editing ? "Ubah Pesanan" : "Tambah Pesanan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nama pembeli</Label>
                <Input
                  value={draft.customer_name}
                  onChange={(e) => setDraft((d) => ({ ...d, customer_name: e.target.value }))}
                  placeholder="Contoh: Ibu Rani"
                />
              </div>
              <div>
                <Label className="text-xs">No. WhatsApp</Label>
                <Input
                  value={draft.customer_phone}
                  onChange={(e) => setDraft((d) => ({ ...d, customer_phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Tanggal</Label>
                <Input
                  type="date"
                  value={draft.order_date}
                  onChange={(e) => setDraft((d) => ({ ...d, order_date: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Saluran</Label>
                <Select value={draft.channel} onValueChange={(v) => setDraft((d) => ({ ...d, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status pesanan</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Pembayaran</Label>
                <Select value={draft.payment_status} onValueChange={(v) => setDraft((d) => ({ ...d, payment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Belum lunas</SelectItem>
                    <SelectItem value="paid">Lunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Item pesanan</Label>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={addItem}>
                  <Plus className="w-3 h-3" /> Tambah item
                </Button>
              </div>
              <div className="space-y-3">
                {draft.items.map((it, i) => (
                  <div key={i} className="border border-border p-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <Label className="text-[10px] text-muted-foreground">Produk</Label>
                        <Select value={it.product_id} onValueChange={(v) => pickProduct(i, v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Isi manual</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mt-5"
                        onClick={() => removeItem(i)}
                        aria-label="Hapus item"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Nama item</Label>
                      <Input
                        value={it.product_name}
                        onChange={(e) => setItem(i, { product_name: e.target.value })}
                        placeholder="Nama produk"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Jumlah</Label>
                        <Input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => setItem(i, { quantity: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Harga jual</Label>
                        <Input
                          type="number"
                          min={0}
                          value={it.unit_price}
                          onChange={(e) => setItem(i, { unit_price: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">HPP</Label>
                        <Input
                          type="number"
                          min={0}
                          value={it.unit_hpp}
                          onChange={(e) => setItem(i, { unit_hpp: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Catatan</Label>
              <Textarea
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
              />
            </div>

            <div className="border border-border p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total pesanan</span>
              <span className="font-medium">{formatIDR(draftTotals.price)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Simpan pesanan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
