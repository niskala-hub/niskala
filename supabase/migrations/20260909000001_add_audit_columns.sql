-- =============================================================
-- Migration: Add Audit Trail Columns
-- Adds columns needed for immutable accounting & stock tracking
-- =============================================================

-- ─────────────────────────────────────────────
-- orders: Audit trail & stock deduction flag
-- ─────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  -- Tracks whether stock has been deducted for this order.
  -- Prevents double-deduction if trigger fires multiple times.
  ADD COLUMN IF NOT EXISTS stock_deducted     BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.orders.cancelled_at         IS 'Timestamp saat order dibatalkan (soft delete / audit trail)';
COMMENT ON COLUMN public.orders.cancellation_reason  IS 'Alasan pembatalan order';
COMMENT ON COLUMN public.orders.stock_deducted       IS 'Flag: TRUE jika stok produk sudah dikurangi untuk order ini';

-- ─────────────────────────────────────────────
-- cash_transactions: Reversal / immutability support
-- ─────────────────────────────────────────────
ALTER TABLE public.cash_transactions
  ADD COLUMN IF NOT EXISTS is_reversal  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversed_by  UUID REFERENCES public.cash_transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.cash_transactions.is_reversal IS 'TRUE jika transaksi ini adalah pembalik (credit note) dari transaksi sebelumnya';
COMMENT ON COLUMN public.cash_transactions.reversed_by IS 'FK ke cash_transactions.id — menunjuk ke transaksi asal yang dibalik';

-- Index untuk performa lookup reversal
CREATE INDEX IF NOT EXISTS idx_cash_transactions_reference  ON public.cash_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_is_reversal ON public.cash_transactions(is_reversal);
CREATE INDEX IF NOT EXISTS idx_orders_stock_deducted         ON public.orders(stock_deducted);
CREATE INDEX IF NOT EXISTS idx_orders_status                 ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status         ON public.orders(payment_status);
