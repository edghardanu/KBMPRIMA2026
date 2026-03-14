'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Jenjang } from '@/lib/types';
import { School } from 'lucide-react';

export default function PengurusKelasPage() {
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [kelasCounts, setKelasCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetch = async () => {
            const { data: jenjang } = await supabase.from('jenjang').select('*').order('urutan');
            const { data: kelas } = await supabase.from('kelas').select('jenjang_id');
            setJenjangList(jenjang || []);
            const counts: Record<string, number> = {};
            kelas?.forEach((k: any) => { counts[k.jenjang_id] = (counts[k.jenjang_id] || 0) + 1; });
            setKelasCounts(counts);
            setLoading(false);
        };
        fetch();
    }, []);

    const colors = ['from-emerald-500 to-teal-600', 'from-emerald-500 to-teal-600', 'from-violet-500 to-purple-600', 'from-amber-500 to-orange-600', 'from-pink-500 to-rose-600'];

    return (
        <div className="space-y-6">
            <div><h2 className="text-2xl font-bold text-stone-900">Jumlah Kelas</h2><p className="text-stone-700 text-sm">Lihat jumlah kelas per jenjang</p></div>
            {loading ? (<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jenjangList.map((j, i) => (
                        <div key={j.id} className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl p-6 hover:border-stone-300 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 bg-gradient-to-br ${colors[i % colors.length]} rounded-2xl flex items-center justify-center text-stone-900 shadow-lg`}>
                                    <School className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-sm text-stone-700">{j.nama}</p>
                                    <p className="text-3xl font-bold text-stone-900">{kelasCounts[j.id] || 0}</p>
                                    <p className="text-xs text-stone-700">Kelas</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
