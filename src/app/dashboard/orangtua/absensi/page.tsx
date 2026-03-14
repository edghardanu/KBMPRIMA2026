'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Jenjang } from '@/lib/types';
import { exportAbsensiToPDF } from '@/lib/pdf-export';
import { FileDown } from 'lucide-react';

interface ChildAbsensi { murid_id: string; nama: string; hadir: number; tidak_hadir: number; izin: number; sakit: number; total: number; }

export default function OrangtuaAbsensiPage() {
    const { profile } = useAuth();
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [selectedJenjang, setSelectedJenjang] = useState('');
    const [selectedJenjangName, setSelectedJenjangName] = useState('');
    const [recap, setRecap] = useState<ChildAbsensi[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from('jenjang').select('*').order('urutan');
            setJenjangList(data || []);
            if (data?.length) { setSelectedJenjang(data[0].id); setSelectedJenjangName(data[0].nama); }
            setLoading(false);
        };
        fetch();
    }, []);

    useEffect(() => {
        if (!selectedJenjang || !profile) return;
        const fetchRecap = async () => {
            setLoading(true);
            // Get children linked to this parent
            const { data: links } = await supabase.from('murid_orangtua').select('murid_id').eq('orangtua_id', profile.id);
            const childIds = links?.map((l: any) => l.murid_id) || [];
            if (childIds.length === 0) { setRecap([]); setLoading(false); return; }

            const { data: muridData } = await supabase.from('murid').select('id, nama').in('id', childIds).eq('jenjang_id', selectedJenjang).eq('is_active', true);
            if (!muridData?.length) { setRecap([]); setLoading(false); return; }

            const { data: absensiData } = await supabase.from('absensi').select('murid_id, status').in('murid_id', muridData.map((m: any) => m.id));
            const recapMap: Record<string, ChildAbsensi> = {};
            muridData.forEach((m: any) => { recapMap[m.id] = { murid_id: m.id, nama: m.nama, hadir: 0, tidak_hadir: 0, izin: 0, sakit: 0, total: 0 }; });
            absensiData?.forEach((a: any) => { if (recapMap[a.murid_id]) { recapMap[a.murid_id][a.status as 'hadir' | 'tidak_hadir' | 'izin' | 'sakit']++; recapMap[a.murid_id].total++; } });
            setRecap(Object.values(recapMap));
            setLoading(false);
        };
        fetchRecap();
    }, [selectedJenjang, profile]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-stone-900">Absensi Anak</h2><p className="text-stone-700 text-sm">Lihat rekapan absensi anak Anda</p></div>
                <div className="flex gap-3">
                    <select value={selectedJenjang} onChange={(e) => { setSelectedJenjang(e.target.value); setSelectedJenjangName(jenjangList.find(j => j.id === e.target.value)?.nama || ''); }} className="bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                    <button onClick={() => exportAbsensiToPDF(selectedJenjangName, recap)} disabled={recap.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"><FileDown className="w-4 h-4" /> Export PDF</button>
                </div>
            </div>
            {loading ? (<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>) : recap.length > 0 ? (
                <div className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-stone-300"><th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">No</th><th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Nama Anak</th><th className="text-center px-6 py-4 text-xs font-medium text-stone-700 uppercase">Hadir</th><th className="text-center px-6 py-4 text-xs font-medium text-stone-700 uppercase">Tidak Hadir</th><th className="text-center px-6 py-4 text-xs font-medium text-stone-700 uppercase">Izin</th><th className="text-center px-6 py-4 text-xs font-medium text-stone-700 uppercase">Sakit</th><th className="text-center px-6 py-4 text-xs font-medium text-stone-700 uppercase">Total</th></tr></thead>
                    <tbody className="divide-y divide-stone-300">{recap.map((r, i) => (<tr key={r.murid_id} className="hover:bg-[#f8f9f5]"><td className="px-6 py-4 text-sm text-stone-700">{i + 1}</td><td className="px-6 py-4 text-sm text-stone-900 font-medium">{r.nama}</td><td className="px-6 py-4 text-sm text-emerald-600 text-center">{r.hadir}</td><td className="px-6 py-4 text-sm text-red-400 text-center">{r.tidak_hadir}</td><td className="px-6 py-4 text-sm text-amber-400 text-center">{r.izin}</td><td className="px-6 py-4 text-sm text-emerald-600 text-center">{r.sakit}</td><td className="px-6 py-4 text-sm text-stone-900 text-center font-semibold">{r.total}</td></tr>))}</tbody></table></div></div>
            ) : (
                <div className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl p-12 text-center">
                    <p className="text-stone-700">Belum ada data absensi anak di jenjang ini, atau anak belum terhubung ke akun Anda. Hubungi admin.</p>
                </div>
            )}
        </div>
    );
}
