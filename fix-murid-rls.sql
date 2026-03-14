-- ============================================
-- SQL REPAIR: Ensure Tables and RLS Policies
-- ============================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Helper function for recursive-safe role checking
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(current_role, 'anon');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure Core Tables Exist (Safe if they already exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'pending' CHECK (role IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.jenjang (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL UNIQUE,
  deskripsi TEXT DEFAULT '',
  urutan INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  guru_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.murid (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  tanggal_lahir DATE,
  alamat TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.murid_orangtua (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  murid_id UUID NOT NULL REFERENCES public.murid(id) ON DELETE CASCADE,
  orangtua_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(murid_id, orangtua_id)
);

CREATE TABLE IF NOT EXISTS public.murid_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token UUID NOT NULL DEFAULT uuid_generate_v4(),
  deadline TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jenjang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid_orangtua ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid_forms ENABLE ROW LEVEL SECURITY;

-- 4. Apply Robust RLS Policies for Murid
DROP POLICY IF EXISTS "Murid readable by all" ON public.murid;
CREATE POLICY "Murid readable by all" ON public.murid FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert murid" ON public.murid;
CREATE POLICY "Public can insert murid" ON public.murid FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can manage murid" ON public.murid;
CREATE POLICY "Staff can manage murid" ON public.murid FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'pengurus', 'guru'));

-- 5. Apply Robust RLS Policies for Murid-Orangtua
DROP POLICY IF EXISTS "Murid-Orangtua readable by all" ON public.murid_orangtua;
CREATE POLICY "Murid-Orangtua readable by all" ON public.murid_orangtua FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert murid_orangtua" ON public.murid_orangtua;
CREATE POLICY "Public can insert murid_orangtua" ON public.murid_orangtua FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can manage murid_orangtua" ON public.murid_orangtua;
CREATE POLICY "Staff can manage murid_orangtua" ON public.murid_orangtua FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'pengurus', 'guru'));

-- 6. Apply Robust RLS Policies for Murid Forms
DROP POLICY IF EXISTS "Public can read murid_forms" ON public.murid_forms;
CREATE POLICY "Public can read murid_forms" ON public.murid_forms FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admin can insert murid_forms" ON public.murid_forms;
CREATE POLICY "Admin can insert murid_forms" ON public.murid_forms FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin can update murid_forms" ON public.murid_forms;
CREATE POLICY "Admin can update murid_forms" ON public.murid_forms FOR UPDATE TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin can delete murid_forms" ON public.murid_forms;
CREATE POLICY "Admin can delete murid_forms" ON public.murid_forms FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin can manage murid_forms" ON public.murid_forms;
