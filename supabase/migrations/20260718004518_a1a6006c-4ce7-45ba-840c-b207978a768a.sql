ALTER TABLE public.bio_links ADD COLUMN IF NOT EXISTS last_click_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.increment_bio_link_click(_link_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.bio_links
  SET clicks = clicks + 1,
      last_click_at = now()
  WHERE id = _link_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_bio_link_click(uuid) TO public, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_bio_link_click(uuid) TO service_role;