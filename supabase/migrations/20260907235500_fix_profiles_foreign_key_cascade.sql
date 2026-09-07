-- Fix cascade delete for profiles and password_reset_requests to prevent orphan records
-- 1. Bersihkan profile dan reset request orphan (user yang sudah dihapus dari auth.users)
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.password_reset_requests WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

-- 2. Tambahkan foreign key constraint profiles(id) -> auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- 3. Tambahkan foreign key constraint password_reset_requests(user_id) -> auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'password_reset_requests_user_id_fkey' AND table_name = 'password_reset_requests'
  ) THEN
    ALTER TABLE public.password_reset_requests
      ADD CONSTRAINT password_reset_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
