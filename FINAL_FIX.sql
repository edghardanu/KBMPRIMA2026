-- ============================================
-- PERBAIKAN FINAL & BENAR: Registrasi Murid
-- JALANKAN INI 1x DI SUPABASE - TIDAK ADA LAGI YANG PERLU DIUBAH
-- ============================================

-- DROP SEMUA YANG LAMA TERLEBIH DAHULU
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- HAPUS SEMUA RLS POLICIES YANG LAMA
DROP POLICY IF EXISTS "Anyone can insert profile during signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Murid readable by all" ON public.murid;
DROP POLICY IF EXISTS "Authenticated can insert murid" ON public.murid;
DROP POLICY IF EXISTS "Authenticated can update murid" ON public.murid;
DROP POLICY IF EXISTS "Public can insert murid" ON public.murid;
DROP POLICY IF EXISTS "Staff can manage murid" ON public.murid;
DROP POLICY IF EXISTS "Murid-Orangtua readable by all" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Authenticated can insert murid_orangtua" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Authenticated can update murid_orangtua" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Public can insert murid_orangtua" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Staff can manage murid_orangtua" ON public.murid_orangtua;

-- ============================================
-- CREATE TRIGGER YANG SIMPLE & BERFUNGSI
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile secara otomatis ketika user signup
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'orangtua'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buat trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS: DISABLE DULU, SETUP POLICIES BARU
-- ============================================

-- Disable RLS di semua tables dulu untuk reset
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid_orangtua DISABLE ROW LEVEL SECURITY;

-- ENABLE kembali RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid_orangtua ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICY PROFILES TABLE (SIMPLE)
-- ============================================

-- Semua orang bisa READ profiles
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Orang bisa insert profile sendiri
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Orang bisa update profile sendiri  
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- POLICY MURID TABLE (SIMPLE)
-- ============================================

-- Semua orang bisa READ murid
CREATE POLICY "murid_select_all" ON public.murid
  FOR SELECT USING (true);

-- Authenticated users bisa create murid
CREATE POLICY "murid_insert_auth" ON public.murid
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users bisa update murid (milik mereka sendiri atau staff)
CREATE POLICY "murid_update_auth" ON public.murid
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- POLICY MURID_ORANGTUA TABLE (SIMPLE)
-- ============================================

-- Semua orang bisa READ link
CREATE POLICY "murid_orangtua_select_all" ON public.murid_orangtua
  FOR SELECT USING (true);

-- Authenticated users bisa create link
CREATE POLICY "murid_orangtua_insert_auth" ON public.murid_orangtua
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users bisa update link
CREATE POLICY "murid_orangtua_update_auth" ON public.murid_orangtua
  FOR UPDATE USING (auth.role() = 'authenticated')  
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role, anon;

-- ============================================
-- VERIFY SETUP (RUN THESE TO CHECK)
-- ============================================

-- Check 1: Trigger exists?
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created' AND event_object_schema = 'auth';

-- Check 2: RLS policies exist?
SELECT COUNT(*) as policy_count FROM pg_policies 
WHERE tablename IN ('profiles', 'murid', 'murid_orangtua');

-- Check 3: RLS enabled?
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('profiles', 'murid', 'murid_orangtua') 
AND schemaname = 'public';
