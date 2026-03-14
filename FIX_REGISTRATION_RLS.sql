-- ============================================
-- FIX: RLS Policies untuk Pendaftaran Siswa
-- Issue: Form stuck saat penyimpanan data
-- Solution: Update RLS policies agar public dapat insert
-- ============================================

-- 1. Ensure profiles table allows profile creation during signup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old conflicting policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Guru can read related profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert their own profile" ON public.profiles;

-- Allow anyone (including newly signed up users) to insert their own profile
CREATE POLICY "Anyone can insert profile during signup" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow admin to read all profiles
CREATE POLICY "Admin can read all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Ensure murid table allows public inserts (for registration form)
ALTER TABLE public.murid ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Murid readable by all" ON public.murid;
DROP POLICY IF EXISTS "Public can insert murid" ON public.murid;
DROP POLICY IF EXISTS "Staff can manage murid" ON public.murid;

-- Anyone can read murid
CREATE POLICY "Murid readable by all" ON public.murid
  FOR SELECT
  USING (true);

-- Anyone authenticated can insert murid (for registration form)
CREATE POLICY "Authenticated can insert murid" ON public.murid
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin and pengurus can manage murid
CREATE POLICY "Staff can manage murid" ON public.murid
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus')
    )
  );

-- 3. Ensure murid_orangtua table allows inserts
ALTER TABLE public.murid_orangtua ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Murid-Orangtua readable by all" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Public can insert murid_orangtua" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Staff can manage murid_orangtua" ON public.murid_orangtua;

-- Anyone can read murid_orangtua
CREATE POLICY "Murid-Orangtua readable by all" ON public.murid_orangtua
  FOR SELECT
  USING (true);

-- Anyone authenticated can insert murid_orangtua
CREATE POLICY "Authenticated can insert murid_orangtua" ON public.murid_orangtua
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Staff can manage murid_orangtua
CREATE POLICY "Staff can manage murid_orangtua" ON public.murid_orangtua
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'pengurus', 'guru')
    )
  );

-- 4. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('profiles', 'murid', 'murid_orangtua');

-- 5. List all policies for these tables
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'murid', 'murid_orangtua')
ORDER BY tablename, cmd;

COMMENT ON TABLE public.profiles IS 'User profiles with RLS for registration and auth';
COMMENT ON TABLE public.murid IS 'Student records with public read/authenticated INSERT for registration';
COMMENT ON TABLE public.murid_orangtua IS 'Parent-student relationships with authenticated INSERT for registration';
