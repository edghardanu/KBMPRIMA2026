-- ============================================
-- COMPLETE FIX: Setup Trigger & RLS Policies
-- This script ensures all components work together
-- ============================================

-- Step 1: Drop and recreate trigger function with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  full_name_val TEXT;
BEGIN
  -- Get metadata from signup
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'orangtua'  -- Default to orangtua for registration form
  );
  
  full_name_val := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    'Pengguna Baru'
  );
  
  -- Force orangtua if empty
  IF user_role IS NULL OR user_role = '' THEN
    user_role := 'orangtua';
  END IF;
  
  -- Insert profile - SECURITY DEFINER so RLS doesn't block this
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, full_name_val, user_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Log error but don't fail - user is already created in auth
  RAISE NOTICE 'Error in handle_new_user: % %', SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions to trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;

-- ============================================
-- Step 2: Fix RLS Policies on profiles table
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Anyone can insert profile during signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Guru can read related profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert their own profile" ON public.profiles;

-- CREATE NEW POLICIES

-- 1. INSERT Policy: Trigger dengan SECURITY DEFINER akan bypass RLS, tapi yang manual insert perlu:
CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. SELECT Policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3. UPDATE Policies
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin update all profiles" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'pengurus')
    )
  );

-- ============================================
-- Step 3: Fix RLS on murid table
-- ============================================

ALTER TABLE public.murid ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Murid readable by all" ON public.murid;
DROP POLICY IF EXISTS "Authenticated can insert murid" ON public.murid;
DROP POLICY IF EXISTS "Public can insert murid" ON public.murid;
DROP POLICY IF EXISTS "Staff can manage murid" ON public.murid;

-- New policies
CREATE POLICY "Murid readable by all" ON public.murid
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert murid" ON public.murid
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update murid" ON public.murid
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Step 4: Fix RLS on murid_orangtua table
-- ============================================

ALTER TABLE public.murid_orangtua ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Murid-Orangtua readable by all" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Public can insert murid_orangtua" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Authenticated can insert murid_orangtua" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Staff can manage murid_orangtua" ON public.murid_orangtua;

-- New policies
CREATE POLICY "Murid-Orangtua readable by all" ON public.murid_orangtua
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert murid_orangtua" ON public.murid_orangtua
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update murid_orangtua" ON public.murid_orangtua
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- VERIFICATION & TESTING
-- ============================================

-- 1. Verify trigger is active
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Verify all RLS policies
SELECT tablename, policyname, permissive
FROM pg_policies
WHERE tablename IN ('profiles', 'murid', 'murid_orangtua')
ORDER BY tablename, policyname;

-- 3. List recent users
SELECT id, email, raw_user_meta_data->>'role' as metadata_role, created_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 20;

-- 4. List recent profiles
SELECT id, email, full_name, role, created_at
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check if there are any unlinked users (in auth but not in profiles)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL AND u.created_at > NOW() - INTERVAL '1 day'
ORDER BY u.created_at DESC;
