CREATE TABLE public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  note text,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.password_reset_requests TO authenticated;
GRANT ALL ON public.password_reset_requests TO service_role;

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read reset requests"
ON public.password_reset_requests
FOR SELECT
TO authenticated
USING (public.is_owner_or_coowner(auth.uid()));

CREATE POLICY "Owners update reset requests"
ON public.password_reset_requests
FOR UPDATE
TO authenticated
USING (public.is_owner_or_coowner(auth.uid()))
WITH CHECK (public.is_owner_or_coowner(auth.uid()));

CREATE TRIGGER trg_password_reset_requests_updated
BEFORE UPDATE ON public.password_reset_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();