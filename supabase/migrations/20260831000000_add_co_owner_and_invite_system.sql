-- ============================================================
-- Add co_owner role, must_change_password, and update policies
-- ============================================================

-- 1. Add co_owner to the role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'co_owner';

-- 2. Add must_change_password to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- 3. Update has_role() to accept text so edge functions can pass string
--    (existing signature uses app_role, keep that, add overload for text)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 4. Helper: is caller an owner or co_owner?
CREATE OR REPLACE FUNCTION public.is_owner_or_coowner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner', 'co_owner')
  );
$$;

-- 5. Update RLS on user_roles so co_owner can also read all rows
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_owner_or_coowner(auth.uid()));

DROP POLICY IF EXISTS "Owner inserts roles" ON public.user_roles;
CREATE POLICY "Owner inserts roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_owner_or_coowner(auth.uid())
    AND role = 'admin'::app_role
  );

DROP POLICY IF EXISTS "Owner deletes admin roles" ON public.user_roles;
-- Owner can delete admin AND co_owner rows; co_owner can only delete admin rows
CREATE POLICY "Owner deletes admin roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    (
      -- Owner: can delete admin or co_owner, but not other owners
      public.has_role(auth.uid(), 'owner')
      AND role IN ('admin', 'co_owner')
      AND user_id <> auth.uid()
    )
    OR
    (
      -- Co-owner: can only delete admin rows
      public.has_role(auth.uid(), 'co_owner')
      AND role = 'admin'::app_role
      AND user_id <> auth.uid()
    )
  );

-- 6. Update profiles RLS so owner/co_owner can read all profiles
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_owner_or_coowner(auth.uid()));

-- Allow owner/co-owner to update any profile (for resetting must_change_password)
DROP POLICY IF EXISTS "Owner updates profiles" ON public.profiles;
CREATE POLICY "Owner updates profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_owner_or_coowner(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_owner_or_coowner(auth.uid()));

-- 7. Remove the auto-assign trigger on new user creation
--    (users are now only created via invite, role is explicitly assigned)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Replace handle_new_user: only insert into profiles, no auto role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
