'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Kelas, Jenjang, Profile } from '@/lib/types';
import { Plus, Trash2, Edit2, School, Loader2, X } from 'lucide-react';

// Tipe untuk Kelas dengan relasi
type KelasWithRelations = Kelas & { 
  jenjang: Jenjang; 
  guru: Profile | null 
};

export default function AdminKelasPage() {
    const [kelasList, setKelasList] = useState<KelasWithRelations[]>([]);
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [guruList, setGuruList] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);

    // Form states
    const [nama, setNama] = useState('');
    const [jenjangId, setJenjangId] = useState('');
    const [guruId, setGuruId] = useState('');
    const [filterJenjang, setFilterJenjang] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const supabase = createClient();

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const [kelasRes, jenjangRes, guruRes] = await Promise.all([
                supabase
                    .from('kelas')
                    .select('*, jenjang(*), guru:profiles(*)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('jenjang')
                    .select('*')
                    .order('urutan'),
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'guru')
                    .order('full_name'),
            ]);

            if (kelasRes.error) throw kelasRes.error;
            if (jenjangRes.error) throw jenjangRes.error;
            if (guruRes.error) throw guruRes.error;

            setKelasList((kelasRes.data as KelasWithRelations[]) || []);
            setJenjangList(jenjangRes.data || []);
            setGuruList(guruRes.data || []);
            
            // Set default jenjangId jika belum ada dan jenjangList tersedia
            if (jenjangRes.data?.length && !jenjangId) {
                setJenjangId(jenjangRes.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Gagal memuat data. Silakan refresh halaman.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchData(); 
    }, []);

    // Reset form
    const resetForm = () => {
        setNama('');
        setGuruId('');
        setJenjangId(jenjangList[0]?.id || '');
        setEditingKelas(null);
        setShowForm(false);
    };

    // Handle edit - mengisi form dengan data yang akan diedit
    const handleEdit = (kelas: KelasWithRelations) => {
        setEditingKelas(kelas);
        setNama(kelas.nama);
        setJenjangId(kelas.jenjang_id);
        setGuruId(kelas.guru_id || '');
        setShowForm(true);
    };

    // Handle submit untuk tambah dan update
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validasi sederhana
        if (!nama.trim()) {
            alert('Nama kelas harus diisi');
            return;
        }
        
        if (!jenjangId) {
            alert('Jenjang harus dipilih');
            return;
        }

        setSubmitting(true);

        try {
            const kelasData = {
                nama: nama.trim(),
                jenjang_id: jenjangId,
                guru_id: guruId || null,
            };

            if (editingKelas) {
                // Update data
                const { error } = await supabase
                    .from('kelas')
                    .update(kelasData)
                    .eq('id', editingKelas.id);
                
                if (error) throw error;
                alert('Kelas berhasil diperbarui!');
            } else {
                // Insert data baru
                const { error } = await supabase
                    .from('kelas')
                    .insert([kelasData]);
                
                if (error) throw error;
                alert('Kelas baru berhasil ditambahkan!');
            }

            resetForm();
            await fetchData(); // Refresh data setelah submit
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Gagal menyimpan data. Silakan coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus kelas ini? Tindakan ini tidak dapat dibatalkan.')) return;
        
        try {
            const { error } = await supabase
                .from('kelas')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            alert('Kelas berhasil dihapus!');
            await fetchData();
        } catch (error) {
            console.error('Error deleting data:', error);
            alert('Gagal menghapus data. Silakan coba lagi.');
        }
    };

    // Filter kelas berdasarkan jenjang yang dipilih
    const filteredKelas = filterJenjang
        ? kelasList.filter((kelas) => kelas.jenjang_id === filterJenjang)
        : kelasList;

    return (
        <div className="space-y-6">
            {/* Header dengan judul dan tombol aksi */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Kelola Kelas</h2>
                    <p className="text-stone-700 text-sm">Buat dan kelola kelas per jenjang</p>
                </div>
                
                {/* Filter dan tombol tambah */}
                <div className="flex gap-3">
                    <select
                        value={filterJenjang}
                        onChange={(e) => setFilterJenjang(e.target.value)}
                        className="bg-white shadow-sm border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        aria-label="Filter berdasarkan jenjang"
                    >
                        <option value="">Semua Jenjang</option>
                        {jenjangList.map((jenjang) => (
                            <option key={jenjang.id} value={jenjang.id}>
                                {jenjang.nama}
                            </option>
                        ))}
                    </select>
                    
                    <button
                        onClick={() => {
                            resetForm();
                            setShowForm(!showForm);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25"
                    >
                        <Plus className="w-4 h-4" /> 
                        {showForm ? 'Tutup Form' : 'Tambah Kelas'}
                    </button>
                </div>
            </div>

            {/* Form tambah/edit kelas */}
            {showForm && (
                <div className="bg-white shadow-sm border border-stone-300 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-stone-900">
                            {editingKelas ? 'Edit Kelas' : 'Tambah Kelas Baru'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="text-stone-400 hover:text-stone-600 transition-colors"
                            aria-label="Tutup form"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            placeholder="Nama Kelas (contoh: Kelas 1A)"
                            required
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                        
                        <select
                            value={jenjangId}
                            onChange={(e) => setJenjangId(e.target.value)}
                            required
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="" disabled>Pilih Jenjang</option>
                            {jenjangList.map((jenjang) => (
                                <option key={jenjang.id} value={jenjang.id}>
                                    {jenjang.nama}
                                </option>
                            ))}
                        </select>
                        
                        <select
                            value={guruId}
                            onChange={(e) => setGuruId(e.target.value)}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="">Tanpa Guru Wali</option>
                            {guruList.map((guru) => (
                                <option key={guru.id} value={guru.id}>
                                    {guru.full_name}
                                </option>
                            ))}
                        </select>
                        
                        <div className="md:col-span-3 flex gap-3">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:from-emerald-500 hover:to-teal-500 transition-all"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {editingKelas ? 'Perbarui Kelas' : 'Simpan Kelas'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2.5 border border-stone-300 text-stone-700 rounded-xl text-sm hover:bg-stone-50 transition-all"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                /* Grid daftar kelas */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredKelas.map((kelas) => (
                        <div 
                            key={kelas.id} 
                            className="bg-white shadow-sm border border-stone-300 rounded-2xl p-5 hover:border-emerald-200 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
                                    <School className="w-5 h-5" />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => handleEdit(kelas)}
                                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                        title="Edit kelas"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(kelas.id)}
                                        className="text-red-600 hover:text-red-800 transition-colors p-1"
                                        title="Hapus kelas"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="text-stone-900 font-semibold text-lg mb-1">{kelas.nama}</h3>
                            
                            <p className="text-sm text-stone-700 mb-2">
                                Jenjang: <span className="text-emerald-600 font-medium">{kelas.jenjang?.nama}</span>
                            </p>
                            
                            <p className="text-sm text-stone-700">
                                Guru Wali: {kelas.guru?.full_name ? (
                                    <span className="text-stone-900 font-medium">{kelas.guru.full_name}</span>
                                ) : (
                                    <span className="text-stone-400 italic">Belum ditentukan</span>
                                )}
                            </p>
                        </div>
                    ))}
                    
                    {/* Pesan jika tidak ada data */}
                    {filteredKelas.length === 0 && (
                        <div className="col-span-full text-center py-12 text-stone-500">
                            {kelasList.length === 0 ? (
                                <>
                                    <School className="w-12 h-12 mx-auto mb-3 text-stone-400" />
                                    <p>Belum ada kelas. Klik &ldquo;Tambah Kelas&rdquo; untuk membuat kelas baru.</p>
                                </>
                            ) : (
                                <>
                                    <p>Tidak ada kelas dengan filter jenjang yang dipilih.</p>
                                    <button
                                        onClick={() => setFilterJenjang('')}
                                        className="mt-2 text-emerald-600 hover:text-emerald-700 underline"
                                    >
                                        Tampilkan semua kelas
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
