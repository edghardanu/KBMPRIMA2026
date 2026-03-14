-- ============================================
-- CRITICAL FIX: RLS Policies untuk Profiles Table
-- Jalankan dengan akun admin/service_role
-- ============================================

-- 1. Pastikan RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop semua policy lama
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Guru can read related profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Select all profiles as admin" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can check if email exists" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3. SIMPLE & PERMISSIVE RLS POLICIES
-- Authenticated users can SELECT their own profile
CREATE POLICY "authenticated_select_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Admin can SELECT all
CREATE POLICY "admin_select_all"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
    );

-- Authenticated can UPDATE their own profile  
CREATE POLICY "authenticated_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin can UPDATE any profile
CREATE POLICY "admin_update_all"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
    );

-- 4. Verify RLS is properly configured
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 5. List all policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Check if trigger exists
SELECT tgname, tgenabled, tgfoid
FROM pg_trigger 
WHERE tgrelid = 'public.profiles'::regclass;

COMMIT;
