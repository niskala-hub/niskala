import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatIDR } from "@/lib/currency";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getNiskalaLogoPng, PDF_COLORS, drawReportHeader, drawReportFooters } from "@/lib/pdfTheme";
import {
  Package,
  RefreshCw,
  Download,
  FileText,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { exportToCsv } from "@/services/reportService";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SizeStock {
  id: string;
  name: string | null;
  ld: number;
  category: string;
  stock: number;
  price: number | null;
  hpp_price: number | null;
}

interface ProductStock {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  price: number;
  hpp_price: number;
  stock: number;
  category_name: string | null;
  sizes: SizeStock[];
}

type StockFilter = "all" | "available" | "low" | "out";

const LOW_STOCK_THRESHOLD = 5;

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="border border-border bg-card p-5 rounded-sm space-y-2 hover:border-primary/40 transition-colors">
      <div className={`inline-flex p-2 rounded-sm ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Stock Badge
// ─────────────────────────────────────────────
function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" /> Habis
      </span>
    );
  if (stock <= LOW_STOCK_THRESHOLD)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" /> Menipis
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle className="w-3 h-3" /> Tersedia
    </span>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function StockReport() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // ── Load Data ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: prods, error: pErr }, { data: sizes, error: sErr }] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,slug,status,price,hpp_price,stock,category_id,categories(name)")
          .order("name"),
        supabase
          .from("product_sizes")
          .select("id,product_id,name,ld,category,stock,price,hpp_price,sort_order")
          .order("sort_order"),
      ]);

      if (pErr) throw pErr;
      if (sErr) throw sErr;

      const sizesByProduct: Record<string, SizeStock[]> = {};
      for (const s of sizes || []) {
        if (!sizesByProduct[s.product_id]) sizesByProduct[s.product_id] = [];
        sizesByProduct[s.product_id].push({
          id: s.id,
          name: s.name,
          ld: s.ld,
          category: s.category,
          stock: s.stock,
          price: s.price,
          hpp_price: s.hpp_price,
        });
      }

      const list: ProductStock[] = (prods || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        price: Number(p.price),
        hpp_price: Number(p.hpp_price),
        stock: Number(p.stock),
        category_name: p.categories?.name ?? null,
        sizes: sizesByProduct[p.id] || [],
      }));

      setProducts(list);
    } catch (err: any) {
      toast({ title: "Gagal memuat data stok", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Toggle expand ───────────────────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredProducts.map((p) => p.id)));
    }
    setExpandAll(!expandAll);
  };

  // ── Derived / filtered ──────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = products;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category_name && p.category_name.toLowerCase().includes(q)) ||
          p.sizes.some((s) => (s.name || "").toLowerCase().includes(q))
      );
    }

    // Stock filter
    if (filter === "out") list = list.filter((p) => p.stock === 0);
    else if (filter === "low") list = list.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
    else if (filter === "available") list = list.filter((p) => p.stock > LOW_STOCK_THRESHOLD);

    return list;
  }, [products, search, filter]);

  // KPI summary
  const kpi = useMemo(() => {
    const total = products.length;
    const out = products.filter((p) => p.stock === 0).length;
    const low = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
    const totalStock = products.reduce((s, p) => s + p.stock, 0);
    const totalSizes = products.reduce((s, p) => s + p.sizes.length, 0);
    const totalValue = products.reduce((s, p) => {
      if (p.sizes.length > 0) {
        return s + p.sizes.reduce((ss, sz) => ss + sz.stock * (sz.price ?? p.price), 0);
      }
      return s + p.stock * p.price;
    }, 0);
    return { total, out, low, totalStock, totalSizes, totalValue };
  }, [products]);

  // ── Flatten rows for export ─────────────────────────────────────────────────
  const flatRows = useMemo(() => {
    const rows: {
      product: string;
      category: string;
      size_label: string;
      ld: string;
      size_category: string;
      stock: number;
      price: number;
      hpp: number;
      stock_value: number;
      status: string;
    }[] = [];

    for (const p of filteredProducts) {
      if (p.sizes.length > 0) {
        for (const s of p.sizes) {
          rows.push({
            product: p.name,
            category: p.category_name || "-",
            size_label: s.name || `LD ${s.ld}cm`,
            ld: `${s.ld} cm`,
            size_category: s.category,
            stock: s.stock,
            price: s.price ?? p.price,
            hpp: s.hpp_price ?? p.hpp_price,
            stock_value: s.stock * (s.price ?? p.price),
            status: s.stock === 0 ? "Habis" : s.stock <= LOW_STOCK_THRESHOLD ? "Menipis" : "Tersedia",
          });
        }
      } else {
        rows.push({
          product: p.name,
          category: p.category_name || "-",
          size_label: "Standar",
          ld: "-",
          size_category: "-",
          stock: p.stock,
          price: p.price,
          hpp: p.hpp_price,
          stock_value: p.stock * p.price,
          status: p.stock === 0 ? "Habis" : p.stock <= LOW_STOCK_THRESHOLD ? "Menipis" : "Tersedia",
        });
      }
    }
    return rows;
  }, [filteredProducts]);

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!flatRows.length) return;
    const headers = [
      "Nama Produk",
      "Kategori",
      "Label Ukuran",
      "LD",
      "Kategori Ukuran",
      "Stok",
      "Harga Jual",
      "HPP",
      "Nilai Stok",
      "Status Stok",
    ];
    const rows = flatRows.map((r) => [
      r.product,
      r.category,
      r.size_label,
      r.ld,
      r.size_category,
      r.stock,
      r.price,
      r.hpp,
      r.stock_value,
      r.status,
    ]);
    exportToCsv(`laporan-stok-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast({ title: "CSV berhasil diunduh" });
  };

  // ── Export PDF ──────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!flatRows.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date();
    const logoPng = await getNiskalaLogoPng();

    const filterText =
      filter === "all"
        ? "Semua Stok"
        : filter === "available"
        ? "Stok Tersedia (>5)"
        : filter === "low"
        ? "Stok Menipis (<=5)"
        : "Stok Habis";

    // ── Header bar ──
    const startY = drawReportHeader(doc, {
      logoPng,
      title: "Laporan Stok Produk (Stock Opname)",
      subtitle: `Filter: ${filterText}  |  ${filteredProducts.length} Produk (${flatRows.length} Varian Ukuran)`,
      rightInfo: [
        "NISKALA STOCK REPORT",
        `Dicetak: ${now.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      ],
      marginX: 14,
      topY: 10,
    });

    // ── KPI Summary row ──
    const kpiItems = [
      { label: "Total Produk", value: String(kpi.total) },
      { label: "Total Ukuran", value: String(kpi.totalSizes) },
      { label: "Total Stok (pcs)", value: String(kpi.totalStock) },
      { label: "Habis", value: String(kpi.out) },
      { label: "Menipis", value: String(kpi.low) },
      { label: "Nilai Stok Est.", value: formatIDR(kpi.totalValue) },
    ];
    const boxW = (pageW - 28 - 10) / 6;
    const boxH = 15;
    kpiItems.forEach((k, i) => {
      const x = 14 + i * (boxW + 2);
      const y = startY + 1;
      doc.setFillColor(...PDF_COLORS.champagneLight);
      doc.setDrawColor(...PDF_COLORS.champagne);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, "FD");

      doc.setFontSize(6);
      doc.setTextColor(...PDF_COLORS.champagneDark);
      doc.setFont("helvetica", "bold");
      doc.text(k.label.toUpperCase(), x + 3, y + 4.5);

      doc.setFontSize(8);
      doc.setTextColor(...PDF_COLORS.textDark);
      doc.setFont("helvetica", "bold");
      doc.text(k.value, x + 3, y + 11.5);
    });

    // ── Main table ──
    autoTable(doc, {
      startY: startY + boxH + 4,
      margin: { left: 14, right: 14 },
      head: [
        ["#", "Nama Produk", "Kategori", "Label Ukuran", "LD", "Kat. Ukuran", "Stok", "Harga Jual", "HPP", "Nilai Stok", "Status"],
      ],
      body: flatRows.map((r, i) => [
        i + 1,
        r.product,
        r.category,
        r.size_label,
        r.ld,
        r.size_category,
        `${r.stock} pcs`,
        formatIDR(r.price),
        formatIDR(r.hpp),
        formatIDR(r.stock_value),
        r.status,
      ]),
      foot: [[
        "",
        `${filteredProducts.length} produk`,
        "",
        `${flatRows.length} varian`,
        "",
        "",
        `${flatRows.reduce((s, r) => s + r.stock, 0)} pcs`,
        "",
        "",
        formatIDR(flatRows.reduce((s, r) => s + r.stock_value, 0)),
        "",
      ]],
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: PDF_COLORS.textDark,
        lineColor: PDF_COLORS.champagne,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: PDF_COLORS.champagne,
        textColor: PDF_COLORS.textDark,
        fontStyle: "bold",
        fontSize: 7,
      },
      footStyles: {
        fillColor: PDF_COLORS.champagneLight,
        textColor: PDF_COLORS.textDark,
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: PDF_COLORS.champagneLight,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 48 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 16, halign: "center" },
        5: { cellWidth: 22 },
        6: { cellWidth: 16, halign: "right" },
        7: { cellWidth: 28, halign: "right" },
        8: { cellWidth: 28, halign: "right" },
        9: { cellWidth: 28, halign: "right" },
        10: { cellWidth: 20, halign: "center" },
      },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 10) {
          const val = String(data.cell.raw);
          if (val === "Habis") {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Menipis") {
            data.cell.styles.textColor = [161, 98, 7];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
        if (data.section === "body") {
          const stockStr = String(data.row.cells[6]?.raw ?? "");
          if (stockStr === "0 pcs") {
            data.cell.styles.fillColor = [254, 242, 242];
          }
        }
      },
    });

    drawReportFooters(doc, { reportName: "Laporan Stok (Stock Opname)" });

    doc.save(`laporan-stok-niskala-${now.toISOString().slice(0, 10)}.pdf`);
    toast({ title: "PDF berhasil diunduh", description: `${flatRows.length} baris data stok` });
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-light flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" />
            Laporan Stok
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stok per produk &amp; ukuran · {products.length} produk · {kpi.totalSizes} varian ukuran
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!flatRows.length}
            className="flex items-center gap-2 px-3 py-2 border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!flatRows.length}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Produk"
          value={kpi.total}
          icon={<Package className="w-4 h-4" />}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label="Total Varian Ukuran"
          value={kpi.totalSizes}
          icon={<Layers className="w-4 h-4" />}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          label="Total Stok (pcs)"
          value={kpi.totalStock.toLocaleString("id-ID")}
          sub="Semua ukuran digabung"
          icon={<CheckCircle className="w-4 h-4" />}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Produk Habis"
          value={kpi.out}
          sub="Stok = 0"
          icon={<XCircle className="w-4 h-4" />}
          color="bg-red-500/10 text-red-600"
        />
        <StatCard
          label="Stok Menipis"
          value={kpi.low}
          sub={`Stok ≤ ${LOW_STOCK_THRESHOLD} pcs`}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          label="Nilai Stok Est."
          value={formatIDR(kpi.totalValue)}
          sub="Harga Jual × Stok"
          icon={<FileText className="w-4 h-4" />}
          color="bg-purple-500/10 text-purple-600"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk / ukuran..."
            className="w-full pl-9 pr-3 py-2 border border-border bg-background text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Stock filter tabs */}
        <div className="flex items-center gap-1 border border-border bg-muted/30 p-0.5">
          {(["all", "available", "low", "out"] as StockFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Semua" : f === "available" ? "Tersedia" : f === "low" ? "Menipis" : "Habis"}
            </button>
          ))}
        </div>

        <div className="sm:ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{filteredProducts.length} produk · {flatRows.length} baris</span>
          <button
            onClick={toggleExpandAll}
            className="flex items-center gap-1 px-2 py-1 border border-border hover:bg-muted transition-colors text-xs"
          >
            {expandAll ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expandAll ? "Tutup Semua" : "Buka Semua"}
          </button>
        </div>
      </div>

      {/* ── Products Table ── */}
      {loading ? (
        <div className="border border-border p-16 text-center animate-pulse text-muted-foreground text-sm">
          Memuat data stok...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Tidak ada produk ditemukan</p>
          <p className="text-xs text-muted-foreground mt-1">Coba ubah filter atau kata kunci pencarian.</p>
        </div>
      ) : (
        <div className="border border-border overflow-hidden">
          <table className="w-full text-sm">
            {/* Desktop head */}
            <thead className="bg-muted/50 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3 text-left">Nama Produk</th>
                <th className="px-4 py-3 text-left">Kategori</th>
                <th className="px-4 py-3 text-right w-24">Varian</th>
                <th className="px-4 py-3 text-right w-28">Total Stok</th>
                <th className="px-4 py-3 text-right w-32">Harga Jual</th>
                <th className="px-4 py-3 text-right w-32">Nilai Stok Est.</th>
                <th className="px-4 py-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const isExpanded = expandedIds.has(p.id);
                const stockValue =
                  p.sizes.length > 0
                    ? p.sizes.reduce((s, sz) => s + sz.stock * (sz.price ?? p.price), 0)
                    : p.stock * p.price;

                return (
                  <>
                    {/* Product row */}
                    <tr
                      key={p.id}
                      onClick={() => p.sizes.length > 0 && toggleExpand(p.id)}
                      className={`border-t border-border transition-colors ${
                        p.sizes.length > 0 ? "cursor-pointer hover:bg-muted/40" : "hover:bg-muted/20"
                      } ${p.stock === 0 ? "bg-red-50/40" : ""}`}
                    >
                      <td className="px-4 py-3 text-center">
                        {p.sizes.length > 0 ? (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground mx-auto" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="block w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{p.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {p.category_name || "–"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.sizes.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                            <Layers className="w-3 h-3" />
                            {p.sizes.length} ukuran
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Standar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-foreground">
                          {p.stock.toLocaleString("id-ID")}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">pcs</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {formatIDR(p.price)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-xs">
                        {formatIDR(stockValue)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StockBadge stock={p.stock} />
                      </td>
                    </tr>

                    {/* Expanded size rows */}
                    {isExpanded &&
                      p.sizes.map((s) => (
                        <tr
                          key={s.id}
                          className={`border-t border-border/50 text-xs ${
                            s.stock === 0 ? "bg-red-50/60" : "bg-muted/10"
                          }`}
                        >
                          <td className="px-4 py-2 text-center">
                            <div className="w-px h-5 bg-border mx-auto" />
                          </td>
                          <td className="px-4 py-2 pl-10">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                              <span className="font-medium text-foreground">
                                {s.name ? `${s.name}` : `LD ${s.ld}cm`}
                              </span>
                              <span className="text-muted-foreground">
                                — LD {s.ld} cm
                              </span>
                            </div>
                            <div className="ml-5 text-[11px] text-muted-foreground mt-0.5">
                              {s.category}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {s.category}
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">—</td>
                          <td className="px-4 py-2 text-right">
                            <span className={`font-bold ${s.stock === 0 ? "text-red-600" : s.stock <= LOW_STOCK_THRESHOLD ? "text-amber-600" : "text-foreground"}`}>
                              {s.stock.toLocaleString("id-ID")}
                            </span>
                            <span className="text-muted-foreground ml-1">pcs</span>
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {s.price != null ? (
                              <span className="text-primary font-medium">{formatIDR(s.price)}</span>
                            ) : (
                              <span className="text-muted-foreground/60">↑ Master</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {formatIDR(s.stock * (s.price ?? p.price))}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <StockBadge stock={s.stock} />
                          </td>
                        </tr>
                      ))}
                  </>
                );
              })}
            </tbody>

            {/* Footer total row */}
            <tfoot className="border-t-2 border-border bg-muted/40">
              <tr className="font-semibold text-sm">
                <td />
                <td className="px-4 py-3 text-xs uppercase tracking-wider">
                  TOTAL ({filteredProducts.length} produk)
                </td>
                <td />
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {flatRows.length} baris
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground">
                  {flatRows.reduce((s, r) => s + r.stock, 0).toLocaleString("id-ID")}{" "}
                  <span className="font-normal text-muted-foreground text-xs">pcs</span>
                </td>
                <td />
                <td className="px-4 py-3 text-right font-bold text-foreground">
                  {formatIDR(flatRows.reduce((s, r) => s + r.stock_value, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
        <span className="font-medium text-foreground">Keterangan:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-100 border border-red-200 inline-block" />
          Baris merah = stok 0 (habis)
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3 text-emerald-600" /> Tersedia = stok &gt; {LOW_STOCK_THRESHOLD}
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> Menipis = stok 1–{LOW_STOCK_THRESHOLD}
        </span>
        <span className="flex items-center gap-1.5">
          <XCircle className="w-3 h-3 text-red-600" /> Habis = stok = 0
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-primary font-medium">↑ Master</span> = harga mengikuti harga master produk
        </span>
        <span className="ml-auto">
          Klik baris produk untuk melihat detail ukuran
        </span>
      </div>
    </div>
  );
}
