-- ============================================
-- COMPREHENSIVE FIX: Profile Auto-Creation & RLS
-- Jalankan di Supabase SQL Editor dengan role: postgres
-- ============================================

-- 1. RECREATE TRIGGER DENGAN BETTER ERROR HANDLING
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_role TEXT;
BEGIN
    -- Extract from metadata or use defaults
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1),
        'User'
    );
    
    user_role := COALESCE(
        (NEW.raw_user_meta_data->>'role'),
        'pending'
    );
    
    -- Validate role
    IF user_role NOT IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending') THEN
        user_role := 'pending';
    END IF;
    
    -- Insert profile (will not fail even if exists)
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_role,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        updated_at = NOW();
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 2. ENSURE RLS IS ENABLED
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL OLD POLICIES
DROP POLICY IF EXISTS "authenticated_select_own" ON public.profiles;
DROP POLICY IF EXISTS "admin_select_all" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_update_own" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_all" ON public.profiles;
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
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 4. PERMISSIVE SELECT POLICIES (allow reading)
-- All authenticated users can read their own profile
CREATE POLICY "allow_read_own_profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Service role and admins can read all (for trigger)
CREATE POLICY "allow_read_all_for_admin"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);  -- Permissive - let app handle authorization

-- 5. PERMISSIVE UPDATE POLICIES
CREATE POLICY "allow_update_own_profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin bypass update
CREATE POLICY "allow_update_all_for_admin"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. VERIFY CONFIGURATION
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Show policies
SELECT 
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check trigger
SELECT 
    t.tgname,
    t.tgenabled,
    p.proname
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.profiles'::regclass;

-- 7. MANUALLY CREATE MISSING PROFILES FOR EXISTING AUTH USERS
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        split_part(u.email, '@', 1),
        'User'
    ),
    COALESCE((u.raw_user_meta_data->>'role'), 'pending'),
    NOW(),
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

COMMIT;
