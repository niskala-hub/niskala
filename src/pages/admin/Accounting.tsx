import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatIDR } from "@/lib/currency";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
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

type TxType = "inflow" | "outflow";

interface CashTransaction {
  id: string;
  transaction_date: string;
  type: TxType;
  category: string;
  amount: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

const INFLOW_CATEGORIES = ["Penjualan", "Capital Injection", "Pelunasan Piutang", "Lainnya"];
const OUTFLOW_CATEGORIES = [
  "Belanja Kain",
  "Biaya Jahit",
  "Packaging",
  "Operasional",
  "Gaji",
  "Marketing",
  "Lainnya",
];

interface Draft {
  type: TxType;
  amount: string;
  category: string;
  transaction_date: string;
  description: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyDraft: Draft = {
  type: "inflow",
  amount: "",
  category: "Penjualan",
  transaction_date: todayStr(),
  description: "",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Accounting() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [grossProfit, setGrossProfit] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CashTransaction | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const load = async () => {
    setLoading(true);
    const [tx, orders] = await Promise.all([
      supabase
        .from("cash_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("orders").select("total_price, total_hpp"),
    ]);
    if (tx.error) {
      toast({ title: "Gagal memuat transaksi", description: tx.error.message, variant: "destructive" });
    } else {
      setTransactions((tx.data ?? []) as CashTransaction[]);
    }
    if (!orders.error) {
      const profit = (orders.data ?? []).reduce(
        (sum, o) => sum + (Number(o.total_price) - Number(o.total_hpp)),
        0
      );
      setGrossProfit(profit);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { totalInflow, totalOutflow, balance } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const t of transactions) {
      if (t.type === "inflow") inflow += Number(t.amount);
      else outflow += Number(t.amount);
    }
    return { totalInflow: inflow, totalOutflow: outflow, balance: inflow - outflow };
  }, [transactions]);

  const allCategories = useMemo(
    () => Array.from(new Set([...INFLOW_CATEGORIES, ...OUTFLOW_CATEGORIES])),
    []
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = t.transaction_date.slice(0, 10);
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      return true;
    });
  }, [transactions, filterFrom, filterTo, filterCategory]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, transaction_date: todayStr() });
    setDialogOpen(true);
  };

  const openEdit = (t: CashTransaction) => {
    setEditing(t);
    setDraft({
      type: t.type,
      amount: String(t.amount),
      category: t.category,
      transaction_date: t.transaction_date.slice(0, 10),
      description: t.description ?? "",
    });
    setDialogOpen(true);
  };

  const setType = (type: TxType) => {
    setDraft((d) => ({
      ...d,
      type,
      category: type === "inflow" ? INFLOW_CATEGORIES[0] : OUTFLOW_CATEGORIES[0],
    }));
  };

  const save = async () => {
    const amount = Number(draft.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Nominal tidak valid", description: "Masukkan nominal lebih dari 0.", variant: "destructive" });
      return;
    }
    if (!draft.transaction_date) {
      toast({ title: "Tanggal wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      type: draft.type,
      amount,
      category: draft.category,
      transaction_date: new Date(`${draft.transaction_date}T12:00:00`).toISOString(),
      description: draft.description.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("cash_transactions").update(payload).eq("id", editing.id)
      : await supabase.from("cash_transactions").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Transaksi diperbarui" : "Transaksi tercatat" });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    const { error } = await supabase.from("cash_transactions").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Transaksi dihapus" });
    load();
  };

  const categories = draft.type === "inflow" ? INFLOW_CATEGORIES : OUTFLOW_CATEGORIES;

  const cards = [
    { label: "Saldo Kas Real-Time", value: balance, icon: Wallet, accent: balance >= 0 ? "text-foreground" : "text-red-600" },
    { label: "Total Pemasukan", value: totalInflow, icon: TrendingUp, accent: "text-emerald-700" },
    { label: "Total Pengeluaran", value: totalOutflow, icon: TrendingDown, accent: "text-red-600" },
    { label: "Estimasi Laba Kotor", value: grossProfit, icon: PiggyBank, accent: "text-foreground" },
  ];

  return (
    <div className="p-4 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light mb-2">Accounting &amp; Keuangan</h1>
          <p className="text-sm text-muted-foreground">Buku kas real-time NISKALA.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Catat Transaksi Kas
        </Button>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="border border-border p-4 md:p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-3 md:mb-4">
              <c.icon className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
              <span className="text-[10px] md:text-xs uppercase tracking-wider leading-tight">{c.label}</span>
            </div>
            <p className={cn("text-lg md:text-3xl font-light truncate", c.accent)} title={formatIDR(c.value)}>
              {formatIDR(c.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <Label className="text-xs text-muted-foreground">Dari tanggal</Label>
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Sampai</Label>
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Kategori</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              {allCategories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterFrom || filterTo || filterCategory !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterFrom(""); setFilterTo(""); setFilterCategory("all"); }}
            className="gap-1"
          >
            <X className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {/* Ledger */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Tipe</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Keterangan</th>
              <th className="px-4 py-3 font-medium text-right">Nominal</th>
              <th className="px-4 py-3 font-medium text-right w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada transaksi. Klik "Catat Transaksi Kas" untuk memulai.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-none",
                        t.type === "inflow"
                          ? "border-emerald-600 text-emerald-700"
                          : "border-red-600 text-red-600"
                      )}
                    >
                      {t.type === "inflow" ? "Masuk" : "Keluar"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{t.category}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate" title={t.description ?? ""}>
                    {t.description ?? "—"}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right whitespace-nowrap",
                      t.type === "inflow" ? "text-emerald-700" : "text-red-600"
                    )}
                  >
                    {t.type === "inflow" ? "+" : "−"} {formatIDR(Number(t.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(t)} className="p-2 hover:bg-muted" aria-label="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(t.id)} className="p-2 hover:bg-muted text-red-600" aria-label="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Transaksi" : "Catat Transaksi Kas"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("inflow")}
                className={cn(
                  "border px-3 py-2.5 text-sm transition-colors",
                  draft.type === "inflow"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-medium"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                Pemasukan (Inflow)
              </button>
              <button
                type="button"
                onClick={() => setType("outflow")}
                className={cn(
                  "border px-3 py-2.5 text-sm transition-colors",
                  draft.type === "outflow"
                    ? "border-red-600 bg-red-50 text-red-600 font-medium"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                Pengeluaran (Outflow)
              </button>
            </div>
            <div>
              <Label htmlFor="amount">Nominal (Rp)</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="contoh: 500000"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
              {Number(draft.amount) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{formatIDR(Number(draft.amount))}</p>
              )}
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tx-date">Tanggal</Label>
              <Input
                id="tx-date"
                type="date"
                value={draft.transaction_date}
                onChange={(e) => setDraft({ ...draft, transaction_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tx-desc">Catatan / Keterangan</Label>
              <Textarea
                id="tx-desc"
                rows={3}
                placeholder="contoh: Penjualan daster via WhatsApp"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Simpan Transaksi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
