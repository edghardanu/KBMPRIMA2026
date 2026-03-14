'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Jenjang, Kelas } from '@/lib/types';
import { Loader2, Send, AlertTriangle } from 'lucide-react';

export default function GuruKendalaPage() {
    const { profile } = useAuth();
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [selectedJenjang, setSelectedJenjang] = useState('');
    const [selectedKelas, setSelectedKelas] = useState('');
    const [judul, setJudul] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [kendalaList, setKendalaList] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from('jenjang').select('*').order('urutan');
            setJenjangList(data || []);
            if (data?.length) setSelectedJenjang(data[0].id);
        };
        fetch();
        fetchKendala();
    }, []);

    useEffect(() => {
        if (!selectedJenjang) return;
        const fetch = async () => {
            const { data } = await supabase.from('kelas').select('*').eq('jenjang_id', selectedJenjang).order('nama');
            setKelasList(data || []);
            if (data?.length) setSelectedKelas(data[0].id);
        };
        fetch();
    }, [selectedJenjang]);

    const fetchKendala = async () => {
        const { data } = await supabase.from('kendala').select('*, jenjang(nama)').eq('created_by', profile?.id).order('created_at', { ascending: false });
        setKendalaList(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSuccess('');
        await supabase.from('kendala').insert({
            judul, deskripsi, jenjang_id: selectedJenjang, kelas_id: selectedKelas || null, created_by: profile?.id,
        });
        setJudul(''); setDeskripsi(''); setSubmitting(false);
        setSuccess('Kendala berhasil dikirim!');
        fetchKendala();
        setTimeout(() => setSuccess(''), 3000);
    };

    const statusColors: Record<string, string> = { pending: 'bg-amber-500/20 text-amber-400', disetujui: 'bg-emerald-500/20 text-emerald-600', ditolak: 'bg-red-500/20 text-red-400' };

    return (
        <div className="space-y-6">
            <div><h2 className="text-2xl font-bold text-stone-900">Input Kendala</h2><p className="text-stone-700 text-sm">Laporkan kendala selama KBM berlangsung</p></div>

            <div className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-stone-700 mb-1">Jenjang</label>
                            <select value={selectedJenjang} onChange={(e) => setSelectedJenjang(e.target.value)} className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                {jenjangList.map((j: any) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-stone-700 mb-1">Kelas (opsional)</label>
                            <select value={selectedKelas} onChange={(e) => setSelectedKelas(e.target.value)} className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                <option value="">Semua Kelas</option>
                                {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-stone-700 mb-1">Judul Kendala</label>
                        <input type="text" value={judul} onChange={(e) => setJudul(e.target.value)} required placeholder="Judul kendala..." className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm text-stone-700 mb-1">Deskripsi</label>
                        <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} required rows={4} placeholder="Jelaskan kendala yang dialami..." className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none" />
                    </div>
                    {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 text-sm text-center">{success}</div>}
                    <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg disabled:opacity-50">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Kirim Kendala
                    </button>
                </form>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Riwayat Kendala Saya</h3>
                <div className="space-y-3">
                    {kendalaList.map((k: any) => (
                        <div key={k.id} className="bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl p-4">
                            <div className="flex items-start justify-between">
                                <div><h4 className="text-stone-900 font-medium">{k.judul}</h4><p className="text-sm text-stone-700 mt-1">{k.deskripsi}</p><p className="text-xs text-stone-700 mt-2">{k.jenjang?.nama} • {new Date(k.created_at).toLocaleDateString('id-ID')}</p></div>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[k.status]}`}>{k.status === 'pending' ? 'Menunggu' : k.status === 'disetujui' ? 'Disetujui' : 'Ditolak'}</span>
                            </div>
                            {k.catatan_pengurus && <p className="text-xs text-stone-700 mt-2 pl-3 border-l-2 border-emerald-500/30">Catatan pengurus: {k.catatan_pengurus}</p>}
                        </div>
                    ))}
                    {kendalaList.length === 0 && <div className="text-center py-8 text-stone-700">Belum ada kendala yang dilaporkan</div>}
                </div>
            </div>
        </div>
    );
}
