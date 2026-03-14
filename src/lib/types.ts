export type Role = 'admin' | 'pengurus' | 'guru' | 'orangtua' | 'pending';

export type AbsensiStatus = 'hadir' | 'tidak_hadir' | 'izin' | 'sakit';

export type MateriStatus = 'lancar' | 'kurang_lancar';

export type ApprovalStatus = 'pending' | 'disetujui' | 'ditolak';

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: Role;
    created_at: string;
    updated_at: string;
    nama_orang_tua: string | null;
    nama_anak: string | null;
    tanggal_lahir_anak: string | null;
    jenjang_id: string | null;
}

export interface Jenjang {
    id: string;
    nama: string;
    deskripsi: string;
    urutan: number;
    created_at: string;
}

export interface Kelas {
    id: string;
    nama: string;
    jenjang_id: string;
    guru_id: string | null;
    created_at: string;
    jenjang?: Jenjang;
    guru?: Profile;
}

export interface Murid {
    id: string;
    nama: string;
    kelas_id: string;
    jenjang_id: string;
    tanggal_lahir: string | null;
    alamat: string;
    whatsapp_ortu: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    kelas?: Kelas;
    jenjang?: Jenjang;
}

export interface MuridOrangtua {
    id: string;
    murid_id: string;
    orangtua_id: string;
    created_at: string;
    murid?: Murid;
}

export interface Absensi {
    id: string;
    murid_id: string;
    kelas_id: string;
    jenjang_id: string;
    tanggal: string;
    status: AbsensiStatus;
    keterangan: string;
    created_by: string | null;
    created_at: string;
    murid?: Murid;
    kelas?: Kelas;
    jenjang?: Jenjang;
}

export interface Materi {
    id: string;
    nama: string;
    deskripsi: string;
    jenjang_id: string;
    created_at: string;
    jenjang?: Jenjang;
}

export interface TargetMateri {
    id: string;
    murid_id: string;
    materi_id: string;
    kelas_id: string;
    jenjang_id: string;
    status: MateriStatus;
    catatan: string;
    tanggal: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    murid?: Murid;
    materi?: Materi;
    kelas?: Kelas;
    jenjang?: Jenjang;
}

export interface Kendala {
    id: string;
    judul: string;
    deskripsi: string;
    jenjang_id: string;
    kelas_id: string | null;
    status: ApprovalStatus;
    catatan_pengurus: string;
    created_by: string;
    reviewed_by: string | null;
    created_at: string;
    updated_at: string;
    jenjang?: Jenjang;
    kelas?: Kelas;
    creator?: Profile;
}

export interface Saran {
    id: string;
    judul: string;
    deskripsi: string;
    jenjang_id: string;
    kelas_id: string | null;
    status: ApprovalStatus;
    catatan_pengurus: string;
    created_by: string;
    reviewed_by: string | null;
    created_at: string;
    updated_at: string;
    jenjang?: Jenjang;
    kelas?: Kelas;
    creator?: Profile;
}

export type ProposalStatus = 'draft' | 'submitted' | 'disetujui' | 'revisi' | 'ditolak';

export interface ProposalJadwal {
    nama_kegiatan: string;
    waktu_kegiatan: string;
    penanggung_jawab: string;
    tempat: string;
}

export interface ProposalAnggaran {
    item: string;
    jumlah: number;
    satuan: string;
    harga_satuan: number;
    total: number;
}

export interface ProposalKegiatan {
    id: string;
    judul: string;
    jenjang_id: string;
    tanggal_kegiatan: string;
    tempat: string;
    pendahuluan: string;
    jadwal: ProposalJadwal[];
    tujuan: string;
    manfaat: string;
    anggaran: ProposalAnggaran[];
    total_anggaran: number;
    penutup: string;
    status: ProposalStatus;
    catatan_pengurus: string;
    created_by: string;
    reviewed_by: string | null;
    created_at: string;
    updated_at: string;
    jenjang?: Jenjang;
    creator?: Profile;
    reviewer?: Profile;
}

