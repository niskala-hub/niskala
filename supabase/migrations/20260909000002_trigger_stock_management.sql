-- =============================================================
-- Migration: Stock Management Trigger
-- Automatically deducts/restores products.stock based on
-- order payment_status & status changes.
-- =============================================================

-- ─────────────────────────────────────────────
-- Core trigger function: manage stock
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.manage_order_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_current_stock INTEGER;
BEGIN
  -- ── CASE 1: DEDUCT STOCK ──────────────────────────────────
  -- Trigger when order becomes paid AND stock has NOT been deducted yet.
  -- Condition: payment_status changed to 'paid' AND status is not cancelled.
  IF (NEW.payment_status = 'paid')
     AND (NEW.stock_deducted = FALSE)
     AND (NEW.status <> 'cancelled')
  THEN
    -- Loop through all items in this order
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = NEW.id
        AND product_id IS NOT NULL
    LOOP
      -- Get current stock to guard against negative stock
      SELECT stock INTO v_current_stock
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE; -- Lock row during this operation

      IF v_current_stock IS NOT NULL THEN
        -- Deduct stock; allow 0 but not negative (clamp at 0)
        UPDATE public.products
        SET stock = GREATEST(0, stock - v_item.quantity),
            updated_at = now()
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;

    -- Mark stock as deducted so this doesn't run again on next update
    NEW.stock_deducted := TRUE;

  -- ── CASE 2: RESTORE STOCK ────────────────────────────────
  -- Trigger when order is cancelled AND stock WAS previously deducted.
  ELSIF (NEW.status = 'cancelled')
        AND (OLD.stock_deducted = TRUE)
        AND (NEW.stock_deducted = TRUE)
  THEN
    -- Restore stock for each item
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = NEW.id
        AND product_id IS NOT NULL
    LOOP
      UPDATE public.products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id;
    END LOOP;

    -- Mark stock as NOT deducted (reversed)
    NEW.stock_deducted := FALSE;

    -- Record cancellation timestamp for audit trail
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;

  -- ── CASE 3: ORDER CANCELLED BEFORE PAYMENT ───────────────
  -- If cancelled while never paid, just record the timestamp
  ELSIF (NEW.status = 'cancelled')
        AND (OLD.stock_deducted = FALSE OR OLD.stock_deducted IS NULL)
        AND (OLD.status <> 'cancelled')
  THEN
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.manage_order_stock() IS
  'Trigger: Otomatis kurangi products.stock saat order lunas, dan kembalikan stok saat order dibatalkan.';

-- ─────────────────────────────────────────────
-- Bind trigger to orders table
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_manage_stock ON public.orders;

CREATE TRIGGER trg_orders_manage_stock
BEFORE UPDATE OF payment_status, status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.manage_order_stock();

-- ─────────────────────────────────────────────
-- Helper function: Validate stock before order creation
-- Called from frontend service layer or another trigger
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_order_stock(p_order_id UUID)
RETURNS TABLE(product_id UUID, product_name TEXT, requested INTEGER, available INTEGER, is_sufficient BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_id,
    oi.product_name,
    oi.quantity                           AS requested,
    COALESCE(p.stock, 0)                  AS available,
    COALESCE(p.stock, 0) >= oi.quantity   AS is_sufficient
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id;
END;
$$;

COMMENT ON FUNCTION public.validate_order_stock(UUID) IS
  'Checks whether all items in an order have sufficient product stock before payment.';

-- Grant execute to authenticated users (frontend can call this RPC)
GRANT EXECUTE ON FUNCTION public.validate_order_stock(UUID) TO authenticated;
