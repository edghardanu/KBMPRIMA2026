'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase';
import { exportLaporanAdminToPDF } from '@/lib/pdf-export';
import {
    Users, GraduationCap, School, BookOpen,
    AlertTriangle, Lightbulb, FileDown,
    BarChart2, CheckSquare, AlertCircle,
    Clock, CheckCircle, XCircle, Filter,
    Search, Eye, MessageSquare, Calendar
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import Link from 'next/link';

interface DashboardStats {
    totalUsers: number;
    totalMurid: number;
    totalKelas: number;
    totalJenjang: number;
    totalAbsensi: number;
    totalKendala: number;
    totalSaran: number;
    pendingKendala: number;
    pendingSaran: number;
}

interface ChartDataItem {
    jenjang: string;
    nilai: number;
    label: string;
}

interface Kendala {
    id: string;
    judul: string;
    deskripsi: string;
    status: 'pending' | 'diproses' | 'selesai' | 'ditolak';
    created_at: string;
    jenjang_id: string;
    kelas_id: string;
    user_id: string;
    lampiran?: string;
    jenjang_nama?: string;
    kelas_nama?: string;
    guru_nama?: string;
}

interface Saran {
    id: string;
    judul: string;
    deskripsi: string;
    status: 'pending' | 'diproses' | 'selesai' | 'ditolak';
    created_at: string;
    jenjang_id: string;
    kelas_id: string;
    user_id: string;
    lampiran?: string;
    jenjang_nama?: string;
    kelas_nama?: string;
    guru_nama?: string;
}

interface KendalaPerJenjang {
    jenjang: string;
    total: number;
    pending: number;
    diproses: number;
    selesai: number;
    ditolak: number;
}

interface MateriOption {
    id: string;
    nama: string;
    jenjang_id: string;
}

interface RawChartData {
    jenjangData: { id: string; nama: string }[];
    muridPerJenjang: Map<string, number>;
    materiList: MateriOption[];
    targetList: { murid_id: string; materi_id: string; jenjang_id: string }[];
}

// Tipe untuk filter periode
type PeriodeFilter = 'mingguan' | 'bulanan' | 'semester' | 'tahunan';

// ─── Tooltip kustom ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, suffix }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-stone-100 rounded-2xl px-4 py-3 shadow-xl text-sm">
                <p className="font-black text-stone-700 mb-1">{label}</p>
                <p className="text-emerald-600 font-bold">
                    {payload[0].value}
                    {suffix}
                </p>
            </div>
        );
    }
    return null;
};

// ─── Warna gradasi per bar ────────────────────────────────────────────────────
const BAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { color: string; icon: JSX.Element; label: string }> = {
        pending: {
            color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            icon: <Clock className="w-3 h-3" />,
            label: 'Pending'
        },
        diproses: {
            color: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: <AlertCircle className="w-3 h-3" />,
            label: 'Diproses'
        },
        selesai: {
            color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: <CheckCircle className="w-3 h-3" />,
            label: 'Selesai'
        },
        ditolak: {
            color: 'bg-rose-100 text-rose-700 border-rose-200',
            icon: <XCircle className="w-3 h-3" />,
            label: 'Ditolak'
        },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

export default function DashboardPage() {
    const { profile } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0, totalMurid: 0, totalKelas: 0, totalJenjang: 0,
        totalAbsensi: 0, totalKendala: 0, totalSaran: 0, pendingKendala: 0, pendingSaran: 0,
    });
    const [loading, setLoading] = useState(true);
    const [exportingPDF, setExportingPDF] = useState(false);

    // ── Filter periode untuk grafik kehadiran ──────────────────────────────────
    const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilter>('bulanan');

    // ── Data kendala ────────────────────────────────────────────────────────
    const [kendalaList, setKendalaList] = useState<Kendala[]>([]);
    const [filteredKendala, setFilteredKendala] = useState<Kendala[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('semua');
    const [jenjangFilter, setJenjangFilter] = useState<string>('semua');
    const [jenjangOptions, setJenjangOptions] = useState<{ id: string; nama: string }[]>([]);

    // ── Data saran ────────────────────────────────────────────────────────
    const [saranList, setSaranList] = useState<Saran[]>([]);
    const [filteredSaran, setFilteredSaran] = useState<Saran[]>([]);
    const [searchTermSaran, setSearchTermSaran] = useState('');
    const [statusFilterSaran, setStatusFilterSaran] = useState<string>('semua');
    const [jenjangFilterSaran, setJenjangFilterSaran] = useState<string>('semua');

    // ── Data grafik ──────────────────────────────────────────────────────────
    const [kehadiranChart, setKehadiranChart] = useState<ChartDataItem[]>([]);
    const [capaianChart, setCapaianChart] = useState<ChartDataItem[]>([]);
    const [kendalaPerJenjang, setKendalaPerJenjang] = useState<KendalaPerJenjang[]>([]);

    // ── Filter materi untuk grafik capaian ───────────────────────────────────
    const [materiOptions, setMateriOptions] = useState<MateriOption[]>([]);
    const [materiFilter, setMateriFilter] = useState<string>('semua');
    const [rawChartData, setRawChartData] = useState<RawChartData | null>(null);

    const supabase = createClient();

    // Fungsi untuk mendapatkan rentang tanggal berdasarkan periode
    const getDateRangeFromPeriode = (periode: PeriodeFilter): { start: Date; end: Date } => {
        const end = new Date();
        const start = new Date();

        switch (periode) {
            case 'mingguan':
                start.setDate(end.getDate() - 7);
                break;
            case 'bulanan':
                start.setMonth(end.getMonth() - 1);
                break;
            case 'semester':
                start.setMonth(end.getMonth() - 6);
                break;
            case 'tahunan':
                start.setFullYear(end.getFullYear() - 1);
                break;
        }

        return { start, end };
    };

    // Fungsi untuk fetch data kendala dengan approach yang lebih aman
    const fetchKendalaData = async () => {
        try {
            const { data: kendalaData, error: kendalaError } = await supabase
                .from('kendala')
                .select('*')
                .order('created_at', { ascending: false });

            if (kendalaError) throw kendalaError;
            if (!kendalaData) return;

            const { data: jenjangData } = await supabase
                .from('jenjang')
                .select('id, nama');

            const jenjangMap = new Map();
            jenjangData?.forEach(j => jenjangMap.set(j.id, j.nama));

            const { data: kelasData } = await supabase
                .from('kelas')
                .select('id, nama');

            const kelasMap = new Map();
            kelasData?.forEach(k => kelasMap.set(k.id, k.nama));

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name');

            const profilesMap = new Map();
            profilesData?.forEach(p => profilesMap.set(p.id, p.full_name));

            const kendalaWithRelations = kendalaData.map(k => ({
                ...k,
                jenjang_nama: jenjangMap.get(k.jenjang_id) || 'Unknown',
                kelas_nama: kelasMap.get(k.kelas_id) || 'Unknown',
                guru_nama: profilesMap.get(k.user_id) || 'Unknown'
            }));

            setKendalaList(kendalaWithRelations);
            setFilteredKendala(kendalaWithRelations);

        } catch (err) {
            console.error('Error fetching kendala:', err);
            setKendalaList([]);
            setFilteredKendala([]);
        }
    };

    // Fungsi untuk fetch data saran
    const fetchSaranData = async () => {
        try {
            const { data: saranData, error: saranError } = await supabase
                .from('saran')
                .select('*')
                .order('created_at', { ascending: false });

            if (saranError) throw saranError;
            if (!saranData) return;

            const { data: jenjangData } = await supabase
                .from('jenjang')
                .select('id, nama');

            const jenjangMap = new Map();
            jenjangData?.forEach(j => jenjangMap.set(j.id, j.nama));

            const { data: kelasData } = await supabase
                .from('kelas')
                .select('id, nama');

            const kelasMap = new Map();
            kelasData?.forEach(k => kelasMap.set(k.id, k.nama));

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name');

            const profilesMap = new Map();
            profilesData?.forEach(p => profilesMap.set(p.id, p.full_name));

            const saranWithRelations = saranData.map(s => ({
                ...s,
                jenjang_nama: jenjangMap.get(s.jenjang_id) || 'Unknown',
                kelas_nama: kelasMap.get(s.kelas_id) || 'Unknown',
                guru_nama: profilesMap.get(s.user_id) || 'Unknown'
            }));

            setSaranList(saranWithRelations);
            setFilteredSaran(saranWithRelations);

            const pendingCount = saranWithRelations.filter(s => s.status === 'pending').length;
            setStats(prev => ({ ...prev, pendingSaran: pendingCount }));

        } catch (err) {
            console.error('Error fetching saran:', err);
            setSaranList([]);
            setFilteredSaran([]);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);

                const { data: jenjangRes, error: jenjangError } = await supabase
                    .from('jenjang')
                    .select('id, nama')
                    .order('urutan');

                if (jenjangError) throw jenjangError;
                setJenjangOptions(jenjangRes || []);

                const [
                    usersCount,
                    muridCount,
                    kelasCount,
                    kendalaCount,
                    saranCount,
                    pendingKendalaCount
                ] = await Promise.all([
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('murid').select('*', { count: 'exact', head: true }).eq('is_active', true),
                    supabase.from('kelas').select('*', { count: 'exact', head: true }),
                    supabase.from('kendala').select('*', { count: 'exact', head: true }),
                    supabase.from('saran').select('*', { count: 'exact', head: true }),
                    supabase.from('kendala').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                ]);

                setStats({
                    totalUsers: usersCount.count || 0,
                    totalMurid: muridCount.count || 0,
                    totalKelas: kelasCount.count || 0,
                    totalJenjang: jenjangRes?.length || 0,
                    totalAbsensi: 0,
                    totalKendala: kendalaCount.count || 0,
                    totalSaran: saranCount.count || 0,
                    pendingKendala: pendingKendalaCount.count || 0,
                    pendingSaran: 0,
                });

                await fetchKendalaData();
                await fetchSaranData();

                if (jenjangRes) {
                    await fetchChartData(jenjangRes);
                }

            } catch (error) {
                console.error('Error in fetchStats:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchChartData = async (jenjangData: { id: string; nama: string }[]) => {
            try {
                const [allMuridData, absensiData, materiData, targetMateriData, kendalaData] = await Promise.all([
                    supabase.from('murid').select('id, jenjang_id').eq('is_active', true),
                    supabase.from('absensi').select('murid_id, jenjang_id, status, created_at'),
                    // Ambil nama materi untuk opsi filter
                    supabase.from('materi').select('id, nama, jenjang_id'),
                    supabase.from('target_materi').select('murid_id, materi_id, jenjang_id'),
                    supabase.from('kendala').select('id, status, jenjang_id'),
                ]);

                const muridList = allMuridData.data || [];
                const absensiList = absensiData.data || [];
                const materiList: MateriOption[] = (materiData.data || []) as MateriOption[];
                const targetList = targetMateriData.data || [];
                const kendalaListData = kendalaData.data || [];

                // Jumlah murid per jenjang
                const muridPerJenjang = new Map<string, number>();
                muridList.forEach((m: any) => {
                    if (m.jenjang_id) {
                        muridPerJenjang.set(m.jenjang_id, (muridPerJenjang.get(m.jenjang_id) || 0) + 1);
                    }
                });

                // Simpan opsi materi untuk dropdown filter
                setMateriOptions(materiList);

                // Simpan raw data agar bisa di-recompute saat filter berubah
                setRawChartData({ jenjangData, muridPerJenjang, materiList, targetList });

                // ── Grafik 1: Tingkat Kehadiran per Jenjang (dengan filter periode) ──
                await fetchKehadiranDataWithPeriode(jenjangData, absensiList, periodeFilter);

                // ── Grafik 2: Capaian Materi (semua materi, sebelum filter) ──
                const capaianData = computeCapaianChart(jenjangData, muridPerJenjang, materiList, targetList, 'semua');
                setCapaianChart(capaianData);

                // ── Grafik 3: Kendala per Jenjang ────────────────────────────
                const kendalaPerJenjangMap = new Map<string, { total: number; pending: number; diproses: number; selesai: number; ditolak: number }>();

                jenjangData.forEach(j => {
                    kendalaPerJenjangMap.set(j.id, { total: 0, pending: 0, diproses: 0, selesai: 0, ditolak: 0 });
                });

                kendalaListData.forEach((k: any) => {
                    const entry = kendalaPerJenjangMap.get(k.jenjang_id);
                    if (entry) {
                        entry.total += 1;
                        if (k.status === 'pending') entry.pending += 1;
                        else if (k.status === 'diproses') entry.diproses += 1;
                        else if (k.status === 'selesai') entry.selesai += 1;
                        else if (k.status === 'ditolak') entry.ditolak += 1;
                    }
                });

                const kendalaChartData: KendalaPerJenjang[] = jenjangData.map(j => {
                    const data = kendalaPerJenjangMap.get(j.id) || { total: 0, pending: 0, diproses: 0, selesai: 0, ditolak: 0 };
                    return { jenjang: j.nama, ...data };
                });
                setKendalaPerJenjang(kendalaChartData);

            } catch (err) {
                console.error('Error fetching chart data:', err);
            }
        };

        if (profile) {
            fetchStats();
        }
    }, [profile]);

    // Fungsi terpisah untuk fetch data kehadiran berdasarkan periode
    const fetchKehadiranDataWithPeriode = async (
        jenjangData: { id: string; nama: string }[],
        absensiList: any[],
        periode: PeriodeFilter
    ) => {
        try {
            // Filter absensi berdasarkan periode
            const { start, end } = getDateRangeFromPeriode(periode);

            const filteredAbsensi = absensiList.filter((a: any) => {
                if (!a.created_at) return false;
                const tanggal = new Date(a.created_at);
                return tanggal >= start && tanggal <= end;
            });

            // Hitung kehadiran per jenjang dari data yang sudah difilter
            const totalSesiPerJenjang = new Map<string, number>();
            const hadirPerJenjang = new Map<string, number>();

            filteredAbsensi.forEach((a: any) => {
                if (a.jenjang_id) {
                    totalSesiPerJenjang.set(a.jenjang_id, (totalSesiPerJenjang.get(a.jenjang_id) || 0) + 1);
                    if (a.status === 'hadir') {
                        hadirPerJenjang.set(a.jenjang_id, (hadirPerJenjang.get(a.jenjang_id) || 0) + 1);
                    }
                }
            });

            const kehadiranData: ChartDataItem[] = jenjangData.map(j => {
                const total = totalSesiPerJenjang.get(j.id) || 0;
                const hadir = hadirPerJenjang.get(j.id) || 0;
                const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
                return { jenjang: j.nama, nilai: pct, label: `${pct}%` };
            });

            setKehadiranChart(kehadiranData);
        } catch (err) {
            console.error('Error fetching kehadiran data with periode:', err);
        }
    };

    // Effect untuk update grafik kehadiran saat periode filter berubah
    useEffect(() => {
        const updateKehadiranChart = async () => {
            if (!rawChartData?.jenjangData) return;

            try {
                // Fetch ulang data absensi dengan filter periode
                const { data: absensiData } = await supabase
                    .from('absensi')
                    .select('murid_id, jenjang_id, status, created_at');

                if (absensiData) {
                    await fetchKehadiranDataWithPeriode(
                        rawChartData.jenjangData,
                        absensiData,
                        periodeFilter
                    );
                }
            } catch (err) {
                console.error('Error updating kehadiran chart:', err);
            }
        };

        updateKehadiranChart();
    }, [periodeFilter, rawChartData?.jenjangData]);

    // ── Helper: hitung capaian materi berdasarkan filter materi tertentu ──────
    const computeCapaianChart = (
        jenjangData: { id: string; nama: string }[],
        muridPerJenjang: Map<string, number>,
        materiList: MateriOption[],
        targetList: { murid_id: string; materi_id: string; jenjang_id: string }[],
        filterMateriId: string
    ): ChartDataItem[] => {
        const filteredMateri = filterMateriId === 'semua'
            ? materiList
            : materiList.filter(m => m.id === filterMateriId);

        const materiPerJenjang = new Map<string, number>();
        filteredMateri.forEach(m => {
            if (m.jenjang_id) {
                materiPerJenjang.set(m.jenjang_id, (materiPerJenjang.get(m.jenjang_id) || 0) + 1);
            }
        });

        const filteredTargets = filterMateriId === 'semua'
            ? targetList
            : targetList.filter((t: any) => t.materi_id === filterMateriId);

        const targetPerJenjang = new Map<string, number>();
        filteredTargets.forEach((t: any) => {
            if (t.jenjang_id) {
                targetPerJenjang.set(t.jenjang_id, (targetPerJenjang.get(t.jenjang_id) || 0) + 1);
            }
        });

        return jenjangData.map(j => {
            const bMurid = muridPerJenjang.get(j.id) || 0;
            const bMateri = materiPerJenjang.get(j.id) || 0;
            const bTarget = targetPerJenjang.get(j.id) || 0;
            const expected = bMurid * bMateri;
            const pct = expected > 0 ? Math.min(100, Math.round((bTarget / expected) * 100)) : 0;
            return { jenjang: j.nama, nilai: pct, label: `${pct}%` };
        });
    };

    // ── Recompute capaian chart saat filter materi berubah ────────────────────
    useEffect(() => {
        if (!rawChartData) return;
        const { jenjangData, muridPerJenjang, materiList, targetList } = rawChartData;
        const capaianData = computeCapaianChart(jenjangData, muridPerJenjang, materiList, targetList, materiFilter);
        setCapaianChart(capaianData);
    }, [materiFilter, rawChartData]);

    // ── Filter kendala ────────────────────────────────────────────────────────
    useEffect(() => {
        let filtered = [...kendalaList];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(k =>
                k.judul.toLowerCase().includes(term) ||
                k.deskripsi.toLowerCase().includes(term) ||
                (k.guru_nama && k.guru_nama.toLowerCase().includes(term))
            );
        }

        if (statusFilter !== 'semua') {
            filtered = filtered.filter(k => k.status === statusFilter);
        }

        if (jenjangFilter !== 'semua') {
            filtered = filtered.filter(k => k.jenjang_id === jenjangFilter);
        }

        setFilteredKendala(filtered);
    }, [searchTerm, statusFilter, jenjangFilter, kendalaList]);

    // ── Filter saran ──────────────────────────────────────────────────────────
    useEffect(() => {
        let filtered = [...saranList];

        if (searchTermSaran) {
            const term = searchTermSaran.toLowerCase();
            filtered = filtered.filter(s =>
                s.judul.toLowerCase().includes(term) ||
                s.deskripsi.toLowerCase().includes(term) ||
                (s.guru_nama && s.guru_nama.toLowerCase().includes(term))
            );
        }

        if (statusFilterSaran !== 'semua') {
            filtered = filtered.filter(s => s.status === statusFilterSaran);
        }

        if (jenjangFilterSaran !== 'semua') {
            filtered = filtered.filter(s => s.jenjang_id === jenjangFilterSaran);
        }

        setFilteredSaran(filtered);
    }, [searchTermSaran, statusFilterSaran, jenjangFilterSaran, saranList]);

    // ── Export PDF ──────────────────────────────────────────────────────────
    const handleExportPDF = async () => {
        setExportingPDF(true);
        try {
            const [jenjang, allMuridData, allKendalaData, allSaranData, allKelasData, allMateriData, allTargetMateriData] = await Promise.all([
                supabase.from('jenjang').select('id, nama').order('urutan'),
                supabase.from('murid').select('id, jenjang_id').eq('is_active', true),
                supabase.from('kendala').select('judul, deskripsi, status, jenjang_id, kelas_id'),
                supabase.from('saran').select('judul, deskripsi, status, jenjang_id, kelas_id'),
                supabase.from('kelas').select('id, nama'),
                supabase.from('materi').select('id, jenjang_id'),
                supabase.from('target_materi').select('murid_id, materi_id, jenjang_id'),
            ]);

            const jenjangData = jenjang.data || [];
            const jenjangMap = new Map<string, string>(jenjangData.map((j: any) => [j.id, j.nama]));
            const kelasMap = new Map<string, string>((allKelasData.data || []).map((k: any) => [k.id, k.nama]));

            const muridCountPerJenjang = new Map<string, number>();
            (allMuridData.data || []).forEach((m: any) => {
                if (m.jenjang_id) {
                    muridCountPerJenjang.set(m.jenjang_id, (muridCountPerJenjang.get(m.jenjang_id) || 0) + 1);
                }
            });

            const materiCountPerJenjang = new Map<string, number>();
            (allMateriData.data || []).forEach((m: any) => {
                if (m.jenjang_id) {
                    materiCountPerJenjang.set(m.jenjang_id, (materiCountPerJenjang.get(m.jenjang_id) || 0) + 1);
                }
            });

            const targetMateriCountPerJenjang = new Map<string, number>();
            (allTargetMateriData.data || []).forEach((tm: any) => {
                if (tm.jenjang_id) {
                    targetMateriCountPerJenjang.set(tm.jenjang_id, (targetMateriCountPerJenjang.get(tm.jenjang_id) || 0) + 1);
                }
            });

            const rekapMurid = jenjangData.map((j: any) => {
                const bMurid = muridCountPerJenjang.get(j.id) || 0;
                const bMateri = materiCountPerJenjang.get(j.id) || 0;
                const bTarget = targetMateriCountPerJenjang.get(j.id) || 0;
                const totalExpected = bMurid * bMateri;
                let cap = 0;
                if (totalExpected > 0) cap = Math.min(100, Math.round((bTarget / totalExpected) * 100));
                return {
                    jenjang: j.nama,
                    jumlah: bMurid,
                    capaianMateri: totalExpected > 0
                        ? (cap === 100 ? `Lancar (${cap}%)` : cap > 0 ? `Berjalan (${cap}%)` : `Belum dimulai (0%)`)
                        : 'Belum ada target',
                };
            });

            const formatDataList = (dataList: any[]) =>
                dataList.map(item => ({
                    jenjang: jenjangMap.get(item.jenjang_id) || '-',
                    kelas: item.kelas_id ? (kelasMap.get(item.kelas_id) || '-') : '-',
                    judul: item.judul,
                    deskripsi: item.deskripsi,
                    status: item.status,
                }));

            await exportLaporanAdminToPDF(
                rekapMurid,
                stats.totalMurid,
                formatDataList(allKendalaData.data || []),
                formatDataList(allSaranData.data || [])
            );
        } catch (error) {
            console.error('Error in handleExportPDF:', error);
        } finally {
            setExportingPDF(false);
        }
    };

    // Format tanggal
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch {
            return dateString;
        }
    };

    // Format label periode untuk ditampilkan
    const getPeriodeLabel = (periode: PeriodeFilter): string => {
        const labels = {
            mingguan: '7 Hari Terakhir',
            bulanan: '30 Hari Terakhir',
            semester: '6 Bulan Terakhir',
            tahunan: '1 Tahun Terakhir'
        };
        return labels[periode];
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    // ── Stat cards ───────────────────────────────────────────────────────────
    const statCards = [
        { label: 'Total Pengguna', value: stats.totalUsers, icon: <Users className="w-6 h-6" />, color: 'from-emerald-500 to-teal-400', show: ['admin'] },
        { label: 'Total Murid', value: stats.totalMurid, icon: <GraduationCap className="w-6 h-6" />, color: 'from-sky-500 to-indigo-400', show: ['admin', 'pengurus', 'guru'] },
        { label: 'Total Kelas', value: stats.totalKelas, icon: <School className="w-6 h-6" />, color: 'from-amber-500 to-orange-400', show: ['admin', 'pengurus', 'guru'] },
        { label: 'Total Jenjang', value: stats.totalJenjang, icon: <BookOpen className="w-6 h-6" />, color: 'from-emerald-500 to-teal-400', show: ['admin', 'pengurus'] },
        { label: 'Total Kendala', value: stats.totalKendala, icon: <AlertTriangle className="w-6 h-6" />, color: 'from-rose-500 to-orange-400', show: ['admin', 'pengurus', 'guru'] },
        { label: 'Kendala Pending', value: stats.pendingKendala, icon: <Clock className="w-6 h-6" />, color: 'from-yellow-500 to-amber-400', show: ['admin', 'pengurus'] },
        { label: 'Total Saran', value: stats.totalSaran, icon: <Lightbulb className="w-6 h-6" />, color: 'from-emerald-500 to-teal-400', show: ['admin', 'pengurus', 'guru'] },
        { label: 'Saran Pending', value: stats.pendingSaran, icon: <MessageSquare className="w-6 h-6" />, color: 'from-rose-500 to-pink-400', show: ['admin', 'pengurus'] },
    ];

    const filteredCards = statCards.filter(card => card.show.includes(profile?.role || ''));

    const showCharts = ['admin', 'pengurus', 'guru'].includes(profile?.role || '');

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Banner ───────────────────────────────────────────────────── */}
            <div className="bg-white/40 backdrop-blur-xl border border-stone-100 rounded-[32px] p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 soft-shadow">
                <div>
                    <h2 className="text-3xl font-black text-stone-900 tracking-tighter mb-2">
                        Selamat Datang, {profile?.full_name || 'Pengguna'}
                    </h2>
                    <p className="text-stone-500 font-medium">
                        Sistem Informasi Monitoring Kegiatan Belajar Mengajar.
                    </p>
                </div>
                {profile?.role === 'admin' && (
                    <button
                        onClick={handleExportPDF}
                        disabled={exportingPDF}
                        className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-[20px] font-black shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                    >
                        {exportingPDF
                            ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <FileDown className="w-6 h-6 group-hover:bounce" />
                        }
                        <span>{exportingPDF ? 'Memproses...' : 'Ekspor Laporan PDF'}</span>
                    </button>
                )}
            </div>

            {/* ── Stat Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredCards.map((card, i) => (
                    <div
                        key={i}
                        className="bg-white/70 backdrop-blur-md border border-stone-100 rounded-[32px] p-6 hover:translate-y-[-4px] transition-all duration-300 group soft-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">{card.label}</p>
                                <p className="text-4xl font-black text-stone-900 tracking-tighter">{card.value}</p>
                            </div>
                            <div className={`w-14 h-14 bg-gradient-to-tr ${card.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
                                {card.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Grafik Perbandingan Antar Jenjang ────────────────────────── */}
            {showCharts && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Grafik 1 – Kehadiran dengan Filter Periode */}
                    <div className="bg-white/70 backdrop-blur-md border border-stone-100 rounded-[32px] p-8 soft-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-indigo-400 rounded-xl flex items-center justify-center text-white shadow-md">
                                    <BarChart2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-stone-900 tracking-tight">Tingkat Kehadiran</h3>
                                    <p className="text-xs text-stone-400 font-medium">
                                        {getPeriodeLabel(periodeFilter)}
                                    </p>
                                </div>
                            </div>

                            {/* Dropdown filter periode */}
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                                <select
                                    value={periodeFilter}
                                    onChange={(e) => setPeriodeFilter(e.target.value as PeriodeFilter)}
                                    className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-w-[140px]"
                                >
                                    <option value="mingguan">Mingguan</option>
                                    <option value="bulanan">Bulanan</option>
                                    <option value="semester">Semester</option>
                                    <option value="tahunan">Tahunan</option>
                                </select>
                            </div>
                        </div>

                        {kehadiranChart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-stone-400">
                                <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
                                <p className="text-sm font-medium">Belum ada data kehadiran</p>
                                <p className="text-xs mt-1">Untuk periode {getPeriodeLabel(periodeFilter).toLowerCase()}</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={kehadiranChart}
                                    barCategoryGap="30%"
                                    margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis
                                        dataKey="jenjang"
                                        tick={{ fontSize: 11, fontWeight: 500, fill: '#57534e', dy: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval={0}
                                        height={40}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={(v) => `${v}%`}
                                        tick={{ fontSize: 11, fill: '#a8a29e' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={35}
                                    />
                                    <Tooltip content={<CustomTooltip suffix="%" />} cursor={{ fill: '#f5f5f4', radius: 8 }} />
                                    <Bar
                                        dataKey="nilai"
                                        radius={[10, 10, 0, 0]}
                                        maxBarSize={56}
                                        label={{
                                            position: 'top',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            fill: '#44403c',
                                            formatter: (v: number) => `${v}%`,
                                            dy: -8
                                        }}
                                    >
                                        {kehadiranChart.map((_, idx) => (
                                            <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Grafik 2 – Capaian Materi */}
                    <div className="bg-white/70 backdrop-blur-md border border-stone-100 rounded-[32px] p-8 soft-shadow">
                        {/* Header + dropdown filter materi */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-white shadow-md">
                                    <CheckSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-stone-900 tracking-tight">Capaian Materi</h3>
                                    <p className="text-xs text-stone-400 font-medium">Perbandingan antar jenjang (%)</p>
                                </div>
                            </div>

                            {/* Dropdown filter materi */}
                            {materiOptions.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-stone-400 shrink-0" />
                                    <select
                                        value={materiFilter}
                                        onChange={(e) => setMateriFilter(e.target.value)}
                                        className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 max-w-[200px] truncate"
                                    >
                                        <option value="semua">Semua Materi</option>
                                        {materiOptions.map(m => (
                                            <option key={m.id} value={m.id}>{m.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {capaianChart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-stone-400">
                                <CheckSquare className="w-10 h-10 mb-2 opacity-30" />
                                <p className="text-sm font-medium">Belum ada data capaian materi</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={capaianChart}
                                    barCategoryGap="30%"
                                    margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis
                                        dataKey="jenjang"
                                        tick={{ fontSize: 11, fontWeight: 500, fill: '#57534e', dy: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval={0}
                                        height={40}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={(v) => `${v}%`}
                                        tick={{ fontSize: 11, fill: '#a8a29e' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={35}
                                    />
                                    <Tooltip content={<CustomTooltip suffix="%" />} cursor={{ fill: '#f5f5f4', radius: 8 }} />
                                    <Bar
                                        dataKey="nilai"
                                        radius={[10, 10, 0, 0]}
                                        maxBarSize={56}
                                        label={{
                                            position: 'top',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            fill: '#44403c',
                                            formatter: (v: number) => `${v}%`,
                                            dy: -8
                                        }}
                                    >
                                        {capaianChart.map((_, idx) => (
                                            <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* ── Peran Khusus ─────────────────────────────────────────────── */}
            {profile?.role === 'orangtua' && (
                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-[32px] p-8 text-center animate-in zoom-in duration-500">
                    <BookOpen className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-stone-900 tracking-tighter mb-2">Pusat Informasi</h3>
                    <p className="text-stone-500 font-medium max-w-lg mx-auto">
                        Orang tua dapat memantau laporan absensi dan capaian materi siswa melalui menu navigasi yang tersedia secara real-time.
                    </p>
                </div>
            )}

            {profile?.role === 'pending' && (
                <div className="bg-amber-50 rounded-[32px] p-10 text-center border-2 border-dashed border-amber-200">
                    <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-pulse" />
                    <h3 className="text-2xl font-black text-stone-900 tracking-tighter mb-4">Verifikasi Akun Sedang Berlangsung</h3>
                    <p className="text-stone-500 font-medium">
                        Mohon tunggu sejenak. Akun Anda sedang dalam proses peninjauan oleh administrator sistem.
                    </p>
                </div>
            )}

            {/* ── DAFTAR KENDALA ────────────────────────────────────────────── */}
            {showCharts && (
                <div className="bg-white/70 backdrop-blur-md border border-stone-100 rounded-[32px] p-8 soft-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-xl flex items-center justify-center text-white shadow-md">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-stone-900 tracking-tight">Daftar Kendala KBM</h3>
                                <p className="text-xs text-stone-400 font-medium">
                                    {filteredKendala.length} kendala ditemukan
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Cari kendala, judul, atau guru..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="semua">Semua Status</option>
                                <option value="pending">Pending</option>
                                <option value="diproses">Diproses</option>
                                <option value="selesai">Selesai</option>
                                <option value="ditolak">Ditolak</option>
                            </select>

                            <select
                                value={jenjangFilter}
                                onChange={(e) => setJenjangFilter(e.target.value)}
                                className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="semua">Semua Jenjang</option>
                                {jenjangOptions.map(j => (
                                    <option key={j.id} value={j.id}>{j.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filteredKendala.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertTriangle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                            <p className="text-stone-500 font-medium">Belum ada kendala yang dilaporkan</p>
                            <p className="text-sm text-stone-400 mt-1">Kendala akan muncul di sini setelah guru melaporkannya</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredKendala.slice(0, 5).map((kendala) => (
                                <div
                                    key={kendala.id}
                                    className="bg-white border border-stone-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-bold text-stone-900">{kendala.judul}</h4>
                                                <StatusBadge status={kendala.status} />
                                            </div>
                                            <p className="text-sm text-stone-600 mb-3 line-clamp-2">
                                                {kendala.deskripsi}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {kendala.guru_nama || 'Unknown'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <School className="w-3 h-3" />
                                                    {kendala.jenjang_nama || '-'} - {kendala.kelas_nama || '-'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(kendala.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredKendala.length > 5 && (
                                <div className="text-center pt-4">
                                    <Link
                                        href="/dashboard/kendala"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-medium text-stone-700 transition-colors"
                                    >
                                        Lihat {filteredKendala.length - 5} kendala lainnya
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── DAFTAR SARAN KBM ──────────────────────────────────────────── */}
            {showCharts && (
                <div className="bg-white/70 backdrop-blur-md border border-stone-100 rounded-[32px] p-8 soft-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-white shadow-md">
                                <Lightbulb className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-stone-900 tracking-tight">Daftar Saran KBM</h3>
                                <p className="text-xs text-stone-400 font-medium">
                                    {filteredSaran.length} saran ditemukan
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Cari saran, judul, atau guru..."
                                value={searchTermSaran}
                                onChange={(e) => setSearchTermSaran(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={statusFilterSaran}
                                onChange={(e) => setStatusFilterSaran(e.target.value)}
                                className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="semua">Semua Status</option>
                                <option value="pending">Pending</option>
                                <option value="diproses">Diproses</option>
                                <option value="selesai">Selesai</option>
                                <option value="ditolak">Ditolak</option>
                            </select>

                            <select
                                value={jenjangFilterSaran}
                                onChange={(e) => setJenjangFilterSaran(e.target.value)}
                                className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="semua">Semua Jenjang</option>
                                {jenjangOptions.map(j => (
                                    <option key={j.id} value={j.id}>{j.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filteredSaran.length === 0 ? (
                        <div className="text-center py-12">
                            <Lightbulb className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                            <p className="text-stone-500 font-medium">Belum ada saran yang diberikan</p>
                            <p className="text-sm text-stone-400 mt-1">Saran akan muncul di sini setelah guru memberikannya</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredSaran.slice(0, 5).map((saran) => (
                                <div
                                    key={saran.id}
                                    className="bg-white border border-stone-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-bold text-stone-900">{saran.judul}</h4>
                                                <StatusBadge status={saran.status} />
                                            </div>
                                            <p className="text-sm text-stone-600 mb-3 line-clamp-2">
                                                {saran.deskripsi}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {saran.guru_nama || 'Unknown'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <School className="w-3 h-3" />
                                                    {saran.jenjang_nama || '-'} - {saran.kelas_nama || '-'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(saran.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredSaran.length > 5 && (
                                <div className="text-center pt-4">
                                    <Link
                                        href="/dashboard/saran"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-medium text-stone-700 transition-colors"
                                    >
                                        Lihat {filteredSaran.length - 5} saran lainnya
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}