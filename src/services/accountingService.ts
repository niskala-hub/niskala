/**
 * accountingService.ts
 * ──────────────────────────────────────────────────────────────
 * Service layer untuk semua operasi Kas & Accounting.
 *
 * Prinsip:
 * - Transaksi kas yang berasal dari order (auto-generated) TIDAK
 *   bisa diedit/dihapus oleh admin — hanya owner bisa delete
 * - Pembatalan order menghasilkan reversal (bukan hapus)
 * - Summary metrics diambil dari view v_accounting_summary
 * ──────────────────────────────────────────────────────────────
 */

import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type CashFlowType = "inflow" | "outflow";

export interface CashTransactionRow {
  id: string;
  transaction_date: string;
  type: CashFlowType;
  category: string;
  amount: number;
  description: string | null;
  reference_id: string | null;
  receipt_url: string | null;
  is_reversal: boolean;
  reversed_by: string | null;
  created_at: string;
}

export interface AccountingSummary {
  total_inflow: number;
  total_outflow: number;
  total_sales_inflow: number;
  total_reversals: number;
  net_cash: number;
  total_cogs_paid: number;
  gross_profit_estimate: number;
  gross_margin_percent: number;
}

export interface MonthlyCashFlow {
  month: string;
  month_label: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface ManualTransactionInput {
  type: CashFlowType;
  category: string;
  amount: number;
  transaction_date: string;
  description?: string;
  receipt_url?: string;
}

export type TransactionFilters = {
  type?: CashFlowType;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Exclude reversal entries from list (default: false = show all) */
  excludeReversals?: boolean;
  search?: string; // ilike on description
  page?: number;
  pageSize?: number;
};

// ─────────────────────────────────────────────
// ACCOUNTING SUMMARY (Dashboard KPIs)
// ─────────────────────────────────────────────

/**
 * Ambil ringkasan keuangan dari view v_accounting_summary.
 * Formula Laba Kotor: Total Inflow Penjualan - Total HPP (COGS)
 */
export async function fetchAccountingSummary(): Promise<AccountingSummary> {
  const { data, error } = await supabase
    .from("v_accounting_summary")
    .select("*")
    .single();

  if (error) throw error;
  return data as AccountingSummary;
}

/**
 * Ambil data arus kas bulanan untuk grafik tren.
 * Diambil dari view v_monthly_cash_flow.
 */
export async function fetchMonthlyCashFlow(
  months = 12
): Promise<MonthlyCashFlow[]> {
  const { data, error } = await supabase
    .from("v_monthly_cash_flow")
    .select("*")
    .order("month", { ascending: false })
    .limit(months);

  if (error) throw error;
  // Kembalikan urutan ascending untuk chart
  return ((data ?? []) as MonthlyCashFlow[]).reverse();
}

// ─────────────────────────────────────────────
// READ TRANSACTIONS
// ─────────────────────────────────────────────

/**
 * Ambil daftar transaksi kas dengan filter.
 */
export async function fetchTransactions(filters: TransactionFilters = {}) {
  const {
    type,
    category,
    dateFrom,
    dateTo,
    excludeReversals = false,
    search,
    page = 1,
    pageSize = 50,
  } = filters;

  let query = supabase
    .from("cash_transactions")
    .select("*", { count: "exact" })
    .order("transaction_date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category", category);
  if (dateFrom) query = query.gte("transaction_date", dateFrom);
  if (dateTo) query = query.lte("transaction_date", dateTo);
  if (excludeReversals) query = query.eq("is_reversal", false);
  if (search) query = query.ilike("description", `%${search}%`);

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    transactions: (data ?? []) as CashTransactionRow[],
    count: count ?? 0,
  };
}

// ─────────────────────────────────────────────
// CREATE TRANSACTION (manual entry)
// ─────────────────────────────────────────────

/**
 * Tambah transaksi kas manual (bukan dari order).
 * Contoh: Capital Injection, Gaji, Belanja Kain, dsb.
 */
export async function addManualTransaction(
  input: ManualTransactionInput
): Promise<CashTransactionRow> {
  if (input.amount <= 0) {
    throw new Error("Jumlah transaksi harus lebih dari 0");
  }

  const { data, error } = await supabase
    .from("cash_transactions")
    .insert({
      type: input.type,
      category: input.category,
      amount: input.amount,
      transaction_date: input.transaction_date,
      description: input.description ?? null,
      receipt_url: input.receipt_url ?? null,
      is_reversal: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CashTransactionRow;
}

// ─────────────────────────────────────────────
// UPDATE TRANSACTION (owner only via RLS)
// ─────────────────────────────────────────────

/**
 * Edit transaksi kas manual.
 * RLS membatasi ini hanya untuk owner/co_owner.
 * Transaksi auto-generated (reference_id != null) sebaiknya
 * TIDAK diedit — cancel order saja untuk reversal.
 */
export async function updateTransaction(
  id: string,
  patch: Partial<ManualTransactionInput>
): Promise<CashTransactionRow> {
  const { data, error } = await supabase
    .from("cash_transactions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as CashTransactionRow;
}

// ─────────────────────────────────────────────
// DELETE TRANSACTION (owner only via RLS)
// ─────────────────────────────────────────────

/**
 * Hard-delete transaksi kas.
 * HANYA berhasil jika user adalah owner (enforced by RLS).
 * Untuk pembatalan order, gunakan cancelOrder() di orderService.
 */
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from("cash_transactions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─────────────────────────────────────────────
// RECEIPT UPLOAD (Bukti transaksi)
// ─────────────────────────────────────────────

/**
 * Upload file bukti transaksi ke Supabase Storage.
 * Returns public URL untuk disimpan di receipt_url.
 */
export async function uploadReceipt(
  file: File,
  transactionId: string
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `receipts/${transactionId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  return data.publicUrl;
}

// ─────────────────────────────────────────────
// CATEGORY CONSTANTS (for UI dropdowns)
// ─────────────────────────────────────────────

export const INFLOW_CATEGORIES = [
  "Penjualan",
  "Capital Injection",
  "Pelunasan Piutang",
  "Lainnya",
] as const;

export const OUTFLOW_CATEGORIES = [
  "Belanja Kain",
  "Biaya Jahit",
  "Packaging",
  "Operasional",
  "Gaji",
  "Marketing",
  "Lainnya",
] as const;

export type InflowCategory = (typeof INFLOW_CATEGORIES)[number];
export type OutflowCategory = (typeof OUTFLOW_CATEGORIES)[number];
