CREATE TABLE public.product_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_models TO authenticated;
GRANT ALL ON public.product_models TO service_role;

ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product models" ON public.product_models FOR SELECT USING (true);
CREATE POLICY "Admins insert product models" ON public.product_models FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product models" ON public.product_models FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product models" ON public.product_models FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_product_models_updated BEFORE UPDATE ON public.product_models
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_models_product ON public.product_models(product_id);

CREATE TABLE public.product_motifs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.product_models(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text,
  stock integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_motifs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_motifs TO authenticated;
GRANT ALL ON public.product_motifs TO service_role;

ALTER TABLE public.product_motifs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product motifs" ON public.product_motifs FOR SELECT USING (true);
CREATE POLICY "Admins insert product motifs" ON public.product_motifs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product motifs" ON public.product_motifs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product motifs" ON public.product_motifs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_product_motifs_updated BEFORE UPDATE ON public.product_motifs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_motifs_model ON public.product_motifs(model_id);