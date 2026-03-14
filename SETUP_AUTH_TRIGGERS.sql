-- ============================================
-- Helper Function: Auto-create profile on signup
-- Purpose: Automatically create profile with orangtua role for registration form users
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create trigger function to automatically create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from user metadata
  -- If role not specified, default to 'orangtua' for registration form users
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'orangtua'  -- DEFAULT: All registration form users get orangtua role
  );
  
  -- Ensure role is valid (orangtua only for registration forms)
  -- Force orangtua if role is empty or null
  IF user_role IS NULL OR user_role = '' THEN
    user_role := 'orangtua';
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires AFTER user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Helper Function: Get or create profile
-- ============================================

DROP FUNCTION IF EXISTS public.get_or_create_profile(uuid, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_or_create_profile(
  user_id UUID,
  user_email TEXT,
  user_role TEXT DEFAULT 'orangtua'  -- DEFAULT ROLE IS ORANGTUA
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  role_to_use TEXT;
BEGIN
  -- Ensure role is valid
  role_to_use := COALESCE(user_role, 'orangtua');
  IF role_to_use = '' THEN
    role_to_use := 'orangtua';
  END IF;
  
  -- Try to insert or do nothing if exists
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (user_id, user_email, 'Pengguna Baru', role_to_use, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = NOW();
  
  -- Return the profile
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_profile(uuid, text, text) TO authenticated, service_role;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if triggers are set up
SELECT trigger_name, event_manipulation, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'users'
ORDER BY trigger_name;

-- Check if functions exist
SELECT routine_name, routine_type, routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%profile%'
ORDER BY routine_name;

-- Count users by role
SELECT 
  role,
  COUNT(*) as total,
  TO_CHAR(MAX(created_at), 'YYYY-MM-DD HH:MM:SS') as latest_created
FROM public.profiles
GROUP BY role
ORDER BY role;

-- Show most recent orangtua registrations
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
WHERE role = 'orangtua'
ORDER BY created_at DESC
LIMIT 20;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically create profile entry when user signs up. Default role is orangtua for registration form users. The role is set from user metadata or defaults to orangtua if not specified.';
COMMENT ON FUNCTION public.get_or_create_profile(uuid, text, text) IS 'Get existing profile or create new one if not exists. Default role parameter is orangtua for registration form users.';
