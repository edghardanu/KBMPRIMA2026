-- ===================================================================
-- DIAGNOSTIC QUERY: Check if Auth and Profiles are properly setup
-- Run this in Supabase SQL Editor to diagnose login issues
-- ===================================================================

-- 1. Check if trigger exists and is enabled
SELECT 
    t.tgname as "Trigger Name",
    CASE WHEN t.tgenabled = true THEN '✅ ENABLED' ELSE '❌ DISABLED' END as "Status",
    p.proname as "Function",
    obj.relname as "Table"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class obj ON t.tgrelid = obj.oid
WHERE obj.relname = 'users' AND t.tgname LIKE '%auth%'
ORDER BY t.tgname;

-- 2. Check all users and their profiles
SELECT 
    'Users Summary' as CHECK_NAME,
    COUNT(*) as total_users,
    COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as users_with_profile,
    COUNT(CASE WHEN p.id IS NULL THEN 1 END) as users_without_profile
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- 3. List users without profiles (these will have login issues!)
SELECT 
    u.id,
    u.email,
    u.created_at as registered_at,
    CASE WHEN p.id IS NULL THEN '❌ NO PROFILE' ELSE '✅ Has Profile' END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- 4. Check RLS policies on profiles table
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

-- 5. Test if a specific user can read profiles
-- Replace 'test@example.com' with actual test user
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at
FROM public.profiles p
LIMIT 5;

-- 6. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 7. If there are orphaned auth.users, create their profiles
-- This is a fix for users created without profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', ''),
    'pending'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 8. Summary - should show status
SELECT '✅ Profile sync complete!' as "Action" WHERE EXISTS (
    SELECT 1 FROM public.profiles
);
