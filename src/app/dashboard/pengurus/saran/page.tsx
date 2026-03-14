'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Saran, Jenjang } from '@/lib/types';
import { exportSaranToPDF } from '@/lib/pdf-export';
import { FileDown, Lightbulb, Check, X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function PengurusSaranPage() {
    const { profile } = useAuth();
    const [saranList, setSaranList] = useState<(Saran & { jenjang: Jenjang })[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [catatan, setCatatan] = useState<Record<string, string>>({});
    const supabase = createClient();

    const fetchData = async () => {
        const { data } = await supabase.from('saran').select('*, jenjang(*), creator:profiles!saran_created_by_fkey(full_name)').order('created_at', { ascending: false });
        setSaranList((data as any) || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleApproval = async (id: string, status: 'disetujui' | 'ditolak') => {
        const confirm = await Swal.fire({
            title: 'Konfirmasi',
            text: `Apakah Anda yakin ingin ${status} saran ini?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Lanjutkan!',
            cancelButtonText: 'Batal'
        });

        if (!confirm.isConfirmed) return;

        setProcessing(id);
        const { error } = await supabase.from('saran').update({
            status,
            catatan_pengurus: catatan[id] || '',
            reviewed_by: profile?.id,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        setProcessing(null);

        if (error) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#10b981' });
        } else {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: `Saran berhasil di${status}!`, timer: 2000, confirmButtonColor: '#10b981' });
            fetchData();
        }
    };

    const statusColors: Record<string, string> = { pending: 'bg-amber-500/20 text-amber-400', disetujui: 'bg-emerald-500/20 text-emerald-600', ditolak: 'bg-red-500/20 text-red-400' };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-stone-900">Saran Guru</h2><p className="text-stone-700 text-sm">Setujui atau tolak saran dari guru</p></div>
                <button onClick={() => exportSaranToPDF(saranList.map((s: any) => ({ judul: s.judul, deskripsi: s.deskripsi, jenjang: s.jenjang?.nama || '-', status: s.status, tanggal: new Date(s.created_at).toLocaleDateString('id-ID') })))} disabled={saranList.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"><FileDown className="w-4 h-4" /> Export PDF</button>
            </div>
            {loading ? (<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>) : (
                <div className="space-y-4">
                    {saranList.map((s: any) => (
                        <div key={s.id} className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl p-5 hover:border-stone-300 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center"><Lightbulb className="w-5 h-5 text-green-400" /></div>
                                    <div><h3 className="text-stone-900 font-semibold">{s.judul}</h3><p className="text-xs text-stone-700">Oleh: {(s as any).creator?.full_name || '-'} • {new Date(s.created_at).toLocaleDateString('id-ID')}</p></div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[s.status]}`}>{s.status === 'pending' ? 'Menunggu' : s.status === 'disetujui' ? 'Disetujui' : 'Ditolak'}</span>
                            </div>
                            <p className="text-sm text-stone-700 mb-2">{s.deskripsi}</p>
                            <p className="text-xs text-stone-700 mb-3">Jenjang: <span className="text-emerald-600">{s.jenjang?.nama}</span></p>
                            {s.status === 'pending' && (
                                <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-stone-300">
                                    <input type="text" value={catatan[s.id] || ''} onChange={(e) => setCatatan({ ...catatan, [s.id]: e.target.value })} placeholder="Catatan (opsional)..." className="flex-1 px-4 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApproval(s.id, 'disetujui')} disabled={processing === s.id} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">{processing === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Setuju</button>
                                        <button onClick={() => handleApproval(s.id, 'ditolak')} disabled={processing === s.id} className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">{processing === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Tolak</button>
                                    </div>
                                </div>
                            )}
                            {s.catatan_pengurus && <p className="text-xs text-stone-700 mt-2 pl-3 border-l-2 border-emerald-500/30">Catatan pengurus: {s.catatan_pengurus}</p>}
                        </div>
                    ))}
                    {saranList.length === 0 && <div className="text-center py-12 text-stone-700">Belum ada saran</div>}
                </div>
            )}
        </div>
    );
}
