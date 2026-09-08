import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Package,
  Tags,
  ArrowRight,
  RefreshCw,
  Globe,
  Store,
  Clock,
  Layers,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { formatIDR } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  fetchDashboardSummary,
  defaultDashboardSummary,
  type DashboardSummary,
} from "@/services/dashboardService";
import { resolveProductImage } from "@/lib/productImage";

const CHANNEL_COLORS = {
  online: "#2563eb", // Royal Blue
  offline: "#b45309", // Warm Amber / Ochre
};

const ORDER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Baru", className: "border-amber-500/60 text-amber-700 bg-amber-50/50" },
  processing: { label: "Diproses", className: "border-blue-500/60 text-blue-700 bg-blue-50/50" },
  shipped: { label: "Dikirim", className: "border-purple-500/60 text-purple-700 bg-purple-50/50" },
  done: { label: "Selesai", className: "border-emerald-500/60 text-emerald-700 bg-emerald-50/50" },
  cancelled: { label: "Batal", className: "border-red-500/60 text-red-700 bg-red-50/50" },
};

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function formatShortDateTime(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardSummary>(defaultDashboardSummary);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"top" | "low_stock">("top");

  const loadData = async () => {
    setLoading(true);
    try {
      const summary = await fetchDashboardSummary();
      setData(summary);
    } catch (err: any) {
      toast({
        title: "Gagal memuat ringkasan dashboard",
        description: err.message || "Terjadi kesalahan sistem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { metrics, channel_stats, sales_trend, recent_orders, top_products, low_stock_products } = data;

  // Total omset 14 hari di grafik
  const totalTrendRevenue = useMemo(
    () => sales_trend.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0),
    [sales_trend]
  );
  const avgDailyRevenue = useMemo(
    () => (sales_trend.length > 0 ? Math.round(totalTrendRevenue / sales_trend.length) : 0),
    [totalTrendRevenue, sales_trend]
  );

  // Data Pie Chart Saluran Penjualan
  const pieData = useMemo(() => {
    const online = channel_stats.online.revenue || 0;
    const offline = channel_stats.offline.revenue || 0;
    const total = online + offline;
    return [
      {
        name: "Online",
        value: online,
        count: channel_stats.online.order_count,
        percent: total > 0 ? Math.round((online / total) * 100) : 0,
        color: CHANNEL_COLORS.online,
      },
      {
        name: "Offline",
        value: offline,
        count: channel_stats.offline.order_count,
        percent: total > 0 ? Math.round((offline / total) * 100) : 0,
        color: CHANNEL_COLORS.offline,
      },
    ];
  }, [channel_stats]);

  const currentMonthName = new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-8 max-w-[1600px] mx-auto">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-light tracking-tight">Dashboard Operasional</h1>
            <span className="text-[11px] font-mono uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
              NISKALA
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Ringkasan performa penjualan, stok produk, dan status pesanan · {currentMonthName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Segarkan
          </Button>
          <Button asChild size="sm" className="gap-2 text-xs">
            <Link to="/admin/orders">
              <ShoppingBag className="w-3.5 h-3.5" />
              Kelola Pesanan
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Row 1: Top Metric Cards (4 Kolom) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        {/* Metric 1: Omset Bulan Ini */}
        <div className="border border-border bg-card p-5 relative overflow-hidden group hover:border-foreground/40 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Omset Bulan Ini
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl md:text-3xl font-light tracking-tight text-foreground">
              {formatIDR(metrics.monthly_omset)}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {metrics.omset_growth !== 0 ? (
                <span
                  className={cn(
                    "font-medium",
                    metrics.omset_growth > 0 ? "text-emerald-700" : "text-red-600"
                  )}
                >
                  {metrics.omset_growth > 0 ? `+${metrics.omset_growth}%` : `${metrics.omset_growth}%`}
                </span>
              ) : (
                <span>Kas masuk penjualan</span>
              )}
              <span>vs bulan lalu</span>
            </div>
          </div>
          <Link
            to="/admin/accounting"
            className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Buku kas real-time</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Metric 2: Order Baru / Diproses */}
        <div className="border border-border bg-card p-5 relative overflow-hidden group hover:border-foreground/40 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Order Butuh Proses
            </span>
            <div className="p-2 bg-blue-50 text-blue-700 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-light tracking-tight text-foreground">
                {metrics.active_orders}
              </p>
              <span className="text-xs text-muted-foreground">pesanan aktif</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {metrics.pending_orders} Baru
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {metrics.processing_orders} Diproses
              </span>
            </div>
          </div>
          <Link
            to="/admin/orders"
            className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Buka daftar order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Metric 3: Stok Menipis */}
        <div className="border border-border bg-card p-5 relative overflow-hidden group hover:border-foreground/40 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Peringatan Stok Rendah
            </span>
            <div
              className={cn(
                "p-2 border",
                metrics.low_stock_count > 0
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/40"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <p
                className={cn(
                  "text-2xl md:text-3xl font-light tracking-tight",
                  metrics.low_stock_count > 0 ? "text-amber-700" : "text-foreground"
                )}
              >
                {metrics.low_stock_count}
              </p>
              <span className="text-xs text-muted-foreground">produk ≤ 5 pcs</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.out_of_stock_count > 0 ? (
                <span className="text-red-600 font-medium">
                  {metrics.out_of_stock_count} produk habis total (0 pcs)
                </span>
              ) : (
                "Tidak ada produk yang habis total"
              )}
            </p>
          </div>
          <Link
            to="/admin/products"
            className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Cek stok produk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Metric 4: Total Katalog */}
        <div className="border border-border bg-card p-5 relative overflow-hidden group hover:border-foreground/40 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Total Katalog Produk
            </span>
            <div className="p-2 bg-muted text-foreground border border-border">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-light tracking-tight text-foreground">
                {metrics.products_count}
              </p>
              <span className="text-xs text-muted-foreground">produk aktif</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Tags className="w-3 h-3 text-muted-foreground" />
                {metrics.categories_count} Kategori
              </span>
              <span>terdaftar di katalog</span>
            </div>
          </div>
          <Link
            to="/admin/products"
            className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Kelola master produk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Row 2: Charts & Analytics (70% vs 30%) ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Component (70%): Tren Penjualan Harian */}
        <div className="lg:col-span-8 border border-border bg-card p-5 md:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-medium tracking-tight">Tren Penjualan Harian</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pemasukan kas penjualan selama 14 hari terakhir
              </p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Total 14 Hari
                </p>
                <p className="text-sm md:text-base font-medium text-foreground">
                  {formatIDR(totalTrendRevenue)}
                </p>
              </div>
              <div className="hidden sm:block border-l border-border pl-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Rata-rata/Hari
                </p>
                <p className="text-sm md:text-base font-medium text-foreground">
                  {formatIDR(avgDailyRevenue)}
                </p>
              </div>
            </div>
          </div>

          {/* Chart area */}
          <div className="w-full h-[280px] md:h-[300px]">
            {sales_trend.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                Belum ada data transaksi dalam 14 hari terakhir.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sales_trend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b45309" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#b45309" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(0)}k`
                        : String(val)
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as (typeof sales_trend)[0];
                        return (
                          <div className="bg-background border border-border p-3 shadow-sm text-xs space-y-1">
                            <p className="font-medium text-foreground">
                              {item.label} ({item.day_name})
                            </p>
                            <p className="text-emerald-700 font-semibold">
                              {formatIDR(Number(item.revenue))}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {item.orders} transaksi tercatat
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#b45309"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Component (30%): Perbandingan Saluran Penjualan */}
        <div className="lg:col-span-4 border border-border bg-card p-5 md:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-medium tracking-tight">Saluran Penjualan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Proporsi omset Online vs Offline bulan ini
            </p>
          </div>

          <div className="my-4 flex items-center justify-center relative">
            <div className="w-full h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const p = payload[0].payload;
                        return (
                          <div className="bg-background border border-border p-2 text-xs shadow-sm">
                            <p className="font-medium">{p.name}</p>
                            <p className="text-foreground">{formatIDR(Number(p.value))}</p>
                            <p className="text-muted-foreground text-[11px]">
                              {p.count} order ({p.percent}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Center label */}
            <div className="absolute text-center pointer-events-none">
              <span className="text-xs text-muted-foreground">Total</span>
              <p className="text-sm font-semibold">
                {channel_stats.online.order_count + channel_stats.offline.order_count}
              </p>
              <span className="text-[10px] text-muted-foreground">Order</span>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div className="p-2.5 bg-muted/40 border border-border/70 rounded-none">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Online</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatIDR(channel_stats.online.revenue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {channel_stats.online.order_count} pesanan
              </p>
            </div>

            <div className="p-2.5 bg-muted/40 border border-border/70 rounded-none">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Store className="w-3.5 h-3.5 text-amber-700" />
                <span>Offline / Store</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatIDR(channel_stats.offline.revenue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {channel_stats.offline.order_count} pesanan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Actionable Tables & Widgets (60% vs 40%) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left (60%): Pesanan Terbaru (Recent Orders) */}
        <div className="lg:col-span-7 border border-border bg-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-medium tracking-tight">Pesanan Terbaru</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                5 transaksi terbaru yang masuk ke sistem
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Link to="/admin/orders">
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          {recent_orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border">
              Belum ada pesanan yang tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2.5 font-medium">Pembeli</th>
                    <th className="pb-2.5 font-medium">Saluran</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium">Bayar</th>
                    <th className="pb-2.5 font-medium text-right">Total</th>
                    <th className="pb-2.5 font-medium text-right w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent_orders.map((o) => {
                    const statusMeta = ORDER_STATUS_LABELS[o.status] ?? {
                      label: o.status,
                      className: "border-border text-foreground",
                    };
                    return (
                      <tr key={o.id} className="group hover:bg-muted/40 transition-colors">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-foreground truncate max-w-[140px]">
                            {o.customer_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatShortDateTime(o.created_at)}
                          </p>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            {o.channel === "online" ? (
                              <>
                                <Globe className="w-3 h-3 text-blue-600" /> Online
                              </>
                            ) : (
                              <>
                                <Store className="w-3 h-3 text-amber-700" /> Offline
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge
                            variant="outline"
                            className={cn("rounded-none text-[10px] px-1.5 py-0.5", statusMeta.className)}
                          >
                            {statusMeta.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-none text-[10px] px-1.5 py-0.5",
                              o.payment_status === "paid"
                                ? "border-emerald-600/70 text-emerald-700 bg-emerald-50/50"
                                : "border-amber-600/70 text-amber-700 bg-amber-50/50"
                            )}
                          >
                            {o.payment_status === "paid" ? "Lunas" : "Belum"}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-medium text-foreground whitespace-nowrap">
                          {formatIDR(Number(o.total_price))}
                        </td>
                        <td className="py-3 text-right">
                          <Button asChild size="icon" variant="ghost" className="w-7 h-7">
                            <Link to="/admin/orders" title="Lihat detail pesanan">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right (40%): Tab Produk Terlaris & Peringatan Stok Rendah */}
        <div className="lg:col-span-5 border border-border bg-card p-5 md:p-6">
          {/* Tabs Selector */}
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("top")}
                className={cn(
                  "text-xs font-medium pb-1.5 border-b-2 transition-colors flex items-center gap-1.5",
                  activeTab === "top"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Flame className="w-3.5 h-3.5 text-orange-600" />
                Produk Terlaris
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("low_stock")}
                className={cn(
                  "text-xs font-medium pb-1.5 border-b-2 transition-colors flex items-center gap-1.5",
                  activeTab === "low_stock"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Stok Kritis ({low_stock_products.length})
              </button>
            </div>
            <Link
              to="/admin/products"
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              Katalog <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Tab 1: Top Selling */}
          {activeTab === "top" && (
            <div className="space-y-3">
              {top_products.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  Belum ada data penjualan produk.
                </p>
              ) : (
                top_products.map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-2 hover:bg-muted/40 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center text-xs font-medium text-muted-foreground shrink-0">
                        #{index + 1}
                      </span>
                      <img
                        src={resolveProductImage(p.image_url)}
                        alt={p.name}
                        className="w-10 h-10 object-cover border border-border shrink-0 bg-muted"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatIDR(Number(p.price))}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="rounded-none text-[10px] font-mono">
                        {p.total_sold} terjual
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatIDR(Number(p.total_revenue))}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Low Stock Alert */}
          {activeTab === "low_stock" && (
            <div className="space-y-3">
              {low_stock_products.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="font-medium text-foreground">Semua stok aman!</p>
                  <p className="text-[11px]">Tidak ada produk dengan stok di bawah 5 pcs.</p>
                </div>
              ) : (
                low_stock_products.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 border border-border bg-background space-y-2 hover:border-foreground/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.category_name || "Tanpa Kategori"} · {formatIDR(Number(p.price))}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-none text-[10px] shrink-0",
                          p.stock === 0
                            ? "border-red-600 text-red-700 bg-red-50"
                            : "border-amber-600 text-amber-700 bg-amber-50"
                        )}
                      >
                        {p.stock === 0 ? "HABIS TOTAL" : `Sisa ${p.stock} pcs`}
                      </Badge>
                    </div>

                    {/* Stock level bar (5 is warning limit) */}
                    <div className="w-full bg-muted h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          p.stock === 0 ? "bg-red-600" : "bg-amber-500"
                        )}
                        style={{ width: `${Math.min(100, (p.stock / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
