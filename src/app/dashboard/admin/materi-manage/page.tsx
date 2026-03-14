'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Jenjang, Materi } from '@/lib/types';
import { Plus, Trash2, Loader2, Edit, X } from 'lucide-react';

import Swal from 'sweetalert2';

export default function AdminMateriManagePage() {
    const [materiList, setMateriList] = useState<(Materi & { jenjang: Jenjang })[]>([]);
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [nama, setNama] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [jenjangId, setJenjangId] = useState('');
    const [filterJenjang, setFilterJenjang] = useState('');
    const [editMateriId, setEditMateriId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const supabase = createClient();

    const fetchData = async () => {
        const [materiRes, jenjangRes] = await Promise.all([
            supabase.from('materi').select('*, jenjang(*)').order('created_at', { ascending: false }),
            supabase.from('jenjang').select('*').order('urutan'),
        ]);
        setMateriList((materiRes.data as any) || []);
        setJenjangList(jenjangRes.data || []);
        if (jenjangRes.data?.length && !jenjangId) setJenjangId(jenjangRes.data[0].id);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        if (editMateriId) {
            const { error } = await supabase.from('materi').update({ nama, deskripsi, jenjang_id: jenjangId }).eq('id', editMateriId);
            if (error) {
                Swal.fire('Gagal', error.message, 'error');
            } else {
                Swal.fire('Berhasil', 'Materi berhasil diperbarui', 'success');
                handleCancel();
                fetchData();
            }
        } else {
            const { error } = await supabase.from('materi').insert({ nama, deskripsi, jenjang_id: jenjangId });
            if (error) {
                Swal.fire('Gagal', error.message, 'error');
            } else {
                Swal.fire('Berhasil', 'Materi berhasil ditambahkan', 'success');
                handleCancel();
                fetchData();
            }
        }
        setSubmitting(false);
    };

    const handleCancel = () => {
        setNama('');
        setDeskripsi('');
        setEditMateriId(null);
        setShowForm(false);
        if (jenjangList.length > 0) setJenjangId(jenjangList[0].id);
    };

    const startEdit = (m: Materi) => {
        setEditMateriId(m.id);
        setNama(m.nama);
        setDeskripsi(m.deskripsi || '');
        setJenjangId(m.jenjang_id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        const confirm = await Swal.fire({
            title: 'Hapus Materi?',
            text: "Data yang dihapus tidak bisa dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, hapus!'
        });
        if (!confirm.isConfirmed) return;

        const { error } = await supabase.from('materi').delete().eq('id', id);
        if (error) {
            Swal.fire('Gagal', error.message, 'error');
        } else {
            Swal.fire('Terhapus!', 'Materi telah dihapus.', 'success');
            fetchData();
        }
    };

    const filtered = filterJenjang ? materiList.filter((m: any) => m.jenjang_id === filterJenjang) : materiList;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Kelola Materi</h2>
                    <p className="text-stone-700 text-sm">Buat dan kelola materi per jenjang</p>
                </div>
                <div className="flex gap-3">
                    <select value={filterJenjang} onChange={(e) => setFilterJenjang(e.target.value)} className="bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        <option value="">Semua Jenjang</option>
                        {jenjangList.map((j: any) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                    <button onClick={() => { handleCancel(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25">
                        <Plus className="w-4 h-4" /> Tambah Materi
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="bg-amber-50 shadow-sm border border-amber-300 backdrop-blur-xl rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-stone-900">{editMateriId ? 'Edit Materi' : 'Tambah Materi Baru'}</h3>
                        <button onClick={handleCancel} className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-stone-500" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Materi" required className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        <input type="text" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi" className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                        <select value={jenjangId} onChange={(e) => setJenjangId(e.target.value)} required className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                            {jenjangList.map((j: any) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                        <div className="md:col-span-3 flex gap-3">
                            <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {editMateriId ? 'Perbarui' : 'Simpan'}
                            </button>
                            <button type="button" onClick={handleCancel} className="px-6 py-2.5 bg-stone-200 text-stone-700 rounded-xl text-sm hover:bg-stone-300 font-medium">Batal</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>
            ) : (
                <div className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-300">
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Nama Materi</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Deskripsi</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Jenjang</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-300">
                                {filtered.map((m: any) => (
                                    <tr key={m.id} className="hover:bg-[#f8f9f5]">
                                        <td className="px-6 py-4 text-sm text-stone-900 font-medium">{m.nama}</td>
                                        <td className="px-6 py-4 text-sm text-stone-700">{m.deskripsi || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-emerald-600">{m.jenjang?.nama}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => startEdit(m)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(m.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all" title="Hapus">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length === 0 && <div className="text-center py-12 text-stone-700">Belum ada materi</div>}
                </div>
            )}
        </div>
    );
}
