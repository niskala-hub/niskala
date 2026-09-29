-- =============================================================
-- Migration: Fix get_order_report_breakdown double-counting bug
-- =============================================================
-- BUG: Fungsi lama melakukan LEFT JOIN order_items ke orders di query
--      yang sama dengan SUM(o.total_price) dan SUM(o.total_hpp).
--      Akibatnya: setiap order yang punya N items akan menghasilkan
--      N baris di JOIN, sehingga SUM(total_price) dihitung N kali
--      lipat (double/triple counting tergantung jumlah item per order).
--      Ini menyebabkan kolom Omset & HPP di Rincian Periodik LEBIH BESAR
--      dari nilai KPI cards dan Rincian Item.
--
-- FIX: Pisahkan aggregasi revenue/cogs/profit (dari orders) dan
--      items_sold (dari order_items) ke dalam dua CTE terpisah,
--      lalu JOIN berdasarkan period bucket.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_order_report_breakdown(
  p_start_date     TIMESTAMPTZ,
  p_end_date       TIMESTAMPTZ,
  p_period         TEXT DEFAULT 'day',
  p_channel        TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  period_bucket TEXT,
  order_count   BIGINT,
  total_revenue NUMERIC,
  total_cogs    NUMERIC,
  total_profit  NUMERIC,
  items_sold    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH

  -- CTE 1: Agregasi level order (revenue, cogs, profit)
  -- Tidak ada JOIN ke order_items, jadi tidak ada double-counting
  order_agg AS (
    SELECT
      TO_CHAR(
        DATE_TRUNC(
          CASE
            WHEN p_period = 'year'  THEN 'year'
            WHEN p_period = 'month' THEN 'month'
            ELSE 'day'
          END,
          o.created_at
        ),
        CASE
          WHEN p_period = 'year'  THEN 'YYYY'
          WHEN p_period = 'month' THEN 'YYYY-MM'
          ELSE 'YYYY-MM-DD'
        END
      ) AS bucket,
      COUNT(o.id)::BIGINT                                        AS order_count,
      COALESCE(SUM(o.total_price), 0)::NUMERIC                   AS total_revenue,
      COALESCE(SUM(o.total_hpp), 0)::NUMERIC                     AS total_cogs,
      COALESCE(SUM(o.total_price - o.total_hpp), 0)::NUMERIC     AS total_profit
    FROM public.orders o
    WHERE o.status <> 'cancelled'
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND (p_channel        IS NULL OR p_channel        = 'all' OR o.channel        = p_channel)
      AND (p_payment_status IS NULL OR p_payment_status = 'all' OR o.payment_status = p_payment_status)
    GROUP BY 1
  ),

  -- CTE 2: Agregasi items_sold dari order_items (join terpisah)
  item_agg AS (
    SELECT
      TO_CHAR(
        DATE_TRUNC(
          CASE
            WHEN p_period = 'year'  THEN 'year'
            WHEN p_period = 'month' THEN 'month'
            ELSE 'day'
          END,
          o.created_at
        ),
        CASE
          WHEN p_period = 'year'  THEN 'YYYY'
          WHEN p_period = 'month' THEN 'YYYY-MM'
          ELSE 'YYYY-MM-DD'
        END
      ) AS bucket,
      COALESCE(SUM(oi.quantity), 0)::BIGINT AS items_sold
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.status <> 'cancelled'
      AND o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND (p_channel        IS NULL OR p_channel        = 'all' OR o.channel        = p_channel)
      AND (p_payment_status IS NULL OR p_payment_status = 'all' OR o.payment_status = p_payment_status)
    GROUP BY 1
  )

  SELECT
    oa.bucket                      AS period_bucket,
    oa.order_count,
    oa.total_revenue,
    oa.total_cogs,
    oa.total_profit,
    COALESCE(ia.items_sold, 0)     AS items_sold
  FROM order_agg oa
  LEFT JOIN item_agg ia ON ia.bucket = oa.bucket
  ORDER BY 1 ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_report_breakdown(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;
