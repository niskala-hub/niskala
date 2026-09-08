-- =============================================================
-- Migration: Admin Dashboard Aggregation RPC
-- Fast single-query JSON aggregator for the main admin dashboard.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_omset NUMERIC := 0;
  v_last_month_omset NUMERIC := 0;
  v_omset_growth NUMERIC := 0;
  v_active_orders INT := 0;
  v_pending_orders INT := 0;
  v_processing_orders INT := 0;
  v_low_stock_count INT := 0;
  v_out_of_stock_count INT := 0;
  v_products_count INT := 0;
  v_categories_count INT := 0;
  v_channel_stats JSON;
  v_sales_trend JSON;
  v_recent_orders JSON;
  v_top_products JSON;
  v_low_stock_products JSON;
  v_result JSON;
BEGIN
  -- 1. Monthly Omset (Kas Inflow dari Penjualan bulan berjalan)
  SELECT COALESCE(SUM(amount), 0) INTO v_monthly_omset
  FROM public.cash_transactions
  WHERE type = 'inflow'
    AND is_reversal = FALSE
    AND category = 'Penjualan'
    AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE);

  -- Omset bulan lalu (untuk hitung persentase tren)
  SELECT COALESCE(SUM(amount), 0) INTO v_last_month_omset
  FROM public.cash_transactions
  WHERE type = 'inflow'
    AND is_reversal = FALSE
    AND category = 'Penjualan'
    AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND transaction_date < DATE_TRUNC('month', CURRENT_DATE);

  IF v_last_month_omset > 0 THEN
    v_omset_growth := ROUND(((v_monthly_omset - v_last_month_omset) / v_last_month_omset) * 100, 1);
  ELSE
    v_omset_growth := 0;
  END IF;

  -- 2. Active Orders (perlu diproses / dikirim)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'processing')
  INTO v_active_orders, v_pending_orders, v_processing_orders
  FROM public.orders
  WHERE status IN ('pending', 'processing');

  -- 3. Inventory stats
  SELECT
    COUNT(*) FILTER (WHERE stock <= 5),
    COUNT(*) FILTER (WHERE stock = 0),
    COUNT(*)
  INTO v_low_stock_count, v_out_of_stock_count, v_products_count
  FROM public.products;

  -- Total categories
  SELECT COUNT(*) INTO v_categories_count FROM public.categories;

  -- 4. Channel stats (Online vs Offline bulan berjalan)
  SELECT json_build_object(
    'online', json_build_object(
      'order_count', COUNT(*) FILTER (WHERE channel = 'online'),
      'revenue', COALESCE(SUM(total_price) FILTER (WHERE channel = 'online' AND status <> 'cancelled'), 0)
    ),
    'offline', json_build_object(
      'order_count', COUNT(*) FILTER (WHERE channel = 'offline'),
      'revenue', COALESCE(SUM(total_price) FILTER (WHERE channel = 'offline' AND status <> 'cancelled'), 0)
    )
  ) INTO v_channel_stats
  FROM public.orders
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- 5. Sales Trend: 14 hari terakhir (Daily Revenue & Order count)
  WITH dates AS (
    SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day')::DATE AS day
  ),
  daily_sales AS (
    SELECT
      DATE(transaction_date) AS day,
      COALESCE(SUM(amount), 0) AS revenue,
      COUNT(*) AS count
    FROM public.cash_transactions
    WHERE type = 'inflow'
      AND is_reversal = FALSE
      AND category = 'Penjualan'
      AND transaction_date >= CURRENT_DATE - INTERVAL '13 days'
    GROUP BY DATE(transaction_date)
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'date', TO_CHAR(d.day, 'YYYY-MM-DD'),
      'label', TO_CHAR(d.day, 'DD/MM'),
      'day_name', TO_CHAR(d.day, 'Dy'),
      'revenue', COALESCE(s.revenue, 0),
      'orders', COALESCE(s.count, 0)
    ) ORDER BY d.day ASC
  ), '[]'::json)
  INTO v_sales_trend
  FROM dates d
  LEFT JOIN daily_sales s ON s.day = d.day;

  -- 6. 5 Recent Orders
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_recent_orders
  FROM (
    SELECT
      o.id,
      COALESCE(NULLIF(o.customer_name, ''), 'Tanpa Nama') AS customer_name,
      o.customer_phone,
      o.channel,
      o.status,
      o.payment_status,
      o.total_price,
      o.created_at,
      (SELECT COUNT(*) FROM public.order_items WHERE order_id = o.id) AS items_count
    FROM public.orders o
    ORDER BY o.created_at DESC
    LIMIT 5
  ) t;

  -- 7. 5 Top Selling Products (Non-cancelled orders)
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_top_products
  FROM (
    SELECT
      p.id,
      p.name,
      p.price,
      p.stock,
      p.image_url,
      COALESCE(SUM(oi.quantity), 0) AS total_sold,
      COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
    JOIN public.products p ON p.id = oi.product_id
    GROUP BY p.id, p.name, p.price, p.stock, p.image_url
    ORDER BY total_sold DESC, total_revenue DESC
    LIMIT 5
  ) t;

  -- 8. Low Stock Alert (stok <= 5)
  SELECT COALESCE(json_agg(t), '[]'::json) INTO v_low_stock_products
  FROM (
    SELECT
      p.id,
      p.name,
      p.price,
      p.stock,
      p.image_url,
      c.name AS category_name
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE p.stock <= 5
    ORDER BY p.stock ASC, p.name ASC
    LIMIT 6
  ) t;

  -- Build final JSON payload
  v_result := json_build_object(
    'metrics', json_build_object(
      'monthly_omset', v_monthly_omset,
      'last_month_omset', v_last_month_omset,
      'omset_growth', v_omset_growth,
      'active_orders', v_active_orders,
      'pending_orders', v_pending_orders,
      'processing_orders', v_processing_orders,
      'low_stock_count', v_low_stock_count,
      'out_of_stock_count', v_out_of_stock_count,
      'products_count', v_products_count,
      'categories_count', v_categories_count
    ),
    'channel_stats', v_channel_stats,
    'sales_trend', v_sales_trend,
    'recent_orders', v_recent_orders,
    'top_products', v_top_products,
    'low_stock_products', v_low_stock_products,
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_dashboard_summary() IS
  'Mengembalikan ringkasan komprehensif dashboard admin NISKALA dalam satu RPC call berkinerja tinggi.';

-- Izinkan authenticated user (admin/owner) untuk memanggil fungsi ini
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary() TO authenticated;
