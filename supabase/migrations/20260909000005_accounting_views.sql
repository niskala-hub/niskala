-- =============================================================
-- Migration: Accounting Dashboard View
-- v_accounting_summary — real-time aggregated financial metrics
-- Gross Profit = Total Inflow (Penjualan) - Total COGS (HPP dari order lunas)
-- =============================================================

-- ─────────────────────────────────────────────
-- Drop if exists (idempotent)
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_accounting_summary;

-- ─────────────────────────────────────────────
-- Main accounting summary view
-- ─────────────────────────────────────────────
CREATE VIEW public.v_accounting_summary AS
WITH tx_agg AS (
  SELECT
    -- Total kas masuk (semua kategori, bukan reversal)
    COALESCE(SUM(CASE WHEN type = 'inflow'  AND is_reversal = FALSE THEN amount ELSE 0 END), 0) AS total_inflow,

    -- Total kas keluar (termasuk reversal dari pembatalan)
    COALESCE(SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END), 0) AS total_outflow,

    -- Total inflow khusus dari Penjualan (bukan reversal)
    COALESCE(SUM(CASE WHEN type = 'inflow' AND category = 'Penjualan' AND is_reversal = FALSE THEN amount ELSE 0 END), 0) AS total_sales_inflow,

    -- Jumlah reversal (pembatalan) yang terjadi
    COALESCE(SUM(CASE WHEN is_reversal = TRUE THEN amount ELSE 0 END), 0) AS total_reversals

  FROM public.cash_transactions
),
cogs_agg AS (
  -- Total HPP dari order yang sudah lunas dan tidak dibatalkan
  -- (snapshot HPP dari order_items, bukan harga produk saat ini)
  SELECT
    COALESCE(SUM(oi.quantity * oi.unit_hpp), 0) AS total_cogs_paid
  FROM public.order_items oi
  INNER JOIN public.orders o ON o.id = oi.order_id
  WHERE o.payment_status = 'paid'
    AND o.status <> 'cancelled'
)
SELECT
  tx.total_inflow,
  tx.total_outflow,
  tx.total_sales_inflow,
  tx.total_reversals,

  -- Saldo kas bersih: semua inflow dikurangi semua outflow
  (tx.total_inflow - tx.total_outflow)                    AS net_cash,

  -- Total HPP dari penjualan yang sudah lunas
  cogs.total_cogs_paid,

  -- Estimasi Laba Kotor = Inflow Penjualan - HPP Terjual
  -- Formula: hanya memperhitungkan revenue penjualan, bukan capital injection dll
  (tx.total_sales_inflow - cogs.total_cogs_paid)          AS gross_profit_estimate,

  -- Margin Laba Kotor (%) — null-safe
  CASE
    WHEN tx.total_sales_inflow > 0
    THEN ROUND(((tx.total_sales_inflow - cogs.total_cogs_paid) / tx.total_sales_inflow) * 100, 2)
    ELSE 0
  END                                                     AS gross_margin_percent

FROM tx_agg tx, cogs_agg cogs;

-- ─────────────────────────────────────────────
-- Grant read access to authenticated users
-- ─────────────────────────────────────────────
GRANT SELECT ON public.v_accounting_summary TO authenticated;

-- ─────────────────────────────────────────────
-- Monthly breakdown view (for charts)
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_monthly_cash_flow;

CREATE VIEW public.v_monthly_cash_flow AS
SELECT
  DATE_TRUNC('month', transaction_date)::DATE                                 AS month,
  TO_CHAR(transaction_date, 'YYYY-MM')                                        AS month_label,
  COALESCE(SUM(CASE WHEN type = 'inflow'  AND is_reversal = FALSE THEN amount ELSE 0 END), 0) AS inflow,
  COALESCE(SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END), 0)         AS outflow,
  COALESCE(SUM(CASE WHEN type = 'inflow'  AND is_reversal = FALSE THEN amount
                    WHEN type = 'outflow' THEN -amount
                    ELSE 0 END), 0)                                           AS net
FROM public.cash_transactions
GROUP BY DATE_TRUNC('month', transaction_date), TO_CHAR(transaction_date, 'YYYY-MM')
ORDER BY month ASC;

GRANT SELECT ON public.v_monthly_cash_flow TO authenticated;

-- ─────────────────────────────────────────────
-- Per-order profit view (for order detail panel)
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_order_profitability;

CREATE VIEW public.v_order_profitability AS
SELECT
  o.id                                    AS order_id,
  o.customer_name,
  o.channel,
  o.status,
  o.payment_status,
  o.created_at,
  o.paid_at,
  o.total_price,
  o.total_hpp,
  -- Gross profit per order = Revenue - HPP
  (o.total_price - o.total_hpp)           AS gross_profit,
  -- Margin (%)
  CASE
    WHEN o.total_price > 0
    THEN ROUND(((o.total_price - o.total_hpp) / o.total_price) * 100, 2)
    ELSE 0
  END                                     AS gross_margin_percent
FROM public.orders o
WHERE o.status <> 'cancelled';

GRANT SELECT ON public.v_order_profitability TO authenticated;
