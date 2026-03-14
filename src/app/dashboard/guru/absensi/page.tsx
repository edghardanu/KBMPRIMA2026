'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import { Kelas, Murid, AbsensiStatus } from '@/lib/types';
import { Loader2, Save, UserCheck } from 'lucide-react';
import { sendWhatsAppMessage, formatAttendanceReport } from '@/lib/whatsapp';
import Swal from 'sweetalert2';

export default function GuruAbsensiPage() {
    const { profile } = useAuth();
    const { jenjangList, kelasList: allKelasList, loading: dataLoading } = useData();
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [muridList, setMuridList] = useState<Murid[]>([]);
    const [selectedJenjang, setSelectedJenjang] = useState('');
    const [selectedKelas, setSelectedKelas] = useState('');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [attendance, setAttendance] = useState<Record<string, AbsensiStatus>>({});
    const [keterangan, setKeterangan] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (jenjangList.length > 0 && !selectedJenjang) {
            setSelectedJenjang(jenjangList[0].id);
        }
    }, [jenjangList]);

    useEffect(() => {
        if (!selectedJenjang) return;
        const filteredKelas = allKelasList.filter(k => k.jenjang_id === selectedJenjang && k.guru_id === profile?.id);
        setKelasList(filteredKelas);
        if (filteredKelas.length > 0) {
            setSelectedKelas(filteredKelas[0].id);
        } else {
            setSelectedKelas('');
            setMuridList([]);
        }
        setLoading(false);
    }, [selectedJenjang, allKelasList]);

    useEffect(() => {
        if (!selectedKelas) return;
        const fetch = async () => {
            const { data } = await supabase.from('murid').select('id, nama, whatsapp_ortu').eq('kelas_id', selectedKelas).eq('is_active', true).order('nama');
            setMuridList(data || []);
            const att: Record<string, AbsensiStatus> = {};
            data?.forEach((m: Murid) => { att[m.id] = 'hadir'; });
            setAttendance(att);
        };
        fetch();
    }, [selectedKelas]);

    const handleSubmit = async () => {
        setSubmitting(true);
        const records = muridList.map(m => ({
            murid_id: m.id,
            kelas_id: selectedKelas,
            jenjang_id: selectedJenjang,
            tanggal,
            status: attendance[m.id] || 'hadir',
            keterangan: keterangan[m.id] || '',
            created_by: profile?.id,
        }));

        // Delete existing records for the same date/class
        const { error: delError } = await supabase.from('absensi').delete().eq('kelas_id', selectedKelas).eq('tanggal', tanggal);
        const { error: insError } = await supabase.from('absensi').insert(records);

        if (delError || insError) {
            setSubmitting(false);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: delError?.message || insError?.message || 'Terjadi kesalahan saat menyimpan absensi.',
                confirmButtonColor: '#10b981'
            });
            return;
        }

        // Send WhatsApp Notifications
        for (const m of muridList) {
            if (m.whatsapp_ortu) {
                const message = formatAttendanceReport(
                    m.nama,
                    tanggal,
                    attendance[m.id] || 'hadir',
                    keterangan[m.id] || ''
                );
                await sendWhatsAppMessage(m.whatsapp_ortu, message);
            }
        }

        setSubmitting(false);
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Absensi berhasil disimpan!',
            confirmButtonColor: '#10b981',
            timer: 2000
        });
    };

    const statusOptions: { value: AbsensiStatus; label: string; color: string }[] = [
        { value: 'hadir', label: 'Hadir', color: 'bg-emerald-600' },
        { value: 'tidak_hadir', label: 'Tidak Hadir', color: 'bg-red-600' },
        { value: 'izin', label: 'Izin', color: 'bg-amber-600' },
        { value: 'sakit', label: 'Sakit', color: 'bg-emerald-600' },
    ];

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
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-stone-900">Input Absensi</h2>
                <p className="text-stone-700 text-sm">Catat kehadiran murid per jenjang dan kelas</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <label className="block text-sm text-stone-700 mb-1">Tanggal</label>
                    <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full px-4 py-3 bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
            </div>

            {/* Attendance Table */}
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
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-300">
                                {muridList.map((m, i) => (
                                    <tr key={m.id} className="hover:bg-[#f8f9f5]">
                                        <td className="px-6 py-4 text-sm text-stone-700">{i + 1}</td>
                                        <td className="px-6 py-4 text-sm text-stone-900 font-medium">{m.nama}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2 flex-wrap">
                                                {statusOptions.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setAttendance({ ...attendance, [m.id]: opt.value })}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${attendance[m.id] === opt.value
                                                            ? `${opt.color} text-white shadow-lg`  // Diubah dari text-stone-900 menjadi text-white
                                                            : 'bg-stone-700/50 text-stone-700 hover:bg-stone-600/50'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={keterangan[m.id] || ''}
                                                onChange={(e) => setKeterangan({ ...keterangan, [m.id]: e.target.value })}
                                                placeholder="Keterangan..."
                                                className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-sm placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-stone-300">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Simpan Absensi
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-stone-700">
                    Tidak ada data murid di kelas ini. Silakan pilih kelas lain atau hubungi administrator.
                </div>
            )}
        </div>
    );
}