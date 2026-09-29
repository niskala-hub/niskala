/**
 * reportService.ts
 * ──────────────────────────────────────────────────────────────
 * Service layer untuk fitur Laporan Order (Order Reports).
 * Mendukung agregasi harian, bulanan, tahunan, metrik KPI,
 * ranking varian terlaris, dan ekspor data (CSV / Excel).
 * ──────────────────────────────────────────────────────────────
 */

import { supabase } from "@/integrations/supabase/client";

export type PeriodAggregation = "day" | "month" | "year";

export interface ReportSummary {
  total_orders: number;
  total_gross_sales: number;
  total_paid_sales: number;
  total_unpaid_sales: number;
  total_cogs: number;
  total_gross_profit: number;
  average_order_value: number;
  total_items_sold: number;
  orders_by_status: {
    pending: number;
    processing: number;
    shipped: number;
    done: number;
    cancelled: number;
  };
  orders_by_payment: {
    paid: number;
    unpaid: number;
  };
  orders_by_channel: {
    online: number;
    offline: number;
  };
}

export interface ReportPeriodicBucket {
  period_bucket: string;
  order_count: number;
  total_revenue: number;
  total_cogs: number;
  total_profit: number;
  items_sold: number;
}

export interface TopSellingVariant {
  product_id: string;
  product_name: string;
  size_name: string;
  quantity_sold: number;
  total_revenue: number;
  total_profit: number;
}

export interface ReportFilterParams {
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
  channel?: "all" | "online" | "offline";
  paymentStatus?: "all" | "paid" | "unpaid";
}

/**
 * Mengambil ringkasan metrik laporan (KPI card aggregations).
 */
export async function fetchOrderReportSummary(
  filters: ReportFilterParams = {}
): Promise<ReportSummary> {
  const { data, error } = await supabase.rpc("get_order_report_summary", {
    p_start_date: filters.startDate || undefined,
    p_end_date: filters.endDate || undefined,
    p_channel: filters.channel || "all",
    p_payment_status: filters.paymentStatus || "all",
  });

  if (error) throw error;
  return data as unknown as ReportSummary;
}

/**
 * Mengambil breakdown laporan periodik (harian / bulanan / tahunan).
 */
export async function fetchOrderReportBreakdown(
  params: ReportFilterParams & { period: PeriodAggregation }
): Promise<ReportPeriodicBucket[]> {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultEnd = now.toISOString();

  const { data, error } = await supabase.rpc("get_order_report_breakdown", {
    p_start_date: params.startDate || defaultStart,
    p_end_date: params.endDate || defaultEnd,
    p_period: params.period || "day",
    p_channel: params.channel || "all",
    p_payment_status: params.paymentStatus || "all",
  });

  if (error) throw error;
  return (data ?? []) as unknown as ReportPeriodicBucket[];
}

/**
 * Mengambil varian produk & size yang paling laris.
 */
export async function fetchTopSellingVariants(
  filters: { startDate?: string; endDate?: string; limit?: number } = {}
): Promise<TopSellingVariant[]> {
  const { data, error } = await supabase.rpc("get_top_selling_variants", {
    p_start_date: filters.startDate || undefined,
    p_end_date: filters.endDate || undefined,
    p_limit: filters.limit || 10,
  });

  if (error) throw error;
  return (data ?? []) as unknown as TopSellingVariant[];
}

export interface OrderItemReportRow {
  id: string;
  order_id: string;
  created_at: string;
  product_id: string | null;
  product_name: string;
  size_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  unit_hpp: number;
  customer_name?: string | null;
  channel?: string;
  payment_status?: string;
  status?: string;
}

/**
 * Mengambil rincian per item pesanan (dengan Nama Item & Ukuran Item)
 */
export async function fetchOrderItemsReport(
  filters: ReportFilterParams = {}
): Promise<OrderItemReportRow[]> {
  let query = supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      product_id,
      product_name,
      size_name,
      quantity,
      unit_price,
      unit_hpp,
      created_at,
      orders!order_items_order_id_fkey (
        id,
        customer_name,
        channel,
        payment_status,
        status,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  let items = (data || []).map((item: any) => {
    const ord = item.orders;
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    return {
      id: item.id,
      order_id: item.order_id,
      created_at: item.created_at || ord?.created_at,
      product_id: item.product_id,
      product_name: item.product_name || "Produk",
      size_name: item.size_name || "Standar",
      quantity: qty,
      unit_price: price,
      subtotal: qty * price,
      unit_hpp: Number(item.unit_hpp) || 0,
      customer_name: ord?.customer_name || "Pelanggan",
      channel: ord?.channel || "online",
      payment_status: ord?.payment_status || "paid",
      status: ord?.status || "done",
    };
  });

  // Client filter for channel & paymentStatus if needed
  if (filters.channel && filters.channel !== "all") {
    items = items.filter((it) => it.channel === filters.channel);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    items = items.filter((it) => it.payment_status === filters.paymentStatus);
  }

  return items;
}

/**
 * Helper untuk mengunduh data dalam bentuk CSV.
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? "").replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
