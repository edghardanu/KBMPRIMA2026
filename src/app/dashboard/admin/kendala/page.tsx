'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Kendala, Jenjang } from '@/lib/types';
import { exportKendalaToPDF } from '@/lib/pdf-export';
import { FileDown, AlertTriangle } from 'lucide-react';

export default function AdminKendalaPage() {
    const [kendalaList, setKendalaList] = useState<(Kendala & { jenjang: Jenjang })[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchData = async () => {
        const { data } = await supabase.from('kendala').select('*, jenjang(*), creator:profiles!kendala_created_by_fkey(full_name)').order('created_at', { ascending: false });
        setKendalaList((data as any) || []);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, []);

    const statusColors: Record<string, string> = {
        pending: 'bg-amber-500/20 text-amber-400',
        disetujui: 'bg-emerald-500/20 text-emerald-600',
        ditolak: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Kendala KBM</h2>
                    <p className="text-stone-700 text-sm">Lihat kendala yang dilaporkan guru</p>
                </div>
                <button onClick={() => exportKendalaToPDF(kendalaList.map((k: any) => ({ judul: k.judul, deskripsi: k.deskripsi, jenjang: k.jenjang?.nama || '-', status: k.status, tanggal: new Date(k.created_at).toLocaleDateString('id-ID') })))} disabled={kendalaList.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50">
                    <FileDown className="w-4 h-4" /> Export PDF
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>
            ) : (
                <div className="space-y-4">
                    {kendalaList.map((k: any) => (
                        <div key={k.id} className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl p-5 hover:border-stone-300 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-stone-900 font-semibold">{k.judul}</h3>
                                        <p className="text-xs text-stone-700">Oleh: {(k as any).creator?.full_name || '-'} • {new Date(k.created_at).toLocaleDateString('id-ID')}</p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[k.status]}`}>
                                    {k.status === 'pending' ? 'Menunggu' : k.status === 'disetujui' ? 'Disetujui' : 'Ditolak'}
                                </span>
                            </div>
                            <p className="text-sm text-stone-700 mb-2">{k.deskripsi}</p>
                            <p className="text-xs text-stone-700">Jenjang: <span className="text-emerald-600">{k.jenjang?.nama}</span></p>
                            {k.catatan_pengurus && <p className="text-xs text-stone-700 mt-2 pl-3 border-l-2 border-emerald-500/30">Catatan: {k.catatan_pengurus}</p>}
                        </div>
                    ))}
                    {kendalaList.length === 0 && <div className="text-center py-12 text-stone-700">Belum ada kendala yang dilaporkan</div>}
                </div>
            )}
        </div>
    );
}
