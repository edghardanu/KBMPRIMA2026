'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import { Kelas, Murid, Materi, MateriStatus } from '@/lib/types';
import { Loader2, Save, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { sendWhatsAppMessage, formatMaterialReport } from '@/lib/whatsapp';
import Swal from 'sweetalert2';

export default function GuruMateriPage() {
    const { profile } = useAuth();
    const { jenjangList, kelasList: allKelasList, loading: dataLoading } = useData();
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
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const supabase = createClient();

    // Fungsi untuk mendapatkan warna tombol berdasarkan status
    const getPageButtonColor = useCallback((muridId: string, halaman: number) => {
        const isChecked = (checkedPages[muridId] || []).includes(halaman);
        const status = grades[muridId] || 'lancar';

        if (!isChecked) {
            return 'bg-white text-stone-600 hover:bg-emerald-50 hover:text-emerald-700 border border-stone-200';
        }

        // Jika halaman tercentang, warnanya sesuai status
        return status === 'lancar'
            ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 border-emerald-600'
            : 'bg-amber-600 text-white shadow-sm hover:bg-amber-700 border-amber-600';
    }, [checkedPages, grades]);

    const togglePage = useCallback((muridId: string, page: number) => {
        setCheckedPages(prev => {
            const current = prev[muridId] || [];
            if (current.includes(page)) {
                return { ...prev, [muridId]: current.filter(p => p !== page).sort((a, b) => a - b) };
            } else {
                return { ...prev, [muridId]: [...current, page].sort((a, b) => a - b) };
            }
        });
    }, []);

    const toggleRowExpand = useCallback((muridId: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [muridId]: !prev[muridId]
        }));
    }, []);

    const selectAllPages = useCallback((muridId: string) => {
        const allPages = Array.from({ length: maxPage }, (_, i) => i + 1);
        setCheckedPages(prev => ({
            ...prev,
            [muridId]: allPages
        }));
    }, [maxPage]);

    const clearAllPages = useCallback((muridId: string) => {
        setCheckedPages(prev => ({
            ...prev,
            [muridId]: []
        }));
    }, []);

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

            const filteredKelas = allKelasList.filter(k => k.jenjang_id === selectedJenjang && k.guru_id === profile?.id);
            setKelasList(filteredKelas);
            if (filteredKelas.length > 0) {
                setSelectedKelas(filteredKelas[0].id);
            } else {
                setSelectedKelas('');
                setMuridList([]);
            }
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
            setSubmitting(false);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: error.message || 'Terjadi kesalahan saat menyimpan materi.',
                confirmButtonColor: '#10b981'
            });
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

    const filteredMuridList = useMemo(() => {
        return muridList.filter(m =>
            m.nama.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [muridList, searchTerm]);

    if (dataLoading && !jenjangList.length) {
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
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100">
                <h2 className="text-2xl md:text-3xl font-bold text-emerald-800">📚 Input Target Materi</h2>
                <p className="text-emerald-600 text-sm mt-1">Catat pencapaian materi per siswa dengan mudah</p>
            </div>

            {/* Filter Section - Improved Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-stone-700">Jenjang</label>
                    <select
                        value={selectedJenjang}
                        onChange={(e) => setSelectedJenjang(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                        {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-stone-700">Kelas</label>
                    <select
                        value={selectedKelas}
                        onChange={(e) => setSelectedKelas(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                        {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        {kelasList.length === 0 && <option value="">Tidak ada kelas</option>}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-stone-700">Materi</label>
                    <select
                        value={selectedMateri}
                        onChange={(e) => setSelectedMateri(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                        {materiList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                        {materiList.length === 0 && <option value="">Tidak ada materi</option>}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-stone-700">Tanggal</label>
                    <input
                        type="date"
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-stone-700">Max Halaman</label>
                    <input
                        type="number"
                        value={maxPage}
                        onChange={(e) => setMaxPage(Number(e.target.value))}
                        min={1}
                        max={500}
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Search Bar */}
            {muridList.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Cari nama murid..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                </div>
            )}

            {loading ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 animate-pulse space-y-6">
                    <div className="h-6 bg-stone-200 rounded w-1/4"></div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex gap-4 items-center p-4 border border-stone-100 rounded-xl">
                                <div className="h-8 w-8 bg-stone-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-stone-200 rounded w-1/3"></div>
                                    <div className="h-3 bg-stone-200 rounded w-1/4"></div>
                                </div>
                                <div className="hidden md:flex gap-2">
                                    <div className="h-8 w-20 bg-stone-200 rounded-lg"></div>
                                    <div className="h-8 w-20 bg-stone-200 rounded-lg"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : filteredMuridList.length > 0 ? (
                <div className="space-y-4">
                    {/* Mobile Card View - For small screens */}
                    <div className="block lg:hidden space-y-4">
                        {filteredMuridList.map((m, i) => (
                            <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                                {/* Header - Click to expand */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                                    onClick={() => toggleRowExpand(m.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-stone-900">{m.nama}</h3>
                                            <p className="text-xs text-stone-500">Status: {grades[m.id] === 'lancar' ? '✅ Lancar' : '⚠️ Kurang Lancar'}</p>
                                        </div>
                                    </div>
                                    {expandedRows[m.id] ? <ChevronUp className="w-5 h-5 text-stone-400" /> : <ChevronDown className="w-5 h-5 text-stone-400" />}
                                </div>

                                {/* Expanded Content */}
                                {expandedRows[m.id] && (
                                    <div className="p-4 border-t border-stone-100 space-y-4">
                                        {/* Status Buttons */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setGrades({ ...grades, [m.id]: 'lancar' })}
                                                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${grades[m.id] === 'lancar'
                                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                    }`}
                                            >
                                                ✅ Lancar
                                            </button>
                                            <button
                                                onClick={() => setGrades({ ...grades, [m.id]: 'kurang_lancar' })}
                                                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${grades[m.id] === 'kurang_lancar'
                                                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-200'
                                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                    }`}
                                            >
                                                ⚠️ Kurang Lancar
                                            </button>
                                        </div>

                                        {/* Page Checkboxes dengan warna dinamis */}
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-sm font-medium text-stone-700">Progres Halaman</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => selectAllPages(m.id)}
                                                        className="text-xs px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors"
                                                    >
                                                        Pilih Semua
                                                    </button>
                                                    <button
                                                        onClick={() => clearAllPages(m.id)}
                                                        className="text-xs px-3 py-1 bg-stone-50 text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
                                                    >
                                                        Reset
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto p-2 bg-stone-50 rounded-xl">
                                                {Array.from({ length: maxPage }, (_, idx) => idx + 1).map(halaman => {
                                                    return (
                                                        <button
                                                            key={halaman}
                                                            onClick={() => togglePage(m.id, halaman)}
                                                            className={`
                                                                aspect-square rounded-lg text-sm font-medium transition-all
                                                                ${getPageButtonColor(m.id, halaman)}
                                                            `}
                                                        >
                                                            {halaman}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="block text-sm font-medium text-stone-700 mb-2">Catatan</label>
                                            <textarea
                                                value={catatan[m.id] || ''}
                                                onChange={(e) => setCatatan({ ...catatan, [m.id]: e.target.value })}
                                                placeholder="Tulis catatan tambahan..."
                                                rows={2}
                                                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View - For larger screens */}
                    <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-stone-50 border-b border-stone-200">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Nama Murid</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-stone-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">
                                            <div className="flex items-center justify-between">
                                                <span>Progres Halaman</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => muridList.forEach(m => selectAllPages(m.id))}
                                                        className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"
                                                    >
                                                        Semua
                                                    </button>
                                                    <button
                                                        onClick={() => muridList.forEach(m => clearAllPages(m.id))}
                                                        className="text-xs px-2 py-1 bg-stone-50 text-stone-600 rounded hover:bg-stone-100"
                                                    >
                                                        Reset
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {filteredMuridList.map((m, i) => (
                                        <tr key={m.id} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-stone-600">{i + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-stone-900">{m.nama}</div>
                                                <div className="text-xs text-stone-500">
                                                    Terpilih: {(checkedPages[m.id] || []).length} halaman
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => setGrades({ ...grades, [m.id]: 'lancar' })}
                                                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${grades[m.id] === 'lancar'
                                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                            }`}
                                                    >
                                                        ✅ Lancar
                                                    </button>
                                                    <button
                                                        onClick={() => setGrades({ ...grades, [m.id]: 'kurang_lancar' })}
                                                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${grades[m.id] === 'kurang_lancar'
                                                            ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                                                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                            }`}
                                                    >
                                                        ⚠️ Kurang
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2 max-w-[400px]">
                                                    {Array.from({ length: maxPage }, (_, idx) => idx + 1).map(halaman => {
                                                        return (
                                                            <button
                                                                key={halaman}
                                                                onClick={() => togglePage(m.id, halaman)}
                                                                className={`
                                                                    w-8 h-8 rounded-lg text-xs font-medium transition-all
                                                                    ${getPageButtonColor(m.id, halaman)}
                                                                `}
                                                            >
                                                                {halaman}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <textarea
                                                    value={catatan[m.id] || ''}
                                                    onChange={(e) => setCatatan({ ...catatan, [m.id]: e.target.value })}
                                                    placeholder="Tambahkan catatan..."
                                                    rows={2}
                                                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary & Submit Button */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <div className="space-y-1">
                                <p className="text-sm text-stone-600">
                                    Total Murid: <span className="font-semibold text-emerald-600">{filteredMuridList.length}</span>
                                </p>
                                <p className="text-sm text-stone-600">
                                    Total Halaman Terpilih: <span className="font-semibold text-emerald-600">
                                        {Object.values(checkedPages).reduce((acc, pages) => acc + pages.length, 0)}
                                    </span>
                                </p>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !selectedMateri}
                                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-100"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>Simpan Target Materi</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-stone-200 text-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📭</span>
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900 mb-2">Tidak Ada Data</h3>
                    <p className="text-stone-600">Silakan pilih kelas lain atau tambahkan murid terlebih dahulu.</p>
                </div>
            )}
        </div>
    );
}