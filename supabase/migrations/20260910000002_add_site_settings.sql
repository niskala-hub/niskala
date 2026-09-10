-- ============================================================
-- Site Settings — single-row table for global toggles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  -- id boolean = single-row enforcement: only (id = true) allowed
  id                   boolean PRIMARY KEY DEFAULT true,
  coming_soon_enabled  boolean NOT NULL DEFAULT false
);

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_single_row CHECK (id = true);

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (anon included) can READ — needed to check flag before auth
CREATE POLICY "Anyone can read site_settings" ON public.site_settings
  FOR SELECT USING (true);

-- Only privileged staff (owner / admin / co_owner) can UPDATE
CREATE POLICY "Privileged update site_settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'co_owner')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'co_owner')
  );

-- Seed the default row (coming soon OFF by default)
INSERT INTO public.site_settings (id, coming_soon_enabled)
VALUES (true, false)
ON CONFLICT (id) DO NOTHING;
