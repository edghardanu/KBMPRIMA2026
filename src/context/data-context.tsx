'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';
import { Jenjang, Kelas } from '@/lib/types';

interface DataContextType {
    jenjangList: Jenjang[];
    kelasList: Kelas[];
    loading: boolean;
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
    jenjangList: [],
    kelasList: [],
    loading: true,
    refreshData: async () => { },
});

export function DataProvider({ children }: { children: ReactNode }) {
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchData = async () => {
        try {
            const [jenjangRes, kelasRes] = await Promise.all([
                supabase.from('jenjang').select('id, nama').order('urutan'),
                supabase.from('kelas').select('id, nama, jenjang_id, guru_id').order('nama'),
            ]);

            setJenjangList(jenjangRes.data || []);
            setKelasList(kelasRes.data || []);
        } catch (err) {
            console.error('Error fetching global data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const refreshData = async () => {
        setLoading(true);
        await fetchData();
    };

    return (
        <DataContext.Provider value={{ jenjangList, kelasList, loading, refreshData }}>
            {children}
        </DataContext.Provider>
    );
}

export const useData = () => useContext(DataContext);
