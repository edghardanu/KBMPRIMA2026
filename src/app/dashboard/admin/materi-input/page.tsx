'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import { Kelas, Murid, Materi, MateriStatus } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
import { sendWhatsAppMessage, formatMaterialReport } from '@/lib/whatsapp';
import Swal from 'sweetalert2';

export default function AdminMateriInputPage() {
    const { profile } = useAuth();
    const { jenjangList, kelasList: allKelasList } = useData();
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [muridList, setMuridList] = useState<Murid[]>([]);
    const [materiList, setMateriList] = useState<Materi[]>([]);
    const [selectedJenjang, setSelectedJenjang] = useState('');
    const [selectedKelas, setSelectedKelas] = useState('');
    const [selectedMateri, setSelectedMateri] = useState('');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [grades, setGrades] = useState<Record<string, MateriStatus>>({});
    const [catatan, setCatatan] = useState<Record<string, string>>({});
    const [checkedPages, setCheckedPages] = useState<Record<string, number[]>>({});
    const [maxPage, setMaxPage] = useState<number>(45);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const supabase = createClient();

    const togglePage = (muridId: string, page: number) => {
        setCheckedPages(prev => {
            const current = prev[muridId] || [];
            if (current.includes(page)) {
                return { ...prev, [muridId]: current.filter(p => p !== page).sort((a, b) => a - b) };
            } else {
                return { ...prev, [muridId]: [...current, page].sort((a, b) => a - b) };
            }
        });
    };

    useEffect(() => {
        if (jenjangList.length > 0 && !selectedJenjang) {
            setSelectedJenjang(jenjangList[0].id);
        }
    }, [jenjangList]);

    useEffect(() => {
        if (!selectedJenjang) return;
        const fetchMateri = async () => {
            const { data } = await supabase.from('materi').select('id, nama, jenjang_id').eq('jenjang_id', selectedJenjang).order('nama');
            setMateriList(data || []);
            if (data?.length) setSelectedMateri(data[0].id);

            const filteredKelas = allKelasList.filter(k => k.jenjang_id === selectedJenjang);
            setKelasList(filteredKelas);
            if (filteredKelas.length > 0) setSelectedKelas(filteredKelas[0].id);
            setLoading(false);
        };
        fetchMateri();
    }, [selectedJenjang, allKelasList]);

    useEffect(() => {
        if (!selectedKelas) return;
        const fetch = async () => {
            const { data } = await supabase.from('murid').select('id, nama, whatsapp_ortu').eq('kelas_id', selectedKelas).eq('is_active', true).order('nama');
            setMuridList(data || []);
            const g: Record<string, MateriStatus> = {};
            data?.forEach((m: Murid) => { g[m.id] = 'lancar'; });
            setGrades(g);
        };
        fetch();
    }, [selectedKelas]);

    const handleSubmit = async () => {
        if (!selectedMateri) return;
        setSubmitting(true);
        const records = muridList.map(m => {
            const h = checkedPages[m.id] || [];
            const halString = h.length > 0 ? `Hal: ${h.join(', ')}` : '';
            const c = catatan[m.id] || '';
            const finalCatatan = [halString, c].filter(Boolean).join(' | ');

            return {
                murid_id: m.id,
                materi_id: selectedMateri,
                kelas_id: selectedKelas,
                jenjang_id: selectedJenjang,
                status: grades[m.id] || 'lancar',
                catatan: finalCatatan,
                tanggal,
                created_by: profile?.id,
            };
        });

        const { error } = await supabase.from('target_materi').insert(records);

        if (error) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#10b981' });
            setSubmitting(false);
            return;
        }

        // Send WhatsApp Notifications
        const materiName = materiList.find(m => m.id === selectedMateri)?.nama || 'Materi';

        for (const m of muridList) {
            if (m.whatsapp_ortu) {
                const message = formatMaterialReport(
                    m.nama,
                    materiName,
                    grades[m.id] || 'lancar',
                    catatan[m.id] || ''
                );
                await sendWhatsAppMessage(m.whatsapp_ortu, message);
            }
        }

        setSubmitting(false);
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Target materi berhasil disimpan!',
            confirmButtonColor: '#10b981',
            timer: 2000
        });
    };

    if (loading && !jenjangList.length) {
        return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center animate-in fade-in duration-500">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <p className="text-stone-400 font-bold uppercase tracking-widest text-[9px] mb-1">Sedang Memuat Data</p>
                    <p className="text-stone-600 font-bold text-sm italic">Mohon tunggu sejenak.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900">Input Target Materi</h2>
                <p className="text-stone-700 text-sm">Catat pencapaian materi per siswa (Lancar / Kurang Lancar)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm text-stone-700 mb-1">Jenjang</label>
                    <select value={selectedJenjang} onChange={(e) => setSelectedJenjang(e.target.value)} className="w-full px-4 py-3 bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-stone-700 mb-1">Kelas</label>
                    <select value={selectedKelas} onChange={(e) => setSelectedKelas(e.target.value)} className="w-full px-4 py-3 bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        {kelasList.length === 0 && <option value="">Tidak ada kelas</option>}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-stone-700 mb-1">Materi</label>
                    <select value={selectedMateri} onChange={(e) => setSelectedMateri(e.target.value)} className="w-full px-4 py-3 bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {materiList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                        {materiList.length === 0 && <option value="">Tidak ada materi</option>}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-stone-700 mb-1">Tanggal</label>
                    <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full px-4 py-3 bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div>
                    <label className="block text-sm text-stone-700 mb-1">Max Halaman (Ceklis)</label>
                    <input type="number" value={maxPage} onChange={(e) => setMaxPage(Number(e.target.value))} min={1} max={500} className="w-full px-4 py-3 bg-white shadow-sm border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
            </div>

            {loading ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 animate-pulse space-y-6">
                    <div className="h-6 bg-stone-200 rounded w-1/4"></div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex gap-4 items-center p-4 border border-stone-100 rounded-xl">
                                <div className="h-8 w-8 bg-stone-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-stone-200 rounded w-1/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : muridList.length > 0 ? (
                <div className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-300">
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">No</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Nama Murid</th>
                                    <th className="text-center px-6 py-4 text-xs font-medium text-stone-700 uppercase">Status</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase min-w-[200px]">Progres Halaman</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase w-[250px]">Catatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-300">
                                {muridList.map((m, i) => (
                                    <tr key={m.id} className="hover:bg-[#f8f9f5]">
                                        <td className="px-6 py-4 text-sm text-stone-700">{i + 1}</td>
                                        <td className="px-6 py-4 text-sm text-stone-900 font-medium">{m.nama}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => setGrades({ ...grades, [m.id]: 'lancar' })}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${grades[m.id] === 'lancar' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-stone-700/50 text-stone-700 hover:bg-stone-600/50'}`}
                                                >
                                                    Lancar
                                                </button>
                                                <button
                                                    onClick={() => setGrades({ ...grades, [m.id]: 'kurang_lancar' })}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${grades[m.id] === 'kurang_lancar' ? 'bg-amber-600 text-white shadow-lg' : 'bg-stone-700/50 text-stone-700 hover:bg-stone-600/50'}`}
                                                >
                                                    Kurang Lancar
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-2">
                                            <div className="flex gap-2 overflow-x-auto pb-2 items-center max-w-[300px] sm:max-w-[400px]">
                                                {Array.from({ length: maxPage }, (_, idx) => idx + 1).map(halaman => {
                                                    const isChecked = (checkedPages[m.id] || []).includes(halaman);
                                                    return (
                                                        <label key={halaman} className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0">
                                                            <span className={`text-[10px] ${isChecked ? 'text-emerald-600 font-bold' : 'text-stone-400 group-hover:text-emerald-500'}`}>{halaman}</span>
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                                checked={isChecked}
                                                                onChange={() => togglePage(m.id, halaman)}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input type="text" value={catatan[m.id] || ''} onChange={(e) => setCatatan({ ...catatan, [m.id]: e.target.value })} placeholder="Catatan tambahan..." className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-sm placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/20" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-stone-300">
                        <button onClick={handleSubmit} disabled={submitting || !selectedMateri} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50">
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan Target Materi
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-stone-700">Tidak ada data murid atau materi. Silakan pilih kelas lain.</div>
            )}
        </div>
    );
}
