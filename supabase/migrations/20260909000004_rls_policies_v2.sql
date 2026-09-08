-- =============================================================
-- Migration: RLS Policies v2
-- Tightens access control:
--   - admin: CRUD (no delete paid orders, no delete cash)
--   - owner/co_owner: full access including sensitive deletes
--   - Prevents hard-delete on posted financial records
-- =============================================================

-- ─────────────────────────────────────────────
-- ORDERS TABLE
-- ─────────────────────────────────────────────

-- Drop old permissive policy
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;

-- SELECT: All authenticated admins/owners can read
CREATE POLICY "Staff read orders" ON public.orders
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

-- INSERT: Admin and above can create orders
CREATE POLICY "Staff insert orders" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

-- UPDATE: Admin and above can update orders
-- (status changes, payment updates, etc.)
CREATE POLICY "Staff update orders" ON public.orders
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

-- DELETE: ONLY owner/co_owner can hard-delete orders,
-- AND only if the order has NOT been paid (unpaid orders only).
-- Paid orders must be cancelled (soft-delete) via status update.
CREATE POLICY "Owner delete unpaid orders only" ON public.orders
FOR DELETE TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'co_owner')
  )
  AND payment_status <> 'paid'
);

-- ─────────────────────────────────────────────
-- ORDER_ITEMS TABLE
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;

-- Staff can read, insert, update order items
CREATE POLICY "Staff read order items" ON public.order_items
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

CREATE POLICY "Staff insert order items" ON public.order_items
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

CREATE POLICY "Staff update order items" ON public.order_items
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

-- DELETE order items: Only owner/co_owner, and only if parent order is not paid
CREATE POLICY "Owner delete order items if unpaid" ON public.order_items
FOR DELETE TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'co_owner')
  )
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_items.order_id
      AND payment_status <> 'paid'
  )
);

-- ─────────────────────────────────────────────
-- CASH_TRANSACTIONS TABLE
-- ─────────────────────────────────────────────

-- Drop old broad policies
DROP POLICY IF EXISTS "Admins manage cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Staff read cash transactions"    ON public.cash_transactions;
DROP POLICY IF EXISTS "Staff insert cash transactions"  ON public.cash_transactions;
DROP POLICY IF EXISTS "Staff update cash transactions"  ON public.cash_transactions;
DROP POLICY IF EXISTS "Only owner deletes cash transactions" ON public.cash_transactions;

-- SELECT: All staff can read cash transactions
CREATE POLICY "Staff read cash transactions" ON public.cash_transactions
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

-- INSERT: Admin and above can insert (manual entries + trigger-based auto entries)
-- Note: SECURITY DEFINER triggers bypass RLS, so this covers manual inserts only.
CREATE POLICY "Staff insert cash transactions" ON public.cash_transactions
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

-- UPDATE: Only owner/co_owner can update cash entries.
-- Admin biasa TIDAK boleh mengedit transaksi kas yang sudah terposting.
CREATE POLICY "Owner update cash transactions" ON public.cash_transactions
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
)
WITH CHECK (
  public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

-- DELETE: ONLY owner can hard-delete cash transactions.
-- Even owner cannot delete auto-generated Penjualan entries (use reversal instead).
-- This is enforced at application layer; DB-level allows owner full control.
CREATE POLICY "Only owner deletes cash transactions" ON public.cash_transactions
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'owner')
);

-- ─────────────────────────────────────────────
-- PRODUCTS TABLE — Tighten delete for immutability
-- ─────────────────────────────────────────────

-- Drop the existing permissive admin delete policy
DROP POLICY IF EXISTS "Admins delete products" ON public.products;

-- Only owner/co_owner can hard-delete products
CREATE POLICY "Owner delete products" ON public.products
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'owner')
  OR public.has_role(auth.uid(), 'co_owner')
);

-- ─────────────────────────────────────────────
-- Helper: is_owner_or_coowner function (if not exists)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_owner_or_coowner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'co_owner')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_owner_or_coowner(UUID) TO authenticated;
