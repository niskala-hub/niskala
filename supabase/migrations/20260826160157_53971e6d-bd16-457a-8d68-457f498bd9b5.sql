-- Profiles to expose emails for user management
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'owner'));

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Promote the oldest existing account to owner (single owner only)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner')
ORDER BY u.created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- Owner also keeps admin capabilities
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.user_roles WHERE role = 'owner'
ON CONFLICT (user_id, role) DO NOTHING;

-- New signups: first ever account becomes owner+admin, others plain admin staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner'), (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Owner can read and manage all role rows
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owner inserts roles" ON public.user_roles;
CREATE POLICY "Owner inserts roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner') AND role = 'admin'::app_role);

DROP POLICY IF EXISTS "Owner deletes admin roles" ON public.user_roles;
CREATE POLICY "Owner deletes admin roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner') AND role = 'admin'::app_role AND user_id <> auth.uid());

-- Only owner may delete cash transactions
DROP POLICY IF EXISTS "Admins manage cash transactions" ON public.cash_transactions;

CREATE POLICY "Staff read cash transactions" ON public.cash_transactions
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff insert cash transactions" ON public.cash_transactions
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff update cash transactions" ON public.cash_transactions
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only owner deletes cash transactions" ON public.cash_transactions
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));