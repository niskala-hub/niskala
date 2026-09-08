ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id)
  REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.sync_order_cash_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cash_transactions
    WHERE reference_id = OLD.id AND category = 'Penjualan';
    RETURN OLD;
  END IF;

  v_label := 'Pesanan ' || COALESCE(NULLIF(NEW.customer_name, ''), 'tanpa nama')
             || ' (' || COALESCE(NEW.channel, 'offline') || ')';

  IF NEW.payment_status = 'paid' THEN
    IF EXISTS (SELECT 1 FROM public.cash_transactions WHERE reference_id = NEW.id AND category = 'Penjualan') THEN
      UPDATE public.cash_transactions
      SET amount = NEW.total_price,
          description = v_label,
          transaction_date = COALESCE(NEW.paid_at, now())
      WHERE reference_id = NEW.id AND category = 'Penjualan';
    ELSE
      INSERT INTO public.cash_transactions (transaction_date, type, category, amount, description, reference_id)
      VALUES (COALESCE(NEW.paid_at, now()), 'inflow', 'Penjualan', NEW.total_price, v_label, NEW.id);
    END IF;
  ELSE
    DELETE FROM public.cash_transactions
    WHERE reference_id = NEW.id AND category = 'Penjualan';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_cash ON public.orders;
CREATE TRIGGER trg_orders_sync_cash
AFTER INSERT OR UPDATE OF payment_status, total_price, paid_at, customer_name, channel ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_cash_transaction();

DROP TRIGGER IF EXISTS trg_orders_sync_cash_delete ON public.orders;
CREATE TRIGGER trg_orders_sync_cash_delete
BEFORE DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_cash_transaction();