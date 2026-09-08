/**
 * dashboardService.ts
 * ──────────────────────────────────────────────────────────────
 * Service layer untuk Dashboard Utama Admin NISKALA.
 * Mengambil data agregasi terpusat via Supabase RPC function:
 * `get_admin_dashboard_summary()` dalam 1 round-trip cepat.
 * ──────────────────────────────────────────────────────────────
 */

import { supabase } from "@/integrations/supabase/client";

export interface DashboardMetrics {
  monthly_omset: number;
  last_month_omset: number;
  omset_growth: number;
  active_orders: number;
  pending_orders: number;
  processing_orders: number;
  low_stock_count: number;
  out_of_stock_count: number;
  products_count: number;
  categories_count: number;
}

export interface ChannelStatDetail {
  order_count: number;
  revenue: number;
}

export interface ChannelStats {
  online: ChannelStatDetail;
  offline: ChannelStatDetail;
}

export interface SalesTrendPoint {
  date: string;
  label: string;
  day_name: string;
  revenue: number;
  orders: number;
}

export interface RecentOrder {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  channel: "online" | "offline";
  status: "pending" | "processing" | "shipped" | "done" | "cancelled";
  payment_status: "paid" | "unpaid";
  total_price: number;
  created_at: string;
  items_count: number;
}

export interface TopProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  total_sold: number;
  total_revenue: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  category_name: string | null;
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  channel_stats: ChannelStats;
  sales_trend: SalesTrendPoint[];
  recent_orders: RecentOrder[];
  top_products: TopProduct[];
  low_stock_products: LowStockProduct[];
  generated_at: string;
}

export const defaultDashboardSummary: DashboardSummary = {
  metrics: {
    monthly_omset: 0,
    last_month_omset: 0,
    omset_growth: 0,
    active_orders: 0,
    pending_orders: 0,
    processing_orders: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    products_count: 0,
    categories_count: 0,
  },
  channel_stats: {
    online: { order_count: 0, revenue: 0 },
    offline: { order_count: 0, revenue: 0 },
  },
  sales_trend: [],
  recent_orders: [],
  top_products: [],
  low_stock_products: [],
  generated_at: new Date().toISOString(),
};

/**
 * Mengambil ringkasan data dashboard admin via RPC PostgreSQL.
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc("get_admin_dashboard_summary");

  if (error) {
    console.error("Gagal memanggil RPC get_admin_dashboard_summary:", error);
    throw error;
  }

  return (data as unknown as DashboardSummary) ?? defaultDashboardSummary;
}
