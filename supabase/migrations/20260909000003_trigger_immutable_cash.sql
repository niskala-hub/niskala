-- =============================================================
-- Migration: Immutable Cash Trigger (Reversal Pattern)
-- Replaces hard-delete of cash_transactions with proper
-- reversal/credit-note entries for full audit trail.
-- =============================================================

-- ─────────────────────────────────────────────
-- Drop old trigger yang masih memakai hard-delete
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_sync_cash        ON public.orders;
DROP TRIGGER IF EXISTS trg_orders_sync_cash_delete  ON public.orders;

-- ─────────────────────────────────────────────
-- New immutable cash sync function
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_order_cash_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label          TEXT;
  v_existing_tx_id UUID;
  v_existing_amount NUMERIC;
BEGIN
  -- Build a human-readable label for the transaction
  v_label := 'Pesanan ' || COALESCE(NULLIF(NEW.customer_name, ''), 'tanpa nama')
             || ' (' || COALESCE(NEW.channel, 'offline') || ')';

  -- ── CASE 1: ORDER BECOMES PAID ───────────────────────────
  -- Insert a new inflow entry if one doesn't already exist.
  -- If it exists (e.g. amount/date changed), UPDATE it.
  IF NEW.payment_status = 'paid' AND NEW.status <> 'cancelled' THEN

    SELECT id, amount INTO v_existing_tx_id, v_existing_amount
    FROM public.cash_transactions
    WHERE reference_id = NEW.id
      AND category = 'Penjualan'
      AND is_reversal = FALSE
    LIMIT 1;

    IF v_existing_tx_id IS NOT NULL THEN
      -- Update existing inflow if amount or date changed
      UPDATE public.cash_transactions
      SET
        amount           = NEW.total_price,
        description      = v_label,
        transaction_date = COALESCE(NEW.paid_at, now())
      WHERE id = v_existing_tx_id;
    ELSE
      -- Insert fresh inflow transaction
      INSERT INTO public.cash_transactions
        (transaction_date, type, category, amount, description, reference_id, is_reversal)
      VALUES
        (COALESCE(NEW.paid_at, now()), 'inflow', 'Penjualan', NEW.total_price, v_label, NEW.id, FALSE);
    END IF;

  -- ── CASE 2: ORDER CANCELLED (was previously paid) ────────
  -- Do NOT delete the original inflow.
  -- Instead, insert a reversal OUTFLOW as credit note.
  ELSIF NEW.status = 'cancelled'
        AND OLD.status <> 'cancelled'
        AND OLD.payment_status = 'paid'
  THEN

    -- Find the original inflow transaction
    SELECT id, amount INTO v_existing_tx_id, v_existing_amount
    FROM public.cash_transactions
    WHERE reference_id = NEW.id
      AND category = 'Penjualan'
      AND is_reversal = FALSE
      AND type = 'inflow'
    LIMIT 1;

    IF v_existing_tx_id IS NOT NULL THEN
      -- Check if a reversal for this order already exists (idempotent guard)
      IF NOT EXISTS (
        SELECT 1 FROM public.cash_transactions
        WHERE reference_id = NEW.id
          AND is_reversal = TRUE
          AND category = 'Pembatalan Penjualan'
      ) THEN
        -- Insert reversal (credit note / outflow)
        INSERT INTO public.cash_transactions
          (transaction_date, type, category, amount, description, reference_id, is_reversal, reversed_by)
        VALUES
          (now(),
           'outflow',
           'Pembatalan Penjualan',
           v_existing_amount,
           'REVERSAL — ' || v_label,
           NEW.id,
           TRUE,
           v_existing_tx_id);
      END IF;
    END IF;

  -- ── CASE 3: ORDER UNPAID (payment reverted, e.g. admin error) ──
  -- Saat payment_status kembali ke 'unpaid' setelah sempat 'paid'.
  -- Insert reversal jika belum ada.
  ELSIF NEW.payment_status <> 'paid'
        AND OLD.payment_status = 'paid'
        AND NEW.status <> 'cancelled'
  THEN

    SELECT id, amount INTO v_existing_tx_id, v_existing_amount
    FROM public.cash_transactions
    WHERE reference_id = NEW.id
      AND category = 'Penjualan'
      AND is_reversal = FALSE
      AND type = 'inflow'
    LIMIT 1;

    IF v_existing_tx_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cash_transactions
        WHERE reference_id = NEW.id
          AND is_reversal = TRUE
          AND category = 'Koreksi Penjualan'
      ) THEN
        INSERT INTO public.cash_transactions
          (transaction_date, type, category, amount, description, reference_id, is_reversal, reversed_by)
        VALUES
          (now(),
           'outflow',
           'Koreksi Penjualan',
           v_existing_amount,
           'KOREKSI — ' || v_label || ' (dibatalkan lunas)',
           NEW.id,
           TRUE,
           v_existing_tx_id);
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_order_cash_immutable() IS
  'Trigger: Sinkronisasi kas order secara immutable. Pembatalan menghasilkan reversal outflow, BUKAN hard-delete.';

-- ─────────────────────────────────────────────
-- Bind new trigger (AFTER so stock trigger runs first)
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_sync_cash_v2 ON public.orders;

CREATE TRIGGER trg_orders_sync_cash_v2
AFTER UPDATE OF payment_status, status, total_price, paid_at, customer_name, channel
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_cash_immutable();

-- ─────────────────────────────────────────────
-- Also fire on INSERT (new order paid immediately)
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_sync_cash_insert ON public.orders;

CREATE TRIGGER trg_orders_sync_cash_insert
AFTER INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.payment_status = 'paid')
EXECUTE FUNCTION public.sync_order_cash_immutable();
