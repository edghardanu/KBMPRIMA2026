-- ============================================
-- DIAGNOSTIC IMMEDIATE: Debug Registrasi Gagal
-- Jalankan sekarang untuk lihat apa masalahnya
-- ============================================

-- 1. Cek apakah trigger exists dan enabled
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_schema = 'auth';

-- 2. Cek function trigger
SELECT 
  proname,
  prosecdef as is_security_definer,
  prosrc
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. CRITICAL: Lihat users TERAKHIR di auth.users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'role' as role_metadata,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 3;

-- 4. CRITICAL: Lihat profiles yang TIDAK cocok dengan auth.users
-- INI AKAN MENUNJUKKAN MISSING PROFILES
SELECT 
  u.id as user_id,
  u.email,
  u.created_at,
  CASE WHEN p.id IS NULL THEN '❌ PROFILE MISSING!' ELSE '✅ OK' END as status,
  p.id as profile_id,
  p.role as profile_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.created_at > NOW() - INTERVAL '1 hour'
ORDER BY u.created_at DESC;

-- 5. Lihat RLS policies pada profiles table
SELECT 
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Lihat RLS policies pada murid_orangtua table
SELECT 
  policyname,
  permissive,
  cmd,
  qual  
FROM pg_policies
WHERE tablename = 'murid_orangtua'
ORDER BY policyname;

-- 7. Cek apakah profiles table punya RLS enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'murid_orangtua');

-- 8. Statistical summary
SELECT 
  'auth.users' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_1h
FROM auth.users
UNION ALL
SELECT
  'public.profiles',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END)
FROM public.profiles
UNION ALL
SELECT
  'public.murid',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END)
FROM public.murid
UNION ALL
SELECT
  'public.murid_orangtua',
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END)
FROM public.murid_orangtua;
