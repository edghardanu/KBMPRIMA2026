-- ============================================
-- REAL-TIME DIAGNOSTIC: Check Registration Status
-- Run this AFTER attempting registration to diagnosis issues
-- ============================================

-- ============================================
-- PART 1: Check if trigger is working
-- ============================================

-- 1.1 Verify trigger exists and is enabled
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  enabled
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- 1.2 Verify trigger function exists
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proisstrict as is_strict
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- PART 2: Check recent registrations
-- ============================================

-- 2.1 List ALL recent users in auth (last 20)
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'role' as role_from_metadata,
  raw_user_meta_data->>'full_name' as full_name_from_metadata,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 2.2 List all recent profiles (last 20)
SELECT 
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 2.3 Find MISSING profiles (users in auth but not in profiles)
-- THIS IS THE PROBLEM IF YOU SEE RESULTS HERE
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as auth_created_at,
  u.raw_user_meta_data->>'role' as metadata_role,
  p.id as profile_id,
  p.role as profile_role,
  CASE 
    WHEN p.id IS NULL THEN '❌ MISSING - Trigger did not fire'
    WHEN p.role IS NULL THEN '⚠️  Profile exists but role is NULL'
    WHEN p.role != COALESCE(u.raw_user_meta_data->>'role', 'orangtua') THEN '⚠️  Role mismatch'
    ELSE '✅ OK'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;

-- ============================================
-- PART 3: Check murid data
-- ============================================

-- 3.1 List recent murid records (last 20)
SELECT 
  id,
  nama,
  jenjang_id,
  kelas_id,
  alamat,
  is_active,
  created_at
FROM public.murid
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 3.2 Check murid_orangtua links (last 20)
SELECT 
  mo.id,
  mo.murid_id,
  mo.orangtua_id,
  m.nama as murid_nama,
  p.email as orangtua_email,
  p.full_name as orangtua_nama,
  mo.created_at
FROM public.murid_orangtua mo
LEFT JOIN public.murid m ON m.id = mo.murid_id
LEFT JOIN public.profiles p ON p.id = mo.orangtua_id
WHERE mo.created_at > NOW() - INTERVAL '24 hours'
ORDER BY mo.created_at DESC
LIMIT 20;

-- 3.3 Find orphaned murid (no orangtua link)
SELECT 
  m.id,
  m.nama,
  m.created_at,
  mo.id as link_id
FROM public.murid m
LEFT JOIN public.murid_orangtua mo ON mo.murid_id = m.id
WHERE m.created_at > NOW() - INTERVAL '24 hours'
  AND mo.id IS NULL
ORDER BY m.created_at DESC;

-- ============================================
-- PART 4: Check RLS policies
-- ============================================

-- 4.1 All RLS policies on key tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'murid', 'murid_orangtua')
ORDER BY tablename, policyname;

-- 4.2 Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'murid', 'murid_orangtua')
ORDER BY tablename;

-- ============================================
-- PART 5: Summary Statistics
-- ============================================

-- 5.1 Quick stats
SELECT 
  'auth.users' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_emails,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_records
FROM auth.users

UNION ALL

SELECT 
  'public.profiles',
  COUNT(*),
  COUNT(CASE WHEN role = 'orangtua' THEN 1 END),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END)
FROM public.profiles

UNION ALL

SELECT 
  'public.murid',
  COUNT(*),
  COUNT(CASE WHEN is_active THEN 1 END),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END)
FROM public.murid

UNION ALL

SELECT 
  'public.murid_orangtua',
  COUNT(*),
  COUNT(DISTINCT orangtua_id),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END)
FROM public.murid_orangtua;

-- ============================================
-- PART 6: Log last error (if any)
-- ============================================

-- 6.1 Check if handle_new_user function compiled ok
-- (This runs the function to check for logic errors)
-- Note: Comment out if you don't want to actually call it
/*
SELECT 
  handle_new_user();
*/

-- 6.2 Check function source code
SELECT 
  prosrc
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- INTERPRETATION GUIDE
-- ============================================

/*
LOOK FOR:

✅ GOOD SIGNS (everything working):
- Section 2.3 shows all users have profiles with status = '✅ OK'
- Section 3.1 shows murid records created
- Section 3.2 shows murid_orangtua links created
- Section 5.1 stats match (users = profiles = murid_orangtua orangtua_id)

❌ PROBLEM SIGNS:
- Section 1.1: Trigger doesn't exist → RUN COMPLETE_RLS_FIX.sql
- Section 2.3: Users have NULL profile_id → TRIGGER NOT FIRING
  Solution: Check trigger function, check RLS policies
  
- Section 2.3: Role mismatch → ROLE NOT SET CORRECTLY
  Solution: Check if metadata role passed correctly in form
  
- Section 3.3: Orphaned murid (no link) → LINK NOT CREATED
  Solution: Check RLS on murid_orangtua table
  
- Section 4.1: Missing policies → RLS POLICIES NOT SET
  Solution: RUN COMPLETE_RLS_FIX.sql again
  
- Section 4.2: rowsecurity = false → RLS NOT ENABLED
  Solution: Run ALTER TABLE ... ENABLE ROW LEVEL SECURITY
*/
