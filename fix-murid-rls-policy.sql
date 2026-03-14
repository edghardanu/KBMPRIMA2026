-- ============================================
-- FIX: Update RLS Policy untuk Murid Table
-- Author: GitHub Copilot
-- Date: 2026-03-06
-- ============================================
-- Issue: Orangtua users cannot insert murid records due to RLS
-- Solution: Allow orangtua and pengurus roles to insert murid data

-- First, drop the old conflicting policy
DROP POLICY IF EXISTS "Admin can manage murid" ON public.murid;

-- Add new policies that allow admin, pengurus, and orangtua
CREATE POLICY "Admin and Pengurus can manage murid" ON public.murid
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'pengurus')));

CREATE POLICY "Orangtua can insert murid" ON public.murid
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'orangtua' OR role = 'admin' OR role = 'pengurus')));

-- Verify the policies are in place
-- SELECT * FROM pg_policies WHERE tablename = 'murid';
