-- ============================================
-- CREATE MURID_FORMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.murid_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL UNIQUE,
    deadline TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.murid_forms ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "murid_forms are viewable by everyone" ON public.murid_forms
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage murid_forms" ON public.murid_forms
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
