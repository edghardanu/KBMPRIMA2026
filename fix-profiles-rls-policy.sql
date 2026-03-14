-- ============================================
-- FIX: RLS Policy untuk Profiles Table
-- Memastikan user bisa membaca profile mereka sendiri
-- ============================================

-- 1. Pastikan RLS enabled pada profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop semua policy lama yang ada (opsional tapi disarankan)
DROP POLICY IF EXISTS "Select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Select all profiles as admin" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can check if email exists" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3. Buat policy baru yang lebih permissive dan aman

-- Setiap user authenticated bisa membaca profile mereka sendiri
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Admin bisa membaca semua profile
CREATE POLICY "Admin can read all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Guru dan Pengurus bisa membaca profile dalam konteks mereka
CREATE POLICY "Guru can read related profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('guru', 'pengurus')
        )
        OR auth.uid() = id
    );

-- Setiap user bisa update profile mereka sendiri
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin bisa update semua profile
CREATE POLICY "Admin can update any profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow trigger untuk insert (SECURITY DEFINER function tidak perlu RLS)
-- Jadi tidak perlu policy INSERT

-- 4. Verifikasi RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- 5. List semua policy pada profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users. RLS enabled with policies for self-read and admin-read.';
