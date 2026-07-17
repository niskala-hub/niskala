-- Bio-links table
CREATE TABLE public.bio_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'Link2',
  "order" integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bio_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_links TO authenticated;
GRANT ALL ON public.bio_links TO service_role;

ALTER TABLE public.bio_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bio links"
  ON public.bio_links FOR SELECT
  USING (true);

CREATE POLICY "Admins insert bio links"
  ON public.bio_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update bio links"
  ON public.bio_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete bio links"
  ON public.bio_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bio_links_updated_at
  BEFORE UPDATE ON public.bio_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public click increment RPC (anyone can bump clicks; nothing else)
CREATE OR REPLACE FUNCTION public.increment_bio_link_click(_link_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.bio_links SET clicks = clicks + 1 WHERE id = _link_id;
$$;

REVOKE ALL ON FUNCTION public.increment_bio_link_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_bio_link_click(uuid) TO anon, authenticated;