-- ============================================
-- SUPABASE SCHEMA: Web Monitoring KBM Prima
-- Updated: March 2026
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (linked to auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
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
CREATE TABLE IF NOT EXISTS public.jenjang (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL UNIQUE,
  deskripsi TEXT DEFAULT '',
  urutan INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default jenjang (only if not exists)
INSERT INTO public.jenjang (nama, deskripsi, urutan) VALUES
  ('TK', 'Taman Kanak-kanak', 1),
  ('PAUD', 'Pendidikan Anak Usia Dini', 2),
  ('CABERAWIT', 'Caberawit', 3),
  ('GENERUS', 'Generus', 4),
  ('USIA MENIKAH', 'Usia Menikah', 5)
ON CONFLICT (nama) DO NOTHING;

-- ============================================
-- 3. KELAS (Classes per jenjang)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  guru_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- 5. MURID_FORMS (Form registrasi murid dengan token)
-- ============================================
CREATE TABLE IF NOT EXISTS public.murid_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_murid_forms_token ON public.murid_forms(token);
CREATE INDEX IF NOT EXISTS idx_murid_forms_deadline ON public.murid_forms(deadline);

-- ============================================
-- 6. MURID_ORANGTUA (Parent-child link)
-- ============================================
CREATE TABLE IF NOT EXISTS public.murid_orangtua (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  murid_id UUID NOT NULL REFERENCES public.murid(id) ON DELETE CASCADE,
  orangtua_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(murid_id, orangtua_id)
);

-- ============================================
-- 7. ABSENSI (Attendance)
-- ============================================
CREATE TABLE IF NOT EXISTS public.absensi (
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

CREATE INDEX IF NOT EXISTS idx_absensi_murid_tanggal ON public.absensi(murid_id, tanggal);

-- ============================================
-- 8. MATERI (Subjects / Materials per jenjang)
-- ============================================
CREATE TABLE IF NOT EXISTS public.materi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  deskripsi TEXT DEFAULT '',
  jenjang_id UUID NOT NULL REFERENCES public.jenjang(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 9. TARGET_MATERI (Per-student material progress)
-- ============================================
CREATE TABLE IF NOT EXISTS public.target_materi (
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
-- 10. KENDALA (Issues from teacher)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kendala (
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
-- 11. SARAN (Suggestions from teacher)
-- ============================================
CREATE TABLE IF NOT EXISTS public.saran (
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
-- TRIGGERS: Auto-create profile on signup
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_role TEXT;
BEGIN
    -- Extract from metadata or use defaults
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1),
        'User'
    );
    
    user_role := COALESCE(
        (NEW.raw_user_meta_data->>'role'),
        'pending'
    );
    
    -- Validate role
    IF user_role NOT IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending') THEN
        user_role := 'pending';
    END IF;
    
    -- Insert profile
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_role,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        updated_at = NOW();
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Get or create profile (fallback)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_or_create_profile(
    user_id UUID,
    user_email TEXT,
    user_role TEXT DEFAULT 'pending'
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
LANGUAGE SQL
AS $$
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        user_id,
        user_email,
        split_part(user_email, '@', 1),
        CASE 
            WHEN user_role NOT IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending') THEN 'pending'
            ELSE user_role
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW()
    RETURNING id, email, full_name, role, created_at, updated_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_profile(UUID, TEXT, TEXT) TO anon;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jenjang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murid_orangtua ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_materi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kendala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saran ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES: Permissive read, auth required for write
-- ============================================

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- JENJANG: Readable by all, manageable by admin
-- ============================================

DROP POLICY IF EXISTS "Jenjang readable by all" ON public.jenjang;
DROP POLICY IF EXISTS "Admin can manage jenjang" ON public.jenjang;

CREATE POLICY "jenjang_select_all" ON public.jenjang
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "jenjang_admin" ON public.jenjang
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- KELAS: Readable by all, manageable by admin
-- ============================================

DROP POLICY IF EXISTS "Kelas readable by all" ON public.kelas;
DROP POLICY IF EXISTS "Admin can manage kelas" ON public.kelas;

CREATE POLICY "kelas_select_all" ON public.kelas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "kelas_admin" ON public.kelas
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- MURID: Readable by all, manageable by admin
-- ============================================

DROP POLICY IF EXISTS "Murid readable by all" ON public.murid;
DROP POLICY IF EXISTS "Admin can manage murid" ON public.murid;

CREATE POLICY "murid_select_all" ON public.murid
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "murid_admin" ON public.murid
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- MURID_FORMS: Public read (for registration), admin only write
-- ============================================

DROP POLICY IF EXISTS "Murid forms readable by anon" ON public.murid_forms;
DROP POLICY IF EXISTS "Admin can manage murid_forms" ON public.murid_forms;

CREATE POLICY "murid_forms_select_public" ON public.murid_forms
    FOR SELECT TO anon USING (true);

CREATE POLICY "murid_forms_select_auth" ON public.murid_forms
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "murid_forms_admin" ON public.murid_forms
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- MURID_ORANGTUA: Readable by all, admin/orangtua can write
-- ============================================

DROP POLICY IF EXISTS "Murid-Orangtua readable by all" ON public.murid_orangtua;
DROP POLICY IF EXISTS "Admin can manage murid_orangtua" ON public.murid_orangtua;

CREATE POLICY "murid_orangtua_select_all" ON public.murid_orangtua
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "murid_orangtua_insert_admin" ON public.murid_orangtua
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "murid_orangtua_insert_user" ON public.murid_orangtua
    FOR INSERT TO authenticated
    WITH CHECK (orangtua_id = auth.uid());

-- ============================================
-- ABSENSI: Readable by all, insertable by guru/admin
-- ============================================

DROP POLICY IF EXISTS "Absensi readable by all" ON public.absensi;
DROP POLICY IF EXISTS "Guru can manage absensi" ON public.absensi;

CREATE POLICY "absensi_select_all" ON public.absensi
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "absensi_insert_guru" ON public.absensi
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

CREATE POLICY "absensi_update_guru" ON public.absensi
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

-- ============================================
-- MATERI: Readable by all, manageable by admin/guru
-- ============================================

DROP POLICY IF EXISTS "Materi readable by all" ON public.materi;
DROP POLICY IF EXISTS "Admin/Guru can manage materi" ON public.materi;

CREATE POLICY "materi_select_all" ON public.materi
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "materi_manage" ON public.materi
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'guru')));

-- ============================================
-- TARGET_MATERI: Readable by all, manageable by guru/admin
-- ============================================

DROP POLICY IF EXISTS "Target materi readable by all" ON public.target_materi;
DROP POLICY IF EXISTS "Guru can manage target_materi" ON public.target_materi;

CREATE POLICY "target_materi_select_all" ON public.target_materi
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "target_materi_manage" ON public.target_materi
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

-- ============================================
-- KENDALA: Readable by all, insertable by guru, updatable by pengurus/admin
-- ============================================

DROP POLICY IF EXISTS "Kendala readable by all" ON public.kendala;
DROP POLICY IF EXISTS "Guru can insert kendala" ON public.kendala;
DROP POLICY IF EXISTS "Pengurus can update kendala" ON public.kendala;

CREATE POLICY "kendala_select_all" ON public.kendala
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "kendala_insert_guru" ON public.kendala
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

CREATE POLICY "kendala_update_pengurus" ON public.kendala
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('pengurus', 'admin')));

-- ============================================
-- SARAN: Readable by all, insertable by guru, updatable by pengurus/admin
-- ============================================

DROP POLICY IF EXISTS "Saran readable by all" ON public.saran;
DROP POLICY IF EXISTS "Guru can insert saran" ON public.saran;
DROP POLICY IF EXISTS "Pengurus can update saran" ON public.saran;

CREATE POLICY "saran_select_all" ON public.saran
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "saran_insert_guru" ON public.saran
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('guru', 'admin')));

CREATE POLICY "saran_update_pengurus" ON public.saran
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('pengurus', 'admin')));

-- ============================================
-- INDEXES untuk performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_kelas_jenjang ON public.kelas(jenjang_id);
CREATE INDEX IF NOT EXISTS idx_murid_jenjang ON public.murid(jenjang_id);
CREATE INDEX IF NOT EXISTS idx_murid_kelas ON public.murid(kelas_id);
CREATE INDEX IF NOT EXISTS idx_murid_orangtua_murid ON public.murid_orangtua(murid_id);
CREATE INDEX IF NOT EXISTS idx_murid_orangtua_orangtua ON public.murid_orangtua(orangtua_id);
CREATE INDEX IF NOT EXISTS idx_materi_jenjang ON public.materi(jenjang_id);
CREATE INDEX IF NOT EXISTS idx_target_materi_murid ON public.target_materi(murid_id);
CREATE INDEX IF NOT EXISTS idx_absensi_kelas ON public.absensi(kelas_id);
CREATE INDEX IF NOT EXISTS idx_kendala_jenjang ON public.kendala(jenjang_id);
CREATE INDEX IF NOT EXISTS idx_saran_jenjang ON public.saran(jenjang_id);

-- ============================================
-- COMMIT
-- ============================================

COMMIT;
