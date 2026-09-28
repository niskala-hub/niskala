-- =============================================================
-- Migration: Product Sizes Stock, Custom Price & Order Report Functions
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ENHANCE public.product_sizes TABLE
--    Add stock, custom price, custom HPP, and optional name/label
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.product_sizes
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hpp_price NUMERIC DEFAULT NULL;

COMMENT ON COLUMN public.product_sizes.name IS 'Label atau nama ukuran (opsional, misal: S, M, L, XL, Jumbo 3XL)';
COMMENT ON COLUMN public.product_sizes.stock IS 'Jumlah stok fisik untuk ukuran spesifik ini';
COMMENT ON COLUMN public.product_sizes.price IS 'Harga jual khusus ukuran ini (jika NULL, mewarisi harga master produk)';
COMMENT ON COLUMN public.product_sizes.hpp_price IS 'HPP khusus ukuran ini (jika NULL, mewarisi HPP master produk)';

-- Guard stock non-negative
ALTER TABLE public.product_sizes
  DROP CONSTRAINT IF EXISTS product_sizes_stock_check;
ALTER TABLE public.product_sizes
  ADD CONSTRAINT product_sizes_stock_check CHECK (stock >= 0);

-- ─────────────────────────────────────────────────────────────
-- 2. ENHANCE public.order_items TABLE
--    Add size reference & size snapshot name
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES public.product_sizes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS size_name TEXT DEFAULT NULL;

COMMENT ON COLUMN public.order_items.size_id IS 'FK ke product_sizes.id — null jika item tidak memiliki varian ukuran';
COMMENT ON COLUMN public.order_items.size_name IS 'Snapshot nama/kategori ukuran saat transaksi dibuat (misal: "Reguler (LD 100 cm)")';

CREATE INDEX IF NOT EXISTS idx_order_items_size_id ON public.order_items(size_id);

-- ─────────────────────────────────────────────────────────────
-- 3. SYNC FUNCTION: Keep products.stock in sync with sum(product_sizes.stock)
--    If a product has size records, its master stock reflects the sum.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_product_total_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prod_id UUID;
  v_total_stock INT;
  v_has_sizes BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_prod_id := OLD.product_id;
  ELSE
    v_prod_id := NEW.product_id;
  END IF;

  -- Cek apakah produk memiliki varian size
  SELECT EXISTS(SELECT 1 FROM public.product_sizes WHERE product_id = v_prod_id)
  INTO v_has_sizes;

  IF v_has_sizes THEN
    SELECT COALESCE(SUM(stock), 0)
    INTO v_total_stock
    FROM public.product_sizes
    WHERE product_id = v_prod_id;

    UPDATE public.products
    SET stock = v_total_stock,
        updated_at = now()
    WHERE id = v_prod_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_size_stock ON public.product_sizes;
CREATE TRIGGER trg_sync_product_size_stock
AFTER INSERT OR UPDATE OF stock OR DELETE ON public.product_sizes
FOR EACH ROW EXECUTE FUNCTION public.sync_product_total_stock();

-- ─────────────────────────────────────────────────────────────
-- 4. UPDATE STOCK MANAGEMENT TRIGGER: Support Size-Level Stock
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.manage_order_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_current_stock INTEGER;
  v_size_stock INTEGER;
BEGIN
  -- ── CASE 1: DEDUCT STOCK ──────────────────────────────────
  IF (NEW.payment_status = 'paid')
     AND (NEW.stock_deducted = FALSE)
     AND (NEW.status <> 'cancelled')
  THEN
    FOR v_item IN
      SELECT product_id, size_id, quantity
      FROM public.order_items
      WHERE order_id = NEW.id
        AND product_id IS NOT NULL
    LOOP
      -- Potong stok ukuran spesifik jika size_id ada
      IF v_item.size_id IS NOT NULL THEN
        SELECT stock INTO v_size_stock
        FROM public.product_sizes
        WHERE id = v_item.size_id
        FOR UPDATE;

        IF v_size_stock IS NOT NULL THEN
          UPDATE public.product_sizes
          SET stock = GREATEST(0, stock - v_item.quantity),
              updated_at = now()
          WHERE id = v_item.size_id;
        END IF;
      END IF;

      -- Potong juga stok master produk (atau sinkronisasi)
      SELECT stock INTO v_current_stock
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;

      IF v_current_stock IS NOT NULL THEN
        UPDATE public.products
        SET stock = GREATEST(0, stock - v_item.quantity),
            updated_at = now()
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;

    NEW.stock_deducted := TRUE;

  -- ── CASE 2: RESTORE STOCK ────────────────────────────────
  ELSIF (NEW.status = 'cancelled')
        AND (OLD.stock_deducted = TRUE)
        AND (NEW.stock_deducted = TRUE)
  THEN
    FOR v_item IN
      SELECT product_id, size_id, quantity
      FROM public.order_items
      WHERE order_id = NEW.id
        AND product_id IS NOT NULL
    LOOP
      -- Kembalikan stok ukuran spesifik jika size_id ada
      IF v_item.size_id IS NOT NULL THEN
        UPDATE public.product_sizes
        SET stock = stock + v_item.quantity,
            updated_at = now()
        WHERE id = v_item.size_id;
      END IF;

      -- Kembalikan stok master produk
      UPDATE public.products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id;
    END LOOP;

    NEW.stock_deducted := FALSE;

    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;

  -- ── CASE 3: CANCELLED BEFORE PAYMENT ──────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5. STOCK VALIDATION RPC (Support checking per-size stock)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.validate_order_stock(UUID);

CREATE OR REPLACE FUNCTION public.validate_order_stock(p_order_id UUID)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  size_id UUID,
  size_name TEXT,
  requested INTEGER,
  available INTEGER,
  is_sufficient BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_id,
    oi.product_name,
    oi.size_id,
    oi.size_name,
    oi.quantity AS requested,
    CASE
      WHEN oi.size_id IS NOT NULL THEN COALESCE(ps.stock, 0)
      ELSE COALESCE(p.stock, 0)
    END AS available,
    CASE
      WHEN oi.size_id IS NOT NULL THEN COALESCE(ps.stock, 0) >= oi.quantity
      ELSE COALESCE(p.stock, 0) >= oi.quantity
    END AS is_sufficient
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.product_sizes ps ON ps.id = oi.size_id
  WHERE oi.order_id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_order_stock(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. ORDER REPORT RPC: Aggregated Summary & Time Series Breakdown
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_order_report_summary(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_channel TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res JSON;
BEGIN
  SELECT json_build_object(
    'total_orders', COUNT(*),
    'total_gross_sales', COALESCE(SUM(total_price) FILTER (WHERE status <> 'cancelled'), 0),
    'total_paid_sales', COALESCE(SUM(total_price) FILTER (WHERE payment_status = 'paid' AND status <> 'cancelled'), 0),
    'total_unpaid_sales', COALESCE(SUM(total_price) FILTER (WHERE payment_status = 'unpaid' AND status <> 'cancelled'), 0),
    'total_cogs', COALESCE(SUM(total_hpp) FILTER (WHERE status <> 'cancelled'), 0),
    'total_gross_profit', COALESCE(SUM(total_price - total_hpp) FILTER (WHERE status <> 'cancelled'), 0),
    'average_order_value', CASE
      WHEN COUNT(*) FILTER (WHERE status <> 'cancelled') > 0
      THEN ROUND(COALESCE(SUM(total_price) FILTER (WHERE status <> 'cancelled'), 0) / COUNT(*) FILTER (WHERE status <> 'cancelled'), 0)
      ELSE 0
    END,
    'total_items_sold', COALESCE(
      (
        SELECT SUM(oi.quantity)
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE o.status <> 'cancelled'
          AND (p_start_date IS NULL OR o.created_at >= p_start_date)
          AND (p_end_date IS NULL OR o.created_at <= p_end_date)
          AND (p_channel IS NULL OR p_channel = 'all' OR o.channel = p_channel)
          AND (p_payment_status IS NULL OR p_payment_status = 'all' OR o.payment_status = p_payment_status)
      ), 0
    ),
    'orders_by_status', json_build_object(
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'processing', COUNT(*) FILTER (WHERE status = 'processing'),
      'shipped', COUNT(*) FILTER (WHERE status = 'shipped'),
      'done', COUNT(*) FILTER (WHERE status = 'done'),
      'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')
    ),
    'orders_by_payment', json_build_object(
      'paid', COUNT(*) FILTER (WHERE payment_status = 'paid'),
      'unpaid', COUNT(*) FILTER (WHERE payment_status = 'unpaid')
    ),
    'orders_by_channel', json_build_object(
      'online', COUNT(*) FILTER (WHERE channel = 'online'),
      'offline', COUNT(*) FILTER (WHERE channel = 'offline')
    )
  ) INTO v_res
  FROM public.orders
  WHERE (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_channel IS NULL OR p_channel = 'all' OR channel = p_channel)
    AND (p_payment_status IS NULL OR p_payment_status = 'all' OR payment_status = p_payment_status);

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_report_summary(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. ORDER REPORT RPC: Periodic Breakdown (Harian, Bulanan, Tahunan)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_order_report_breakdown(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_period TEXT DEFAULT 'day', -- 'day', 'month', 'year'
  p_channel TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  period_bucket TEXT,
  order_count BIGINT,
  total_revenue NUMERIC,
  total_cogs NUMERIC,
  total_profit NUMERIC,
  items_sold BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(
      DATE_TRUNC(
        CASE
          WHEN p_period = 'year' THEN 'year'
          WHEN p_period = 'month' THEN 'month'
          ELSE 'day'
        END,
        o.created_at
      ),
      CASE
        WHEN p_period = 'year' THEN 'YYYY'
        WHEN p_period = 'month' THEN 'YYYY-MM'
        ELSE 'YYYY-MM-DD'
      END
    ) AS period_bucket,
    COUNT(DISTINCT o.id)::BIGINT AS order_count,
    COALESCE(SUM(o.total_price), 0)::NUMERIC AS total_revenue,
    COALESCE(SUM(o.total_hpp), 0)::NUMERIC AS total_cogs,
    COALESCE(SUM(o.total_price - o.total_hpp), 0)::NUMERIC AS total_profit,
    COALESCE(SUM(oi.quantity), 0)::BIGINT AS items_sold
  FROM public.orders o
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND (p_channel IS NULL OR p_channel = 'all' OR o.channel = p_channel)
    AND (p_payment_status IS NULL OR p_payment_status = 'all' OR o.payment_status = p_payment_status)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_report_breakdown(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8. ORDER REPORT RPC: Top Selling Products & Sizes Breakdown
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_selling_variants(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  size_name TEXT,
  quantity_sold BIGINT,
  total_revenue NUMERIC,
  total_profit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_id,
    oi.product_name,
    COALESCE(oi.size_name, 'Standar') AS size_name,
    SUM(oi.quantity)::BIGINT AS quantity_sold,
    SUM(oi.quantity * oi.unit_price)::NUMERIC AS total_revenue,
    SUM(oi.quantity * (oi.unit_price - oi.unit_hpp))::NUMERIC AS total_profit
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status <> 'cancelled'
    AND (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at <= p_end_date)
  GROUP BY oi.product_id, oi.product_name, oi.size_name
  ORDER BY quantity_sold DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_selling_variants(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;
