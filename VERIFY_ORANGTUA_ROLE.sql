-- ============================================
-- Verify & Enforce Orangtua Role Assignment
-- ============================================
-- This script verifies that all users registered from form have 'orangtua' role
-- and ensures proper RLS policies for orangtua users

-- 1. Check current role distribution
SELECT 
  role,
  COUNT(*) as count,
  TO_CHAR(MAX(created_at), 'YYYY-MM-DD HH:MM:SS') as last_created
FROM public.profiles
GROUP BY role
ORDER BY count DESC;

-- 2. List all orangtua users
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
WHERE role = 'orangtua'
ORDER BY created_at DESC;

-- 3. Verify profiles table has RLS enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 4. Check RLS policies for profiles table
SELECT 
  policyname,
  permissive,
  roles,
  qual,
  with_check,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 5. Verify trigger is active
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_orientation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_schema = 'public';

-- 6. Verify function exists
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- 7. Check if any profiles have NULL or empty role
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
WHERE role IS NULL OR role = '' OR role NOT IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending')
ORDER BY created_at DESC;

-- 8. Summary report
WITH role_counts AS (
  SELECT 
    role,
    COUNT(*) as count
  FROM public.profiles
  GROUP BY role
),
total AS (
  SELECT COUNT(*) as total FROM public.profiles
)
SELECT 
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'orangtua') as orangtua_count,
  (SELECT COUNT(*) FROM total) as total_profiles,
  ROUND(
    100.0 * (SELECT COUNT(*) FROM public.profiles WHERE role = 'orangtua') / 
    (SELECT COUNT(*) FROM total),
    2
  ) as orangtua_percentage;

-- 9. Test: Check if new orangtua user can see their own profile
-- RUN AFTER CREATING TEST ACCOUNT:
-- SELECT * FROM public.profiles 
-- WHERE auth.uid() = id AND role = 'orangtua';

COMMENT ON TABLE public.profiles IS 'User profiles with automatic role assignment. Registration form users automatically get orangtua role.';
