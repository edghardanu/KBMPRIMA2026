'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Jenjang } from '@/lib/types';
import { exportMateriToPDF } from '@/lib/pdf-export';
import { FileDown } from 'lucide-react';

interface MateriRecap { nama: string; materi: string; status: string; tanggal: string; capaian?: number; }

export default function PengurusMateriPage() {
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [selectedJenjang, setSelectedJenjang] = useState('');
    const [selectedJenjangName, setSelectedJenjangName] = useState('');
    const [recap, setRecap] = useState<MateriRecap[]>([]);
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
        if (!selectedJenjang) return;
        const fetchRecap = async () => {
            setLoading(true);

            // Fetch all target_materi logs
            const { data } = await supabase
                .from('target_materi')
                .select('*, murid(id, nama), materi(id, nama)')
                .eq('jenjang_id', selectedJenjang)
                .order('tanggal', { ascending: false });

            // Fetch materi count to determine full completion requirement
            const { count: materiCount } = await supabase
                .from('materi')
                .select('*', { count: 'exact', head: true })
                .eq('jenjang_id', selectedJenjang);

            const totalMateri = materiCount || 1;

            // Calculate Capaian per Student incrementally (simulate 1-6 months process)
            const muridCapaianMap = new Map<string, number>();
            const muridLancarCount = new Map<string, Set<string>>();

            (data || []).forEach((d: any) => {
                if (d.status === 'lancar' && d.murid?.id && d.materi?.id && d.tanggal) {
                    if (!muridLancarCount.has(d.murid.id)) {
                        muridLancarCount.set(d.murid.id, new Set<string>());
                    }
                    muridLancarCount.get(d.murid.id)?.add(`${d.materi.id}-${d.tanggal}`);
                }
            });

            muridLancarCount.forEach((sessionsSet, muridId) => {
                // Assuming they need e.g. 5 'lancar' sessions on average per materi to hit 100%
                const assumedSessionsToMaster = 5;
                const totalRequiredSessions = totalMateri * assumedSessionsToMaster;

                const pct = Math.min(100, Math.round((sessionsSet.size / totalRequiredSessions) * 100));
                muridCapaianMap.set(muridId, pct);
            });

            setRecap((data || []).map((d: any) => ({
                nama: d.murid?.nama || '-',
                materi: d.materi?.nama || '-',
                status: d.status,
                tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
                capaian: muridCapaianMap.get(d.murid?.id) || 0
            })));
            setLoading(false);
        };
        fetchRecap();
    }, [selectedJenjang]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-stone-900">Rekap Target Materi</h2><p className="text-stone-700 text-sm">Lihat target materi tercapai per jenjang</p></div>
                <div className="flex gap-3">
                    <select value={selectedJenjang} onChange={(e) => { setSelectedJenjang(e.target.value); setSelectedJenjangName(jenjangList.find((j: any) => j.id === e.target.value)?.nama || ''); }} className="bg-white shadow-sm border border-stone-300 border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {jenjangList.map((j: any) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                    <button onClick={() => exportMateriToPDF(selectedJenjangName, recap)} disabled={recap.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"><FileDown className="w-4 h-4" /> Export PDF</button>
                </div>
            </div>
            {loading ? (<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>) : (
                <div className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-stone-300"><th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">No</th><th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Nama</th><th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Capaian (%)</th><th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Materi</th><th className="text-center px-6 py-4 text-xs font-medium text-stone-700 uppercase">Status</th><th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Tanggal</th></tr></thead>
                    <tbody className="divide-y divide-stone-300">{recap.map((r, i) => (<tr key={i} className="hover:bg-[#f8f9f5]"><td className="px-6 py-4 text-sm text-stone-700">{i + 1}</td><td className="px-6 py-4 text-sm text-stone-900 font-medium">{r.nama}</td><td className="px-6 py-4 text-sm text-stone-700 font-semibold text-emerald-600">{r.capaian}%</td><td className="px-6 py-4 text-sm text-stone-700">{r.materi}</td><td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${r.status === 'lancar' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-400'}`}>{r.status === 'lancar' ? 'Lancar' : 'Kurang Lancar'}</span></td><td className="px-6 py-4 text-sm text-stone-700">{r.tanggal}</td></tr>))}</tbody></table></div>
                    {recap.length === 0 && <div className="text-center py-12 text-stone-700">Belum ada data target materi</div>}
                </div>
            )}
        </div>
    );
}
