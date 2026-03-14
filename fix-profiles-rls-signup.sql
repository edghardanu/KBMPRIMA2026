-- ============================================
-- FIX: Allow Profile Creation During Sign-up
-- For form-murid with direct password authentication
-- ============================================

-- 1. Update the trigger to support role from metadata
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_role TEXT;
BEGIN
    -- Extract full_name and role from metadata
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '(Orang Tua)');
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'pending');
    
    -- Ensure role is valid
    IF user_role NOT IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending') THEN
        user_role := 'pending';
    END IF;
    
    -- Insert the profile
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
        email = NEW.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop all old policies and create new ones
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 5. New policies for authenticated users
CREATE POLICY "Select own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR role = 'admin');

CREATE POLICY "Select all profiles as admin"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can update all profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 6. Allow anon to select (for registration pages)
DROP POLICY IF EXISTS "Anon can check email" ON public.profiles;
CREATE POLICY "Anon can check if email exists"
    ON public.profiles FOR SELECT
    TO anon
    USING (false);  -- Prevent anon from reading

-- Done!
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile with role from auth metadata during user signup';
