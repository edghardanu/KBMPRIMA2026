-- ============================================
-- DIAGNOSTIC: Debug Profile Masuk Database
-- Jalankan script ini untuk mengidentifikasi masalah
-- ============================================

-- 1. Cek status trigger
-- Harusnya ada 1 trigger bernama "on_auth_user_created"
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'auth.users'
  AND trigger_name = 'on_auth_user_created';

-- 2. Cek function trigger exists
SELECT 
  proname as function_name,
  pronamespace::regnamespace as schema,
  pronargs as num_args
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Lihat seluruh RLS policies di profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. Cek apakah profiles table punya RLS enabled
SELECT 
  tableName,
  rowLevelSecurity
FROM (
  SELECT
    t.tablename as tableName,
    (t.relrowsecurity)::text as rowLevelSecurity
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE t.tablename = 'profiles'
    AND n.nspname = 'public'
) sub;

-- 5. List semua users di auth.users (cek apakah ada user baru)
SELECT id, email, raw_user_meta_data->>'role' as role, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 6. Cek profiles table - apakah ada entry untuk users terbaru
SELECT id, email, full_name, role, created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- 7. Schema profiles table - cek constraint dan tipe data
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Jalankan fungsi handle_new_user secara manual untuk test
-- Sebelum ini, buat user test di auth.users dulu untuk test
-- Uncomment bagian ini jika ingin manual test:
/*
SELECT handle_new_user();
*/

-- 9. Cek metadata user - apakah role ada di metadata
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
WHERE email = 'test@example.com';  -- Ganti dengan email user yang baru register

-- 10. Cek apakah ada error atau log di database
-- Note: Ini hanya akan menampilkan jika ada custom logging
SELECT
  *
FROM pg_stat_statements
WHERE query LIKE '%handle_new_user%'
LIMIT 5;
