import { useCallback, useEffect, useMemo, useState } from "react";
import { formatIDR } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getNiskalaLogoPng, PDF_COLORS, drawReportHeader, drawReportFooters } from "@/lib/pdfTheme";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Package,
  Download,
  RefreshCw,
  Calendar,
  ChevronDown,
  Trophy,
  FileText,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  fetchOrderReportSummary,
  fetchOrderReportBreakdown,
  fetchTopSellingVariants,
  fetchOrderItemsReport,
  exportToCsv,
  type ReportSummary,
  type ReportPeriodicBucket,
  type TopSellingVariant,
  type OrderItemReportRow,
  type PeriodAggregation,
} from "@/services/reportService";

// ─────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────
type PresetRange =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "all_time";

type ChannelFilter = "all" | "online" | "offline";
type PaymentFilter = "all" | "paid" | "unpaid";

const PRESET_LABELS: Record<PresetRange, string> = {
  today: "Hari Ini",
  this_week: "7 Hari Terakhir",
  this_month: "Bulan Ini",
  last_month: "Bulan Lalu",
  this_year: "Tahun Ini",
  all_time: "Semua Waktu",
};

function getDateRange(preset: PresetRange): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString();

  switch (preset) {
    case "today": {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      return { start: fmt(start), end: fmt(end) };
    }
    case "this_week": {
      const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
      return { start: fmt(start), end: fmt(now) };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: fmt(start), end: fmt(now) };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: fmt(start), end: fmt(end) };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: fmt(start), end: fmt(now) };
    }
    case "all_time":
    default:
      return { start: "2024-01-01T00:00:00.000Z", end: fmt(now) };
  }
}

function getDefaultPeriod(preset: PresetRange): PeriodAggregation {
  if (preset === "today" || preset === "this_week") return "day";
  if (preset === "this_month" || preset === "last_month") return "day";
  if (preset === "this_year") return "month";
  return "month";
}

// ─────────────────────────────────────────────
// KPI Card Component
// ─────────────────────────────────────────────
interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  accent?: string;
}

function KPICard({ label, value, sub, icon, trend, accent }: KPICardProps) {
  return (
    <div className="border border-border bg-card p-5 rounded-sm space-y-2 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2 rounded-sm ${accent ?? "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-600" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Custom Tooltip for charts
// ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex justify-between gap-4 items-center">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium">
            {entry.name === "Order" ? entry.value : formatIDR(Number(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Reports Page
// ─────────────────────────────────────────────
export default function Reports() {
  const { toast } = useToast();

  // Filters
  const [preset, setPreset] = useState<PresetRange>("this_month");
  const [period, setPeriod] = useState<PeriodAggregation>("day");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  // Data
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [breakdown, setBreakdown] = useState<ReportPeriodicBucket[]>([]);
  const [topVariants, setTopVariants] = useState<TopSellingVariant[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemReportRow[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const dateRange = useMemo(() => {
    if (useCustom && customStart && customEnd) {
      return {
        start: new Date(customStart + "T00:00:00").toISOString(),
        end: new Date(customEnd + "T23:59:59").toISOString(),
      };
    }
    return getDateRange(preset);
  }, [preset, useCustom, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        channel,
        paymentStatus,
      };
      const [sum, brk, top, items] = await Promise.all([
        fetchOrderReportSummary(filters),
        fetchOrderReportBreakdown({ ...filters, period }),
        fetchTopSellingVariants({ startDate: dateRange.start, endDate: dateRange.end }),
        fetchOrderItemsReport(filters),
      ]);
      setSummary(sum);
      setBreakdown(brk);
      setTopVariants(top);
      setOrderItems(items);
    } catch (err: any) {
      toast({ title: "Gagal memuat laporan", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateRange, channel, paymentStatus, period]);

  useEffect(() => {
    if (!useCustom) {
      setPeriod(getDefaultPeriod(preset));
    }
  }, [preset, useCustom]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived metrics
  const grossMargin = summary && summary.total_paid_sales > 0
    ? ((summary.total_gross_profit / summary.total_paid_sales) * 100).toFixed(1)
    : "0.0";

  // Export handler
  const handleExportBreakdown = () => {
    if (!breakdown.length) return;
    const headers = ["Periode", "Jumlah Order", "Omset", "HPP", "Laba Kotor", "Item Terjual"];
    const rows = breakdown.map((b) => [
      b.period_bucket,
      b.order_count,
      b.total_revenue,
      b.total_cogs,
      b.total_profit,
      b.items_sold,
    ]);
    exportToCsv(`laporan-order-${dateRange.start.slice(0, 10)}`, headers, rows);
    toast({ title: "Laporan berhasil diunduh sebagai CSV" });
  };

  const handleExportTopVariants = () => {
    if (!topVariants.length) return;
    const headers = ["Produk", "Varian Size", "Qty Terjual", "Total Omset", "Total Laba"];
    const rows = topVariants.map((v) => [
      v.product_name,
      v.size_name,
      v.quantity_sold,
      v.total_revenue,
      v.total_profit,
    ]);
    exportToCsv(`top-varian-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast({ title: "Data terlaris berhasil diunduh sebagai CSV" });
  };

  const handleExportOrderItems = () => {
    if (!orderItems.length) return;
    const headers = [
      "Tanggal",
      "Order ID",
      "Nama Item",
      "Ukuran Item",
      "Pelanggan",
      "Channel",
      "Status Bayar",
      "Status Pesanan",
      "Qty",
      "Harga Satuan",
      "Subtotal",
      "HPP Satuan",
      "Estimasi Laba",
    ];
    const rows = filteredOrderItems.map((it) => [
      it.created_at ? new Date(it.created_at).toLocaleString("id-ID") : "-",
      it.order_id,
      it.product_name,
      it.size_name || "Standar",
      it.customer_name || "-",
      it.channel || "online",
      it.payment_status || "paid",
      it.status || "done",
      it.quantity,
      it.unit_price,
      it.subtotal,
      it.unit_hpp,
      it.subtotal - (it.unit_hpp * it.quantity),
    ]);
    exportToCsv(`rincian-item-pesanan-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast({ title: "Rincian item berhasil diunduh sebagai CSV" });
  };

  // Filtered order items by search
  const filteredOrderItems = useMemo(() => {
    if (!itemSearch.trim()) return orderItems;
    const q = itemSearch.toLowerCase();
    return orderItems.filter(
      (it) =>
        it.product_name.toLowerCase().includes(q) ||
        (it.size_name && it.size_name.toLowerCase().includes(q)) ||
        (it.customer_name && it.customer_name.toLowerCase().includes(q))
    );
  }, [orderItems, itemSearch]);

  // ── PDF Export ─────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!summary) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date();
    const logoPng = await getNiskalaLogoPng();
    const periodLabel = useCustom
      ? `${customStart} s/d ${customEnd}`
      : PRESET_LABELS[preset];
    const chLabel = channel === "all" ? "Semua Channel" : channel === "online" ? "Online" : "Offline";
    const pyLabel = paymentStatus === "all" ? "Semua Status" : paymentStatus === "paid" ? "Lunas" : "Belum Lunas";

    // ── Header ──
    const startY = drawReportHeader(doc, {
      logoPng,
      title: "Laporan Pesanan & Penjualan",
      subtitle: `Periode: ${periodLabel}   |   Channel: ${chLabel}   |   Status: ${pyLabel}`,
      rightInfo: [
        "NISKALA ORDER REPORT",
        `Dicetak: ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      ],
      marginX: 14,
      topY: 10,
    });

    // ── KPI Summary boxes ──
    const kpis = [
      { label: "Omset (Lunas)", value: formatIDR(Number(summary.total_paid_sales)) },
      { label: "Laba Kotor", value: formatIDR(Number(summary.total_gross_profit)) },
      { label: "HPP / COGS", value: formatIDR(Number(summary.total_cogs)) },
      { label: "Avg. Order Value", value: formatIDR(Number(summary.average_order_value)) },
      { label: "Total Order", value: String(summary.total_orders) },
      { label: "Item Terjual", value: String(summary.total_items_sold) },
    ];
    const boxW = (pageW - 28 - 10) / 3;
    const boxH = 15;
    const rowY = [startY + 1, startY + 1 + boxH + 3];
    kpis.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 14 + col * (boxW + 5);
      const y = rowY[row];
      doc.setFillColor(...PDF_COLORS.champagneLight);
      doc.setDrawColor(...PDF_COLORS.champagne);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, "FD");

      doc.setFontSize(6.5);
      doc.setTextColor(...PDF_COLORS.champagneDark);
      doc.setFont("helvetica", "bold");
      doc.text(k.label.toUpperCase(), x + 3, y + 4.5);

      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.textDark);
      doc.setFont("helvetica", "bold");
      doc.text(k.value, x + 3, y + 11.5);
    });

    let yPos = rowY[1] + boxH + 7;

    // ── Breakdown Table ──
    if (breakdown.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.textDark);
      doc.text("Rincian Periodik", 14, yPos);
      yPos += 2.5;
      autoTable(doc, {
        startY: yPos,
        margin: { left: 14, right: 14 },
        head: [["Periode", "Order", "Item", "Omset", "HPP", "Laba Kotor", "Margin"]],
        body: breakdown.map((b) => {
          const margin = b.total_revenue > 0 ? ((b.total_profit / b.total_revenue) * 100).toFixed(1) + "%" : "0%";
          return [
            b.period_bucket,
            b.order_count,
            b.items_sold,
            formatIDR(Number(b.total_revenue)),
            formatIDR(Number(b.total_cogs)),
            formatIDR(Number(b.total_profit)),
            margin,
          ];
        }),
        foot: [[
          "TOTAL",
          breakdown.reduce((s, r) => s + Number(r.order_count), 0),
          breakdown.reduce((s, r) => s + Number(r.items_sold), 0),
          formatIDR(breakdown.reduce((s, r) => s + Number(r.total_revenue), 0)),
          formatIDR(breakdown.reduce((s, r) => s + Number(r.total_cogs), 0)),
          formatIDR(breakdown.reduce((s, r) => s + Number(r.total_profit), 0)),
          "-",
        ]],
        styles: {
          fontSize: 7,
          cellPadding: 2.2,
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
        alternateRowStyles: { fillColor: PDF_COLORS.champagneLight },
        columnStyles: { 0: { cellWidth: 25 }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
      });
      yPos = (doc as any).lastAutoTable.finalY + 7;
    }

    // ── Top Variants Table ──
    if (topVariants.length > 0) {
      if (yPos > 240) { doc.addPage(); yPos = 14; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.textDark);
      doc.text("Varian Produk Terlaris (Top 10)", 14, yPos);
      yPos += 2.5;
      autoTable(doc, {
        startY: yPos,
        margin: { left: 14, right: 14 },
        head: [["#", "Produk", "Varian Size", "Qty", "Total Omset", "Total Laba"]],
        body: topVariants.map((v, i) => [
          i + 1,
          v.product_name,
          v.size_name,
          v.quantity_sold,
          formatIDR(Number(v.total_revenue)),
          formatIDR(Number(v.total_profit)),
        ]),
        styles: {
          fontSize: 7,
          cellPadding: 2.2,
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
        alternateRowStyles: { fillColor: PDF_COLORS.champagneLight },
        columnStyles: { 0: { cellWidth: 8 }, 4: { halign: "right" }, 5: { halign: "right" } },
      });
      yPos = (doc as any).lastAutoTable.finalY + 7;
    }

    // ── Order Items Detail Table ──
    if (orderItems.length > 0) {
      if (yPos > 210) { doc.addPage(); yPos = 14; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_COLORS.textDark);
      doc.text("Rincian Penjualan Item (Nama Item & Ukuran)", 14, yPos);
      yPos += 2.5;
      autoTable(doc, {
        startY: yPos,
        margin: { left: 14, right: 14 },
        head: [["Tanggal", "Nama Item", "Ukuran Item", "Pelanggan", "Qty", "Harga Satuan", "Subtotal"]],
        body: orderItems.slice(0, 40).map((it) => [
          it.created_at ? new Date(it.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-",
          it.product_name,
          it.size_name || "Standar",
          it.customer_name || "-",
          it.quantity,
          formatIDR(it.unit_price),
          formatIDR(it.subtotal),
        ]),
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
        alternateRowStyles: { fillColor: PDF_COLORS.champagneLight },
        columnStyles: { 4: { halign: "center" }, 5: { halign: "right" }, 6: { halign: "right" } },
      });
    }

    // ── Footer dengan Branding NISKALA Hub ──
    drawReportFooters(doc, { reportName: "Laporan Pesanan & Penjualan" });

    doc.save(`laporan-pesanan-${now.toISOString().slice(0, 10)}.pdf`);
    toast({ title: "PDF berhasil diunduh" });
  };

  // Chart data
  const chartData = breakdown.map((b) => ({
    label: b.period_bucket,
    Omset: Number(b.total_revenue),
    "Laba Kotor": Number(b.total_profit),
    Order: Number(b.order_count),
  }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Laporan Pesanan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Analisis omset, laba kotor, dan performa varian produk
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-primary/30 text-foreground hover:bg-primary/10"
            onClick={handleExportPDF}
            disabled={loading || !summary}
          >
            <FileText className="w-3.5 h-3.5 text-red-500" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="border border-border bg-card/60 rounded-sm p-4 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Filter Laporan</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Preset */}
          <div>
            <Label className="text-[10px] text-muted-foreground">Periode Preset</Label>
            <Select
              value={useCustom ? "custom" : preset}
              onValueChange={(v) => {
                if (v === "custom") { setUseCustom(true); }
                else { setUseCustom(false); setPreset(v as PresetRange); }
              }}
            >
              <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRESET_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
                <SelectItem value="custom">Rentang Kustom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom date range */}
          {useCustom && (
            <>
              <div>
                <Label className="text-[10px] text-muted-foreground">Dari Tanggal</Label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 border border-border text-xs bg-background rounded"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Sampai Tanggal</Label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 border border-border text-xs bg-background rounded"
                />
              </div>
            </>
          )}

          {/* Aggregation Period */}
          <div>
            <Label className="text-[10px] text-muted-foreground">Kelompokkan Per</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodAggregation)}>
              <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Harian</SelectItem>
                <SelectItem value="month">Bulanan</SelectItem>
                <SelectItem value="year">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channel */}
          <div>
            <Label className="text-[10px] text-muted-foreground">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as ChannelFilter)}>
              <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment status */}
          <div>
            <Label className="text-[10px] text-muted-foreground">Status Bayar</Label>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentFilter)}>
              <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="unpaid">Belum Lunas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {loading && !summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-border bg-card/50 p-5 h-28 rounded-sm animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            label="Total Omset (Lunas)"
            value={formatIDR(Number(summary.total_paid_sales))}
            sub={`+${formatIDR(Number(summary.total_unpaid_sales))} belum lunas`}
            icon={<ShoppingBag className="w-4 h-4" />}
            trend="up"
            accent="bg-emerald-100 text-emerald-700"
          />
          <KPICard
            label="Laba Kotor (Est.)"
            value={formatIDR(Number(summary.total_gross_profit))}
            sub={`Margin ${grossMargin}%`}
            icon={<TrendingUp className="w-4 h-4" />}
            accent="bg-blue-100 text-blue-700"
          />
          <KPICard
            label="Total HPP / COGS"
            value={formatIDR(Number(summary.total_cogs))}
            sub="Dari pesanan tidak dibatalkan"
            icon={<TrendingDown className="w-4 h-4" />}
            accent="bg-amber-100 text-amber-700"
          />
          <KPICard
            label="Rata-rata Nilai Order"
            value={formatIDR(Number(summary.average_order_value))}
            sub={`${summary.total_orders} pesanan total`}
            icon={<BarChart3 className="w-4 h-4" />}
            accent="bg-purple-100 text-purple-700"
          />
          <KPICard
            label="Total Item Terjual"
            value={String(summary.total_items_sold)}
            sub="Item dari pesanan tidak dibatalkan"
            icon={<Package className="w-4 h-4" />}
          />
          <KPICard
            label="Pesanan Lunas"
            value={String(summary.orders_by_payment.paid)}
            sub={`${summary.orders_by_payment.unpaid} belum lunas`}
            icon={<Calendar className="w-4 h-4" />}
            accent="bg-emerald-100 text-emerald-700"
          />
          <KPICard
            label="Online vs Offline"
            value={`${summary.orders_by_channel.online} / ${summary.orders_by_channel.offline}`}
            sub="Online · Offline"
            icon={<ChevronDown className="w-4 h-4" />}
            accent="bg-sky-100 text-sky-700"
          />
          <KPICard
            label="Pesanan Dibatalkan"
            value={String(summary.orders_by_status.cancelled)}
            sub={`${summary.orders_by_status.pending} pending · ${summary.orders_by_status.done} selesai`}
            icon={<ShoppingBag className="w-4 h-4" />}
            trend={summary.orders_by_status.cancelled > 0 ? "down" : "neutral"}
            accent="bg-red-100 text-red-600"
          />
        </div>
      ) : null}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Revenue vs Profit trend */}
        <div className="border border-border bg-card rounded-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">Tren Omset & Laba Kotor</p>
              <p className="text-xs text-muted-foreground">
                {period === "day" ? "Harian" : period === "month" ? "Bulanan" : "Tahunan"}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleExportBreakdown}>
              <Download className="w-3 h-3" /> CSV
            </Button>
          </div>
          {loading ? (
            <div className="h-56 bg-muted/30 animate-pulse rounded" />
          ) : chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              Tidak ada data untuk periode ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOmset" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLaba" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Omset" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorOmset)" />
                <Area type="monotone" dataKey="Laba Kotor" stroke="#10b981" strokeWidth={2} fill="url(#colorLaba)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order count per period */}
        <div className="border border-border bg-card rounded-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">Volume Pesanan</p>
              <p className="text-xs text-muted-foreground">Jumlah order per {period === "day" ? "hari" : period === "month" ? "bulan" : "tahun"}</p>
            </div>
          </div>
          {loading ? (
            <div className="h-56 bg-muted/30 animate-pulse rounded" />
          ) : chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              Tidak ada data untuk periode ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Order" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Periodic Breakdown Table ── */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium">Rincian Periodik</p>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleExportBreakdown}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted/30 animate-pulse rounded" />
            ))}
          </div>
        ) : breakdown.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada data untuk periode ini</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Periode</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Jumlah Order</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Item Terjual</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Omset</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">HPP</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Laba Kotor</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Margin</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row, i) => {
                  const margin = row.total_revenue > 0
                    ? ((row.total_profit / row.total_revenue) * 100).toFixed(1)
                    : "0.0";
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{row.period_bucket}</td>
                      <td className="px-4 py-3 text-right">{row.order_count}</td>
                      <td className="px-4 py-3 text-right">{row.items_sold}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatIDR(Number(row.total_revenue))}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatIDR(Number(row.total_cogs))}</td>
                      <td className={`px-4 py-3 text-right font-medium ${Number(row.total_profit) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {formatIDR(Number(row.total_profit))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          Number(margin) >= 20
                            ? "bg-emerald-100 text-emerald-700"
                            : Number(margin) >= 10
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-600"
                        }`}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-medium">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">Total</td>
                  <td className="px-4 py-3 text-right">{breakdown.reduce((s, r) => s + Number(r.order_count), 0)}</td>
                  <td className="px-4 py-3 text-right">{breakdown.reduce((s, r) => s + Number(r.items_sold), 0)}</td>
                  <td className="px-4 py-3 text-right">{formatIDR(breakdown.reduce((s, r) => s + Number(r.total_revenue), 0))}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatIDR(breakdown.reduce((s, r) => s + Number(r.total_cogs), 0))}</td>
                  <td className={`px-4 py-3 text-right ${breakdown.reduce((s, r) => s + Number(r.total_profit), 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatIDR(breakdown.reduce((s, r) => s + Number(r.total_profit), 0))}
                  </td>
                  <td className="px-4 py-3 text-right">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Top Selling Variants ── */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-medium">Varian Produk Terlaris</p>
            <span className="text-xs text-muted-foreground">(Top 10)</span>
          </div>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleExportTopVariants}>
            <Download className="w-3 h-3" /> CSV
          </Button>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted/30 animate-pulse rounded" />
            ))}
          </div>
        ) : topVariants.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Belum ada data penjualan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Produk</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Varian Size</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Qty Terjual</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Total Omset</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Total Laba</th>
                </tr>
              </thead>
              <tbody>
                {topVariants.map((v, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      {i === 0 && <span className="text-amber-500 font-bold">🥇</span>}
                      {i === 1 && <span className="text-slate-400 font-bold">🥈</span>}
                      {i === 2 && <span className="text-orange-400 font-bold">🥉</span>}
                      {i > 2 && <span className="text-muted-foreground">{i + 1}</span>}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{v.product_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-muted rounded text-[11px]">{v.size_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{v.quantity_sold}</td>
                    <td className="px-4 py-3 text-right">{formatIDR(Number(v.total_revenue))}</td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(v.total_profit) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {formatIDR(Number(v.total_profit))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Rincian Penjualan Item (Nama Item & Ukuran) ── */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Rincian Penjualan Item</p>
              <p className="text-xs text-muted-foreground">
                Daftar per transaksi item beserta Nama Item &amp; Ukuran Item ({filteredOrderItems.length} item)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick search input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Cari item / ukuran / nama..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-border text-xs rounded bg-background focus:outline-none focus:border-primary"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs shrink-0"
              onClick={handleExportOrderItems}
              disabled={filteredOrderItems.length === 0}
            >
              <Download className="w-3 h-3" /> CSV
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted/30 animate-pulse rounded" />
            ))}
          </div>
        ) : filteredOrderItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {itemSearch ? "Tidak ada item yang cocok dengan pencarian" : "Belum ada item terjual pada periode ini"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Nama Item</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Ukuran Item</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Pelanggan</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Status Bayar</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Harga Satuan</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Subtotal</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wider">Laba Est.</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrderItems.map((item, i) => {
                  const profit = item.subtotal - (item.unit_hpp * item.quantity);
                  const isPaid = item.payment_status === "paid";
                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";

                  return (
                    <tr key={item.id || i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3 font-semibold text-foreground max-w-[200px] truncate" title={item.product_name}>
                        {item.product_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded font-medium bg-primary/10 text-primary border border-primary/20 text-[11px] whitespace-nowrap">
                          {item.size_name || "Standar"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">
                        {item.customer_name || "-"}
                        <span className="text-[10px] ml-1 opacity-70">({item.channel})</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {isPaid ? "Lunas" : "Belum Lunas"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatIDR(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{formatIDR(item.subtotal)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {formatIDR(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-medium">
                  <td colSpan={5} className="px-4 py-3 text-xs uppercase tracking-wider">
                    Total ({filteredOrderItems.length} baris)
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {filteredOrderItems.reduce((s, r) => s + r.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    {formatIDR(filteredOrderItems.reduce((s, r) => s + r.subtotal, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    {formatIDR(
                      filteredOrderItems.reduce((s, r) => s + (r.subtotal - r.unit_hpp * r.quantity), 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
