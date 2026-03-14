-- ============================================
-- COMPREHENSIVE DIAGNOSTIC: Find Step 4 Issue
-- Run ini dan kirim hasil semua queries
-- ============================================

-- ============================================
-- SECTION 1: Check Database Structure
-- ============================================

-- 1.1 Check murid_orangtua table exists and schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'murid_orangtua'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.2 Check foreign key constraints on murid_orangtua
SELECT
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.key_column_usage
WHERE table_name = 'murid_orangtua'
  AND table_schema = 'public';

-- ============================================
-- SECTION 2: Check User & Profile Exist
-- ============================================

-- 2.1 Show LATEST users in auth.users (last 5)
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'role' as role_in_metadata
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2.2 Show LATEST profiles in public.profiles (last 5)
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- 2.3 CRITICAL: Check for MISSING profiles
-- If this shows ANY results, trigger is NOT firing
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as auth_created,
  CASE WHEN p.id IS NULL THEN '❌ MISSING PROFILE!' ELSE '✅ OK' END as status,
  p.id as profile_id,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id  
WHERE u.created_at > NOW() - INTERVAL '2 hours'
ORDER BY u.created_at DESC
LIMIT 10;

-- ============================================
-- SECTION 3: Check RLS Policies
-- ============================================

-- 3.1 Check ALL policies on murid_orangtua table
SELECT 
  policyname,
  permissive,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'murid_orangtua'
  AND schemaname = 'public'
ORDER BY policyname;

-- 3.2 Check if murid_orangtua table has RLS enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'murid_orangtua'
  AND schemaname = 'public';

-- 3.3 Check ALL policies on profiles table (for comparison)
SELECT 
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
ORDER BY policyname;

-- 3.4 Check ALL policies on murid table (for comparison)
SELECT 
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'murid'
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================
-- SECTION 4: Check Trigger Setup
-- ============================================

-- 4.1 Verify trigger exists and is enabled
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- 4.2 Check trigger function source code
SELECT 
  proname,
  prosecdef as is_security_definer,
  prosrc
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- SECTION 5: Check Murid & Linking Data
-- ============================================

-- 5.1 Show recent murid records
SELECT 
  id,
  nama,
  jenjang_id,
  kelas_id,
  created_at
FROM public.murid
ORDER BY created_at DESC
LIMIT 5;

-- 5.2 Show recent murid_orangtua records
SELECT 
  mo.id,
  mo.murid_id,
  mo.orangtua_id,
  m.nama as murid_nama,
  p.email as parent_email,
  mo.created_at
FROM public.murid_orangtua mo
LEFT JOIN public.murid m ON m.id = mo.murid_id
LEFT JOIN public.profiles p ON p.id = mo.orangtua_id
ORDER BY mo.created_at DESC
LIMIT 5;

-- 5.3 Check for ORPHANED murid (no parent link created)
SELECT 
  m.id as murid_id,
  m.nama,
  m.created_at as murid_created,
  mo.id as link_id,
  CASE WHEN mo.id IS NULL THEN '❌ NO LINK' ELSE '✅ LINKED' END as status
FROM public.murid m
LEFT JOIN public.murid_orangtua mo ON mo.murid_id = m.id
WHERE m.created_at > NOW() - INTERVAL '2 hours'
ORDER BY m.created_at DESC;

-- ============================================
-- SECTION 6: Summary Statistics 
-- ============================================

SELECT 
  'auth.users' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '2 hours' THEN 1 END) as last_2h
FROM auth.users

UNION ALL

SELECT 
  'public.profiles',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '2 hours' THEN 1 END)
FROM public.profiles

UNION ALL

SELECT 
  'public.murid',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '2 hours' THEN 1 END)
FROM public.murid

UNION ALL

SELECT 
  'public.murid_orangtua',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '2 hours' THEN 1 END)
FROM public.murid_orangtua;

-- ============================================
-- SECTION 7: Manual Test - Try Insert
-- ============================================

-- 7.1 Get latest user and murid that exist
-- Use this to manually test if insert works
/*
SELECT 
  u.id as user_id,
  u.email,
  m.id as murid_id,
  m.nama
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.murid m ON TRUE
WHERE u.created_at > NOW() - INTERVAL '2 hours'
  AND p.id IS NOT NULL
  AND m.id IS NOT NULL
ORDER BY u.created_at DESC, m.created_at DESC
LIMIT 1;
*/

-- After getting user_id and murid_id from above, try:
-- INSERT INTO public.murid_orangtua (murid_id, orangtua_id)
-- VALUES ('murid_id_from_above', 'user_id_from_above');
-- This will show IF the insert can actually work

-- ============================================
-- INTERPRETATION GUIDE
-- ============================================

/*
WHAT TO LOOK FOR:

✅ GOOD SIGNS:
- Section 2.3: All users show "✅ OK" status
  → Trigger is firing correctly, profiles are created
- Section 3.1: Shows "Authenticated can insert murid_orangtua" policy
  → RLS policy exists and should allow insert
- Section 5.2: Shows data in murid_orangtua
  → Insert is working
- Section 5.3: Shows ALL murid have "✅ LINKED" status
  → No orphaned murid

❌ PROBLEM SIGNS:
- Section 2.3: Shows "❌ MISSING PROFILE" 
  → TRIGGER NOT FIRING! Run COMPLETE_RLS_FIX.sql again
  
- Section 3.1: Shows NO policies or wrong policies
  → RLS not setup correctly, run COMPLETE_RLS_FIX.sql
  
- Section 3.2: Shows "false" for rls_enabled
  → RLS disabled on table, needs enable + policies
  
- Section 5.3: Shows "❌ NO LINK" 
  → Insert to murid_orangtua is failing - this is Step 4 error!
  → Check Step 4 error message and RLS policy
  
- Section 4.1: Shows NO trigger result
  → Trigger doesn't exist! Run COMPLETE_RLS_FIX.sql
  
- Section 1.1: Shows different column names or missing columns
  → Schema mismatch with form
*/
