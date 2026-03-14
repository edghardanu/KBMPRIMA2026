-- Tambahkan kolom `jadwal` tipe `jsonb` ke tabel `proposal_kegiatan`
ALTER TABLE public.proposal_kegiatan 
ADD COLUMN jadwal jsonb;
