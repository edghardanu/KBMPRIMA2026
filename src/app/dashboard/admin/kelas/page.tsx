'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Kelas, Jenjang, Profile } from '@/lib/types';
import { 
    Plus, Trash2, Edit2, School, Loader2, X, 
    Filter, ChevronDown, Save, Search, User, Info 
} from 'lucide-react';
import Swal from 'sweetalert2';

// Tipe untuk Kelas dengan relasi lengkap
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
    const [editingKelas, setEditingKelas] = useState<KelasWithRelations | null>(null);

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
            
            // Mengambil data kelas, jenjang, dan guru secara paralel
            // Kita hapus join guru:profiles(*) di sini untuk keamanan jika relasi belum di-set di Supabase
            // Kita akan melakukan mapping secara manual di frontend
            const [kelasRes, jenjangRes, guruRes] = await Promise.all([
                supabase
                    .from('kelas')
                    .select('*, jenjang(*)')
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

            const profiles = (guruRes.data as Profile[]) || [];
            const jenjangs = (jenjangRes.data as Jenjang[]) || [];
            
            // Lakukan mapping guru secara manual
            const mappedKelas = (kelasRes.data || []).map((k: any) => ({
                ...k,
                guru: profiles.find(p => p.id === k.guru_id) || null
            })) as KelasWithRelations[];

            setKelasList(mappedKelas);
            setJenjangList(jenjangs);
            setGuruList(profiles);
            
            // Set default jenjang di form jika belum ada
            if (jenjangs.length > 0 && !jenjangId) {
                setJenjangId(jenjangs[0].id);
            }
        } catch (error: any) {
            console.error('Error fetching data:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Memuat Data',
                text: error.message || 'Terjadi kesalahan saat sinkronisasi data.',
                confirmButtonColor: '#10b981',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchData(); 
    }, []);

    const resetForm = () => {
        setNama('');
        setGuruId('');
        setJenjangId(jenjangList[0]?.id || '');
        setEditingKelas(null);
        setShowForm(false);
    };

    const handleEdit = (kelas: KelasWithRelations) => {
        setEditingKelas(kelas);
        setNama(kelas.nama);
        setJenjangId(kelas.jenjang_id);
        setGuruId(kelas.guru_id || '');
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!nama.trim()) {
            return Swal.fire('Peringatan', 'Nama kelas tidak boleh kosong', 'warning');
        }
        
        setSubmitting(true);

        try {
            const payload = {
                nama: nama.trim(),
                jenjang_id: jenjangId,
                guru_id: guruId || null,
            };

            let data;
            let error;

            if (editingKelas) {
                const res = await supabase
                    .from('kelas')
                    .update(payload)
                    .eq('id', editingKelas.id)
                    .select('*, jenjang(*)')
                    .single();
                data = res.data;
                error = res.error;
            } else {
                const res = await supabase
                    .from('kelas')
                    .insert([payload])
                    .select('*, jenjang(*)')
                    .single();
                data = res.data;
                error = res.error;
            }
            
            if (error) throw error;
            if (!data) throw new Error('Data tidak dikembalikan dari server');

            // Map guru secara manual untuk data yang baru/diupdate
            const updatedItem: KelasWithRelations = {
                ...data,
                guru: guruList.find(g => g.id === data.guru_id) || null
            };

            // Update state secara langsung untuk optimasi (tanpa full refetch)
            if (editingKelas) {
                setKelasList(prev => prev.map(k => k.id === editingKelas.id ? updatedItem : k));
            } else {
                setKelasList(prev => [updatedItem, ...prev]);
            }

            Swal.fire({
                icon: 'success',
                title: editingKelas ? 'Berhasil Diperbarui' : 'Berhasil Ditambahkan',
                text: `Data kelas ${nama} berhasil disimpan.`,
                timer: 2000,
                showConfirmButton: false,
                background: '#ffffff',
                backdrop: 'rgba(16, 185, 129, 0.1)'
            });
            
            resetForm();
        } catch (error: any) {
            console.error('Submission error:', error);
            Swal.fire('Gagal', error.message || 'Terjadi kesalahan saat menyimpan data', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: 'Hapus Kelas?',
            text: `Apakah Anda yakin ingin menghapus kelas ${name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#78716c',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.from('kelas').delete().eq('id', id);
                if (error) throw error;
                
                // Update state secara langsung
                setKelasList(prev => prev.filter(k => k.id !== id));

                Swal.fire('Terhapus!', 'Kelas berhasil dihapus.', 'success');
            } catch (error: any) {
                Swal.fire('Gagal', error.message, 'error');
            }
        }
    };

    // Filter & Grouping logic
    const filteredKelas = filterJenjang 
        ? kelasList.filter(k => k.jenjang_id === filterJenjang)
        : kelasList;

    const jenjangGroups = jenjangList.map(jenjang => {
        return {
            ...jenjang,
            classes: filteredKelas.filter(k => k.jenjang_id === jenjang.id)
        };
    }).filter(group => group.classes.length > 0 || !filterJenjang);

    const colors = [
        'from-emerald-500 to-teal-400', 
        'from-sky-500 to-indigo-400', 
        'from-violet-500 to-purple-400', 
        'from-amber-500 to-orange-400', 
        'from-pink-500 to-rose-400'
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            {/* Header Section */}
            <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[32px] border border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div>
                    <h2 className="text-3xl font-black text-stone-900 tracking-tighter">Kelola Kelas</h2>
                    <p className="text-stone-500 font-medium">Panel Administrasi Data Kelas & Wali Kelas</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors" />
                        <select
                            value={filterJenjang}
                            onChange={(e) => setFilterJenjang(e.target.value)}
                            className="bg-white border border-stone-200 rounded-2xl text-stone-900 text-sm pl-11 pr-10 py-3.5 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 transition-all appearance-none cursor-pointer font-bold shadow-sm"
                        >
                            <option value="">Semua Jenjang</option>
                            {jenjangList.map((j) => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    </div>
                    
                    <button
                        onClick={() => {
                            if (showForm) resetForm();
                            else setShowForm(true);
                        }}
                        className={`flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-lg ${
                            showForm 
                            ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 shadow-stone-200/10' 
                            : 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-900/20'
                        }`}
                    >
                        {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showForm ? 'Batal' : 'Tambah Kelas'}
                    </button>
                </div>
            </div>

            {/* Form Section */}
            {showForm && (
                <div className="bg-white border border-stone-100 rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            {editingKelas ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                                {editingKelas ? 'Edit Kelas Terdaftar' : 'Pendaftaran Unit Kelas Baru'}
                            </h3>
                            <p className="text-stone-400 text-sm">Lengkapi detail informasi kelas di bawah ini</p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-3 h-3" /> Nama Kelas
                                </label>
                                <input
                                    type="text"
                                    value={nama}
                                    onChange={(e) => setNama(e.target.value)}
                                    placeholder="Contoh: Kelas 1A"
                                    required
                                    className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold placeholder:text-stone-300"
                                />
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                    <School className="w-3 h-3" /> Pilih Jenjang
                                </label>
                                <div className="relative">
                                    <select
                                        value={jenjangId}
                                        onChange={(e) => setJenjangId(e.target.value)}
                                        required
                                        className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>Pilih Jenjang...</option>
                                        {jenjangList.map((j) => (
                                            <option key={j.id} value={j.id}>{j.nama}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                    <User className="w-3 h-3" /> Wali Kelas (Opsional)
                                </label>
                                <div className="relative">
                                    <select
                                        value={guruId}
                                        onChange={(e) => setGuruId(e.target.value)}
                                        className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="">Belum Ditentukan</option>
                                        {guruList.map((g) => (
                                            <option key={g.id} value={g.id}>{g.full_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-3 px-10 py-4 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-[20px] font-black shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {editingKelas ? 'Simpan Perubahan' : 'Daftarkan Kelas'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-10 py-4 bg-white border border-stone-200 text-stone-500 rounded-[20px] font-bold hover:bg-stone-50 transition-all"
                            >
                                Batalkan
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List Data Section */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white/50 rounded-[40px] border border-stone-100">
                    <div className="w-14 h-14 border-[5px] border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-stone-400 font-bold text-xs uppercase tracking-[0.2em]">Sinkronisasi Data...</p>
                </div>
            ) : (
                <div className="space-y-16">
                    {jenjangGroups.map((group, groupIdx) => (
                        <div key={group.id} className="space-y-8 animate-in fade-in duration-700" style={{ animationDelay: `${groupIdx * 100}ms` }}>
                            {/* Group Label */}
                            <div className="flex items-center gap-5">
                                <div className={`w-2 h-10 bg-gradient-to-b ${colors[groupIdx % colors.length]} rounded-full shadow-lg shadow-emerald-500/10`} />
                                <h3 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-4">
                                    {group.nama}
                                    <span className="text-[10px] font-black px-3 py-1 bg-stone-100 text-stone-500 rounded-full uppercase tracking-widest border border-stone-200">
                                        {group.classes.length} Unit Tersedia
                                    </span>
                                </h3>
                            </div>

                            {/* Grid Classes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {group.classes.map((kelas) => (
                                    <div 
                                        key={kelas.id} 
                                        className="bg-white border border-stone-100 rounded-[40px] p-8 hover:translate-y-[-10px] transition-all duration-500 group relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)]"
                                    >
                                        {/* Background Decor */}
                                        <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${colors[groupIdx % colors.length]} opacity-[0.03] rounded-full group-hover:scale-[2] transition-transform duration-1000`} />
                                        
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-8">
                                                <div className={`w-16 h-16 bg-gradient-to-br ${colors[groupIdx % colors.length]} rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-all duration-500`}>
                                                    <School className="w-8 h-8" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(kelas)}
                                                        className="w-11 h-11 flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all shadow-sm"
                                                        title="Edit Data"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(kelas.id, kelas.nama)}
                                                        className="w-11 h-11 flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all shadow-sm"
                                                        title="Hapus Kelas"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-3xl font-black text-stone-900 tracking-tighter mb-6 group-hover:text-emerald-600 transition-colors">
                                                {kelas.nama}
                                            </h3>
                                            
                                            <div className="space-y-4 pt-6 border-t border-stone-50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Wali Kelas</span>
                                                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${kelas.guru?.full_name ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-50 text-stone-400 italic'}`}>
                                                        {kelas.guru?.full_name || 'Menunggu Penugasan'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">ID Unit</span>
                                                    <span className="text-[10px] font-mono text-stone-300 bg-stone-50 px-2 py-0.5 rounded-md">
                                                        {kelas.id.substring(0, 8).toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {group.classes.length === 0 && (
                                    <div className="col-span-full py-12 px-8 border-2 border-dashed border-stone-100 rounded-[40px] flex flex-col items-center justify-center gap-3 bg-stone-50/30">
                                        <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center">
                                            <Info className="w-5 h-5 text-stone-300" />
                                        </div>
                                        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest text-center">
                                            Belum ada kelas terdaftar di jenjang {group.nama}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {jenjangGroups.length === 0 && (
                        <div className="bg-white border border-stone-100 rounded-[48px] p-24 text-center">
                            <div className="w-24 h-24 bg-stone-50 rounded-[36px] flex items-center justify-center mx-auto mb-8">
                                <Search className="w-10 h-10 text-stone-200" />
                            </div>
                            <h3 className="text-3xl font-black text-stone-900 tracking-tighter mb-4">Data Tidak Ditemukan</h3>
                            <p className="text-stone-500 font-medium mb-10 max-w-sm mx-auto">Tidak ada unit kelas yang tersedia untuk kriteria filter pencarian Anda.</p>
                            <button
                                onClick={() => setFilterJenjang('')}
                                className="px-10 py-4 bg-stone-900 text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-stone-200"
                            >
                                Reset Pencarian
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
