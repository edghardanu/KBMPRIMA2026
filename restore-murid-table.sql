-- ============================================
-- RESTORE: Tabel MURID dan RLS Policies
-- Author: GitHub Copilot
-- Date: 2026-03-06
-- ============================================
-- Tujuan: Restore tabel murid dan settings yang terhapus

-- ============================================
-- 4. MURID (Students)
-- ============================================
CREATE TABLE IF NOT EXISTS public.murid (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  tanggal_lahir DATE,
  alamat TEXT DEFAULT '',
  whatsapp_ortu TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. MURID_ORANGTUA (Parent-child link)
-- ============================================
CREATE TABLE IF NOT EXISTS public.murid_orangtua (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  murid_id UUID NOT NULL REFERENCES public.murid(id) ON DELETE CASCADE,
  orangtua_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(murid_id, orangtua_id)
);

-- ============================================
-- Enable RLS on MURID tables
-- ============================================
ALTER TABLE public.murid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid_orangtua ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies untuk MURID
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Murid readable by all" ON public.murid;
DROP POLICY IF EXISTS "Admin can manage murid" ON public.murid;
DROP POLICY IF EXISTS "Murid-Orangtua readable by all" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Admin can manage murid_orangtua" ON public.murid_orangtua;

-- Create policies
CREATE POLICY "Murid readable by all" ON public.murid
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage murid" ON public.murid
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Murid-Orangtua: readable by all authenticated, manageable by admin
CREATE POLICY "Murid-Orangtua readable by all" ON public.murid_orangtua
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage murid_orangtua" ON public.murid_orangtua
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- Verify the tables and policies are created
-- ============================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('murid', 'murid_orangtua');
-- SELECT * FROM pg_policies WHERE tablename IN ('murid', 'murid_orangtua');
