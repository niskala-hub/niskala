CREATE OR REPLACE FUNCTION public.limit_product_images()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.image_urls IS NOT NULL AND array_length(NEW.image_urls, 1) > 5 THEN
    RAISE EXCEPTION 'Maksimal 5 gambar per produk';
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TYPE public.size_category AS ENUM ('Reguler', 'Jumbo Size');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category public.size_category NOT NULL DEFAULT 'Reguler',
  ld integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_sizes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sizes TO authenticated;
GRANT ALL ON public.product_sizes TO service_role;

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product sizes" ON public.product_sizes
  FOR SELECT USING (true);
CREATE POLICY "Admins insert product sizes" ON public.product_sizes
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update product sizes" ON public.product_sizes
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete product sizes" ON public.product_sizes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_sizes_updated_at
  BEFORE UPDATE ON public.product_sizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_sizes_product ON public.product_sizes(product_id);