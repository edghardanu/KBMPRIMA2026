'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Jenjang } from '@/lib/types';
import { exportMateriToPDF } from '@/lib/pdf-export';
import { FileDown, Calendar, Filter, Search, X, CheckCircle, AlertCircle } from 'lucide-react';

interface MateriRecap {
    nama: string;
    materi: string;
    status: string;
    tanggal: string;
    capaian?: number;
    murid_id?: string;
}

interface PeriodeInfo {
    label: string;
    persentase: number;
    totalData: number;
    periode: string;
    targetData: number;
    isTargetTercapai: boolean;
}

interface MuridOption {
    id: string;
    nama: string;
}

export default function AdminMateriPage() {
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [selectedJenjang, setSelectedJenjang] = useState('');
    const [selectedJenjangName, setSelectedJenjangName] = useState('');

    // Filter State
    const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
    const [filterBulan, setFilterBulan] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterMurid, setFilterMurid] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Data murid options
    const [muridOptions, setMuridOptions] = useState<MuridOption[]>([]);
    const [selectedMuridName, setSelectedMuridName] = useState('');

    const [recap, setRecap] = useState<MateriRecap[]>([]);
    const [filteredRecap, setFilteredRecap] = useState<MateriRecap[]>([]);
    const [materiSummary, setMateriSummary] = useState<{
        nama: string;
        persentase: number;
        deskripsi: string;
        targetPeriode: number;
        realisasiPeriode: number;
        isTercapai: boolean;
    }[]>([]);
    const [periodeInfo, setPeriodeInfo] = useState<PeriodeInfo>({
        label: '',
        persentase: 0,
        totalData: 0,
        periode: '',
        targetData: 0,
        isTargetTercapai: false
    });
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const BULAN_OPTIONS = [
        { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
        { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
        { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
        { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
    ];

    const generateTahunOptions = () => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(String);
    };

    // Fungsi untuk memeriksa apakah target 100% tercapai
    const isTargetTercapai = (persentase: number): boolean => {
        return persentase >= 100;
    };

    // Fetch murid options based on selected jenjang
    useEffect(() => {
        const fetchMuridOptions = async () => {
            if (!selectedJenjang) return;

            const { data } = await supabase
                .from('murid')
                .select('id, nama')
                .eq('jenjang_id', selectedJenjang)
                .eq('is_active', true)
                .order('nama');

            setMuridOptions(data || []);
        };

        fetchMuridOptions();
    }, [selectedJenjang]);

    // Filter recap based on selected murid
    useEffect(() => {
        if (filterMurid) {
            const filtered = recap.filter(item => item.murid_id === filterMurid);
            setFilteredRecap(filtered);

            const murid = muridOptions.find(m => m.id === filterMurid);
            setSelectedMuridName(murid?.nama || '');
        } else {
            setFilteredRecap(recap);
            setSelectedMuridName('');
        }
    }, [filterMurid, recap, muridOptions]);

    // Filter murid options based on search term
    const filteredMuridOptions = useMemo(() => {
        return muridOptions.filter(murid =>
            murid.nama.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [muridOptions, searchTerm]);

    // Clear all filters
    const clearAllFilters = () => {
        setFilterTahun(new Date().getFullYear().toString());
        setFilterBulan('');
        setFilterSemester('');
        setFilterMurid('');
        setSearchTerm('');
    };

    // Clear murid filter
    const clearMuridFilter = () => {
        setFilterMurid('');
        setSearchTerm('');
    };

    // Fungsi untuk mendapatkan rentang tanggal berdasarkan periode
    const getPeriodeDateRange = () => {
        const tahun = parseInt(filterTahun);
        let startDate: Date, endDate: Date;

        if (filterSemester) {
            if (filterSemester === 'Ganjil') {
                startDate = new Date(tahun, 6, 1);
                endDate = new Date(tahun, 11, 31);
            } else {
                startDate = new Date(tahun, 0, 1);
                endDate = new Date(tahun, 5, 30);
            }
        } else if (filterBulan) {
            const bulan = parseInt(filterBulan) - 1;
            startDate = new Date(tahun, bulan, 1);
            endDate = new Date(tahun, bulan + 1, 0);
        } else {
            startDate = new Date(tahun, 0, 1);
            endDate = new Date(tahun, 11, 31);
        }

        return { startDate, endDate };
    };

    // Fungsi untuk mendapatkan jumlah pertemuan ideal per periode
    const getTargetPertemuanPerPeriode = () => {
        if (filterSemester === 'Ganjil' || filterSemester === 'Genap') {
            return 24;
        } else if (filterBulan) {
            return 4;
        } else {
            return 48;
        }
    };

    // Fungsi untuk mendapatkan label periode
    const getPeriodeLabel = () => {
        if (filterSemester) {
            return `Semester ${filterSemester} ${filterTahun}`;
        } else if (filterBulan) {
            const bulanObj = BULAN_OPTIONS.find(b => b.value === filterBulan);
            return `${bulanObj?.label} ${filterTahun}`;
        } else if (filterTahun) {
            return `Tahun ${filterTahun}`;
        }
        return 'Semua Periode';
    };

    // Fungsi untuk menghitung persentase berdasarkan periode
    const calculatePeriodePercentage = (realisasi: number, target: number) => {
        if (target === 0) return 0;
        return Math.min(100, Math.round((realisasi / target) * 100));
    };

    useEffect(() => {
        const fetchJenjang = async () => {
            const { data } = await supabase.from('jenjang').select('*').order('urutan');
            setJenjangList(data || []);
            if (data?.length) {
                setSelectedJenjang(data[0].id);
                setSelectedJenjangName(data[0].nama);
            }
            setLoading(false);
        };
        fetchJenjang();
    }, []);

    useEffect(() => {
        if (!selectedJenjang) return;
        const fetchRecap = async () => {
            setLoading(true);

            // 1. Fetch total active students for this jenjang
            const { count: muridCount } = await supabase
                .from('murid')
                .select('*', { count: 'exact', head: true })
                .eq('jenjang_id', selectedJenjang)
                .eq('is_active', true);

            // 2. Fetch all defined materi for this jenjang
            const { data: materiData } = await supabase
                .from('materi')
                .select('id, nama')
                .eq('jenjang_id', selectedJenjang);

            // 3. Fetch all target_materi logs
            const { data } = await supabase
                .from('target_materi')
                .select('*, murid(id, nama), materi(id, nama)')
                .eq('jenjang_id', selectedJenjang)
                .order('tanggal', { ascending: false });

            // 3b. Fetch all absensi
            const { data: absensiData } = await supabase
                .from('absensi')
                .select('murid_id, status, tanggal')
                .eq('jenjang_id', selectedJenjang);

            // Filter Helper berdasarkan periode
            const filterDateByPeriode = (dateString: string) => {
                if (!dateString) return false;
                const date = new Date(dateString);
                const { startDate, endDate } = getPeriodeDateRange();

                return date >= startDate && date <= endDate;
            };

            const filteredTargetMateri = (data || []).filter((d: any) => filterDateByPeriode(d.tanggal));
            const filteredAbsensi = (absensiData || []).filter((d: any) => filterDateByPeriode(d.tanggal));

            // Hitung total data yang difilter
            const totalFilteredData = filteredTargetMateri.length;

            // Hitung target data berdasarkan periode
            const targetPertemuan = getTargetPertemuanPerPeriode();
            const targetData = (muridCount || 0) * targetPertemuan;

            // Hitung persentase periode
            const periodePercentage = calculatePeriodePercentage(totalFilteredData, targetData);

            // Set periode info dengan informasi target tercapai
            setPeriodeInfo({
                label: getPeriodeLabel(),
                persentase: periodePercentage,
                totalData: totalFilteredData,
                periode: filterSemester ? 'semester' : filterBulan ? 'bulan' : 'tahun',
                targetData: targetData,
                isTargetTercapai: isTargetTercapai(periodePercentage)
            });

            // Calculate Attendance
            const absensiStat = new Map<string, { total: number; hadir: number }>();
            filteredAbsensi.forEach((a: any) => {
                if (!absensiStat.has(a.murid_id)) {
                    absensiStat.set(a.murid_id, { total: 0, hadir: 0 });
                }
                const stat = absensiStat.get(a.murid_id)!;
                stat.total++;
                if (a.status === 'hadir') stat.hadir++;
            });

            const getAttendanceRate = (murid_id: string) => {
                const stat = absensiStat.get(murid_id);
                if (!stat || stat.total === 0) return 0;
                return stat.hadir / stat.total;
            };

            const getGeneralAttendanceRate = () => {
                let total = 0, hadir = 0;
                absensiStat.forEach(stat => {
                    total += stat.total;
                    hadir += stat.hadir;
                });
                return total === 0 ? 0 : (hadir / total);
            };

            const generalAttendanceRate = getGeneralAttendanceRate();

            // 4. Calculate Summary per Materi berdasarkan periode dengan target 100%
            const summaryData: {
                nama: string;
                persentase: number;
                deskripsi: string;
                targetPeriode: number;
                realisasiPeriode: number;
                isTercapai: boolean;
            }[] = [];
            const activeMuridCount = muridCount || 0;

            if (materiData && materiData.length > 0) {
                materiData.forEach((m: { id: string; nama: string }) => {
                    // Hitung realisasi per materi dalam periode ini
                    const realisasiPerMateri = filteredTargetMateri.filter(
                        (d: any) => d.materi?.id === m.id && d.status === 'lancar'
                    ).length;

                    // Target per materi dalam periode (setiap murid harus menguasai materi ini)
                    const targetPerMateri = activeMuridCount;

                    // Persentase capaian per materi dalam periode
                    let persentase = 0;
                    if (targetPerMateri > 0) {
                        persentase = Math.min(100, Math.round((realisasiPerMateri / targetPerMateri) * 100));
                        // Adjust dengan kehadiran keseluruhan
                        persentase = Math.round(persentase * generalAttendanceRate);
                    }

                    // Modifikasi deskripsi berdasarkan target 100%
                    let deskripsi = "Belum ada capaian di periode ini";
                    if (persentase >= 100) {
                        deskripsi = `✅ Target 100% tercapai untuk materi ${m.nama.toLowerCase()}`;
                    } else if (persentase >= 75) {
                        deskripsi = `Capaian ${m.nama.toLowerCase()} baik di periode ini (${persentase}%)`;
                    } else if (persentase >= 50) {
                        deskripsi = `Capaian ${m.nama.toLowerCase()} sedang di periode ini (${persentase}%)`;
                    } else if (persentase > 0) {
                        deskripsi = `Capaian ${m.nama.toLowerCase()} perlu ditingkatkan untuk mencapai 100%`;
                    }

                    summaryData.push({
                        nama: m.nama,
                        persentase,
                        deskripsi,
                        targetPeriode: targetPerMateri,
                        realisasiPeriode: realisasiPerMateri,
                        isTercapai: isTargetTercapai(persentase)
                    });
                });
            }

            setMateriSummary(summaryData);

            // 4b. Calculate Capaian per Student dalam periode
            const totalMateri = materiData?.length || 0;
            const muridCapaianMap = new Map<string, number>();

            if (totalMateri > 0) {
                const muridLancarCount = new Map<string, Set<string>>();
                filteredTargetMateri.forEach((d: any) => {
                    const mId = d.murid?.id;
                    if (d.status === 'lancar' && mId) {
                        if (!muridLancarCount.has(mId)) {
                            muridLancarCount.set(mId, new Set<string>());
                        }
                        if (d.materi?.id) {
                            muridLancarCount.get(mId)?.add(d.materi.id);
                        }
                    }
                });

                muridLancarCount.forEach((materiSet, muridId) => {
                    // Target per murid: menguasai semua materi dalam periode
                    const basePct = Math.min(100, Math.round((materiSet.size / totalMateri) * 100));
                    const attRate = getAttendanceRate(muridId);
                    const pct = Math.round(basePct * attRate);

                    muridCapaianMap.set(muridId, pct);
                });
            }

            // 5. Set Detailed Table Logs dengan menyertakan murid_id
            const recapData = filteredTargetMateri.map((d: any) => ({
                nama: d.murid?.nama || '-',
                materi: d.materi?.nama || '-',
                status: d.status,
                tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
                capaian: muridCapaianMap.get(d.murid?.id) || 0,
                murid_id: d.murid?.id
            }));

            setRecap(recapData);
            setFilteredRecap(recapData);

            setLoading(false);
        };
        fetchRecap();
    }, [selectedJenjang, filterTahun, filterBulan, filterSemester]);

    // Fungsi untuk menentukan warna badge berdasarkan persentase
    const getBadgeColor = (persentase: number) => {
        if (persentase >= 100) return 'bg-emerald-600 text-white border-emerald-700'; // Warna khusus untuk 100%
        if (persentase >= 75) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (persentase >= 50) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (persentase >= 25) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-stone-100 text-stone-700 border-stone-200';
    };

    // Hitung jumlah filter aktif
    const activeFilterCount = [
        filterTahun !== new Date().getFullYear().toString(),
        filterBulan,
        filterSemester,
        filterMurid
    ].filter(Boolean).length;

    // Hitung jumlah materi yang mencapai target 100%
    const materiTercapaiCount = materiSummary.filter(m => m.isTercapai).length;
    const totalMateriCount = materiSummary.length;

    if (jenjangList.length === 0 && loading) {
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Rekap Target Materi</h2>
                    <p className="text-stone-700 text-sm">Lihat target materi tercapai per jenjang</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} className="bg-white shadow-sm border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        <option value="">Semua Tahun</option>
                        {generateTahunOptions().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <select value={filterSemester} onChange={(e) => { setFilterSemester(e.target.value); if (e.target.value) setFilterBulan(''); }} className="bg-white shadow-sm border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        <option value="">Semua Semester</option>
                        <option value="Ganjil">Ganjil (Jul - Des)</option>
                        <option value="Genap">Genap (Jan - Jun)</option>
                    </select>

                    <select value={filterBulan} onChange={(e) => { setFilterBulan(e.target.value); if (e.target.value) setFilterSemester(''); }} disabled={!!filterSemester} className="bg-white shadow-sm border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50">
                        <option value="">Semua Bulan</option>
                        {BULAN_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>

                    <select value={selectedJenjang} onChange={(e) => { setSelectedJenjang(e.target.value); setSelectedJenjangName(jenjangList.find(j => j.id === e.target.value)?.nama || ''); }} className="bg-white shadow-sm border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>

                    {/* Filter Murid Dropdown dengan Search */}
                    <div className="relative">
                        <div className="flex items-center">
                            <select
                                value={filterMurid}
                                onChange={(e) => setFilterMurid(e.target.value)}
                                className="bg-white shadow-sm border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-w-[200px] appearance-none"
                            >
                                <option value="">Semua Murid</option>
                                {filteredMuridOptions.map(m => (
                                    <option key={m.id} value={m.id}>{m.nama}</option>
                                ))}
                            </select>
                            <Search className="w-4 h-4 text-stone-400 absolute right-3 pointer-events-none" />
                        </div>

                        {/* Search input untuk filter murid */}
                        {filterMurid === '' && (
                            <input
                                type="text"
                                placeholder="Cari murid..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="absolute top-full left-0 mt-1 w-full bg-white border border-stone-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 z-10"
                            />
                        )}
                    </div>

                    <button
                        onClick={() => exportMateriToPDF(
                            selectedJenjangName + (selectedMuridName ? ` - ${selectedMuridName}` : ''),
                            filteredRecap
                        )}
                        disabled={filteredRecap.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50"
                    >
                        <FileDown className="w-4 h-4" /> Export PDF
                    </button>

                    {/* Clear Filters Button */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-200 transition-all border border-stone-300"
                        >
                            <X className="w-4 h-4" /> Clear Filters ({activeFilterCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-stone-600">Filter aktif:</span>

                    {filterTahun !== new Date().getFullYear().toString() && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm border border-emerald-200">
                            Tahun: {filterTahun}
                            <button onClick={() => setFilterTahun(new Date().getFullYear().toString())} className="hover:text-emerald-900">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filterSemester && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200">
                            Semester: {filterSemester}
                            <button onClick={() => setFilterSemester('')} className="hover:text-blue-900">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filterBulan && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm border border-amber-200">
                            Bulan: {BULAN_OPTIONS.find(b => b.value === filterBulan)?.label}
                            <button onClick={() => setFilterBulan('')} className="hover:text-amber-900">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filterMurid && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm border border-purple-200">
                            Murid: {selectedMuridName}
                            <button onClick={clearMuridFilter} className="hover:text-purple-900">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                </div>
            )}

            {/* Target 100% Summary Card */}
            {!loading && totalMateriCount > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-stone-900">Target 100% Materi</h3>
                                <p className="text-sm text-stone-600">
                                    {materiTercapaiCount} dari {totalMateriCount} materi telah mencapai target 100%
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-emerald-600">
                                {Math.round((materiTercapaiCount / totalMateriCount) * 100)}%
                            </div>
                            <p className="text-xs text-stone-500">Persentase pencapaian target</p>
                        </div>
                    </div>
                    <div className="w-full bg-white rounded-full h-3 mt-4 overflow-hidden">
                        <div
                            className="h-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${(materiTercapaiCount / totalMateriCount) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Badge Informasi Periode */}
            {!loading && (
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Badge Periode Utama */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${periodeInfo.isTargetTercapai ? 'bg-emerald-600 text-white border-emerald-700' : getBadgeColor(periodeInfo.persentase)} shadow-sm`}>
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{periodeInfo.label}</span>
                        <span className="mx-1 text-stone-400">|</span>
                        <span className="font-bold">{periodeInfo.persentase}%</span>
                        {periodeInfo.isTargetTercapai && (
                            <CheckCircle className="w-4 h-4 ml-1" />
                        )}
                    </div>

                    {/* Badge Realisasi vs Target */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl shadow-sm">
                        <Filter className="w-4 h-4 text-stone-500" />
                        <span className="text-sm text-stone-600">Realisasi:</span>
                        <span className="font-bold text-stone-900">{filterMurid ? filteredRecap.length : periodeInfo.totalData}</span>
                        <span className="text-stone-400">/</span>
                        <span className="text-sm text-stone-600">Target:</span>
                        <span className="font-bold text-stone-900">{filterMurid ? 'N/A' : periodeInfo.targetData}</span>
                    </div>

                    {/* Badge Status */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${periodeInfo.persentase >= 100 ? 'bg-emerald-600 text-white border-emerald-700' :
                        periodeInfo.persentase >= 75 ? 'bg-emerald-50 border-emerald-200' :
                            periodeInfo.persentase >= 50 ? 'bg-blue-50 border-blue-200' :
                                'bg-amber-50 border-amber-200'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${periodeInfo.persentase >= 100 ? 'bg-white' :
                            periodeInfo.persentase >= 75 ? 'bg-emerald-500' :
                                periodeInfo.persentase >= 50 ? 'bg-blue-500' :
                                    'bg-amber-500'
                            }`} />
                        <span className="text-sm font-medium">
                            {periodeInfo.persentase >= 100 ? '🎯 Target 100% Tercapai' :
                                periodeInfo.persentase >= 75 ? 'Capaian Baik' :
                                    periodeInfo.persentase >= 50 ? 'Capaian Sedang' :
                                        'Capaian Rendah'}
                        </span>
                    </div>

                    {/* Info filtered by murid */}
                    {filterMurid && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-xl shadow-sm">
                            <span className="text-sm font-medium text-purple-700">
                                Menampilkan data: {selectedMuridName}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="space-y-6 animate-pulse">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white border border-stone-200 shadow-sm rounded-xl p-5 flex flex-col gap-2">
                                <div className="h-6 bg-stone-200 rounded w-1/2"></div>
                                <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                                <div className="h-2 bg-stone-200 rounded-full mt-2 w-full"></div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white shadow-sm border border-stone-200 rounded-2xl p-6">
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex gap-4 items-center border-b border-stone-100 pb-4">
                                    <div className="h-6 bg-stone-200 rounded w-16"></div>
                                    <div className="h-6 bg-stone-200 rounded w-1/4"></div>
                                    <div className="h-6 bg-stone-200 rounded flex-1"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Ringkasan Capaian per Materi per Periode dengan indikator 100% */}
                    {materiSummary.length > 0 && !filterMurid && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {materiSummary.map((summary, idx) => (
                                <div key={idx} className={`bg-white border ${summary.isTercapai ? 'border-emerald-400 shadow-lg shadow-emerald-100' : 'border-stone-200 shadow-sm'} rounded-xl p-5 flex flex-col gap-2 transition-all duration-300 hover:shadow-md`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                            {summary.nama}
                                            {summary.isTercapai && (
                                                <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-600 rounded-full">
                                                    <CheckCircle className="w-3 h-3 text-white" />
                                                </span>
                                            )}
                                        </h3>
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getBadgeColor(summary.persentase)}`}>
                                            {summary.persentase}%
                                        </span>
                                    </div>
                                    <p className="text-sm text-stone-600">{summary.deskripsi}</p>
                                    <div className="flex justify-between text-xs text-stone-500 mt-1">
                                        <span>Realisasi: {summary.realisasiPeriode}</span>
                                        <span>Target: {summary.targetPeriode}</span>
                                    </div>
                                    <div className="w-full bg-stone-100 rounded-full h-2 mt-1 overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${summary.persentase >= 100 ? 'bg-emerald-600' :
                                                summary.persentase >= 75 ? 'bg-emerald-500' :
                                                    summary.persentase >= 50 ? 'bg-blue-500' :
                                                        summary.persentase >= 25 ? 'bg-amber-500' : 'bg-stone-400'
                                                }`}
                                            style={{ width: `${summary.persentase}%` }}
                                        />
                                    </div>
                                    {summary.isTercapai && (
                                        <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Target 100% tercapai
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tabel Log Detail */}
                    <div className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-stone-300">
                                        <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">No</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Nama Murid</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Capaian Periode (%)</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Materi</th>
                                        <th className="text-center px-6 py-4 text-xs font-medium text-stone-700 uppercase">Status</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase">Tanggal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-300">
                                    {filteredRecap.map((r, i) => (
                                        <tr key={i} className="hover:bg-[#f8f9f5]">
                                            <td className="px-6 py-4 text-sm text-stone-700">{i + 1}</td>
                                            <td className="px-6 py-4 text-sm text-stone-900 font-medium">{r.nama}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`font-semibold px-2 py-1 rounded-lg ${(r.capaian || 0) >= 100 ? 'text-white bg-emerald-600' :
                                                    (r.capaian || 0) >= 75 ? 'text-emerald-600 bg-emerald-50' :
                                                        (r.capaian || 0) >= 50 ? 'text-blue-600 bg-blue-50' :
                                                            (r.capaian || 0) >= 25 ? 'text-amber-600 bg-amber-50' :
                                                                'text-stone-600 bg-stone-50'
                                                    }`}>
                                                    {r.capaian}%
                                                    {(r.capaian || 0) >= 100 && (
                                                        <CheckCircle className="w-3 h-3 inline-block ml-1" />
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-stone-700">{r.materi}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${r.status === 'lancar' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {r.status === 'lancar' ? 'Lancar' : 'Kurang Lancar'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-stone-700">{r.tanggal}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredRecap.length === 0 && (
                            <div className="text-center py-12 text-stone-700">
                                {filterMurid
                                    ? `Belum ada data target materi untuk ${selectedMuridName} di periode ini`
                                    : 'Belum ada data target materi di periode ini'
                                }
                            </div>
                        )}
                    </div>

                    {/* Informasi Target 100% */}
                    {!filterMurid && materiSummary.length > 0 && (
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-emerald-600" />
                                <p className="text-sm text-stone-700">
                                    <span className="font-semibold">Target 100%: </span>
                                    Materi dikatakan mencapai target jika semua murid telah menguasai materi tersebut dalam periode yang dipilih.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}