-- ============================================
-- SUPABASE SCHEMA: Web Monitoring KBM
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (linked to auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'pending' CHECK (role IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. JENJANG (Education Levels)
-- ============================================
CREATE TABLE public.jenjang (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL UNIQUE,
  deskripsi TEXT DEFAULT '',
  urutan INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default jenjang
INSERT INTO public.jenjang (nama, deskripsi, urutan) VALUES
  ('TK', 'Taman Kanak-kanak', 1),
  ('PAUD', 'Pendidikan Anak Usia Dini', 2),
  ('CABERAWIT', 'Caberawit', 3),
  ('GENERUS', 'Generus', 4),
  ('USIA MENIKAH', 'Usia Menikah', 5);

-- ============================================
-- 3. KELAS (Classes per jenjang)
-- ============================================
CREATE TABLE public.kelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  guru_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. MURID (Students)
-- ============================================
CREATE TABLE public.murid (
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
CREATE TABLE public.murid_orangtua (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  murid_id UUID NOT NULL REFERENCES public.murid(id) ON DELETE CASCADE,
  orangtua_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(murid_id, orangtua_id)
);

-- ============================================
-- 6. ABSENSI (Attendance)
-- ============================================
CREATE TABLE public.absensi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  murid_id UUID NOT NULL REFERENCES public.murid(id) ON DELETE CASCADE,
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('hadir', 'tidak_hadir', 'izin', 'sakit')),
  keterangan TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 7. MATERI (Subjects / Materials per jenjang)
-- ============================================
CREATE TABLE public.materi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  deskripsi TEXT DEFAULT '',
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 8. TARGET_MATERI (Per-student material progress)
-- ============================================
CREATE TABLE public.target_materi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  murid_id UUID NOT NULL REFERENCES public.murid(id) ON DELETE CASCADE,
  materi_id UUID NOT NULL REFERENCES public.materi(id) ON DELETE CASCADE,
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('lancar', 'kurang_lancar')),
  catatan TEXT DEFAULT '',
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 9. KENDALA (Issues from teacher)
-- ============================================
CREATE TABLE public.kendala (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'disetujui', 'ditolak')),
  catatan_pengurus TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 10. SARAN (Suggestions from teacher)
-- ============================================
CREATE TABLE public.saran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'disetujui', 'ditolak')),
  catatan_pengurus TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jenjang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid_orangtua ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_materi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kendala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saran ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, only admin can update roles
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Jenjang: readable by all authenticated, manageable by admin
CREATE POLICY "Jenjang readable by all" ON public.jenjang
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage jenjang" ON public.jenjang
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Kelas: readable by all authenticated, manageable by admin
CREATE POLICY "Kelas readable by all" ON public.kelas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage kelas" ON public.kelas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Murid: readable by all authenticated, manageable by admin
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

-- Absensi: readable by all authenticated, insertable by guru
CREATE POLICY "Absensi readable by all" ON public.absensi
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guru can manage absensi" ON public.absensi
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

-- Materi: readable by all authenticated, manageable by admin/guru
CREATE POLICY "Materi readable by all" ON public.materi
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Guru can manage materi" ON public.materi
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'guru')));

-- Target Materi: readable by all authenticated, manageable by guru
CREATE POLICY "Target materi readable by all" ON public.target_materi
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guru can manage target_materi" ON public.target_materi
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

-- Kendala: readable by all authenticated, insertable by guru, updatable by pengurus
CREATE POLICY "Kendala readable by all" ON public.kendala
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guru can insert kendala" ON public.kendala
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

CREATE POLICY "Pengurus can update kendala" ON public.kendala
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('pengurus', 'admin')));

-- Saran: readable by all authenticated, insertable by guru, updatable by pengurus
CREATE POLICY "Saran readable by all" ON public.saran
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guru can insert saran" ON public.saran
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

CREATE POLICY "Pengurus can update saran" ON public.saran
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('pengurus', 'admin')));
