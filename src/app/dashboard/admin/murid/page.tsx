'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Murid, Kelas, Jenjang, Profile } from '@/lib/types';
import { Plus, Trash2, UserMinus, Search, Loader2, Share2, Copy, Check, QrCode, Edit, X, Save, Calendar } from 'lucide-react';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';

// Loading Skeleton Component dengan animasi lebih halus
const SkeletonLoader = ({ count = 6 }: { count?: number }) => (
    <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
            <div
                key={i}
                className="h-12 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 rounded-lg relative overflow-hidden"
            >
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>
        ))}
    </div>
);

// Page Loading Overlay
const PageLoader = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-500">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full animate-pulse" />
                </div>
            </div>
            <p className="text-stone-700 font-medium animate-pulse">Memuat data murid...</p>
        </div>
    </div>
);

// Shimmer Animation Component
const ShimmerPulse = () => (
    <div className="absolute inset-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
);

export default function AdminMuridPage() {
    const [muridList, setMuridList] = useState<Murid[]>([]);
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [orangtuaList, setOrangtuaList] = useState<Profile[]>([]);
    const [muridOrangtuaMap, setMuridOrangtuaMap] = useState<Map<string, Profile>>(new Map());
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    // Form states for tambah murid
    const [nama, setNama] = useState('');
    const [kelasId, setKelasId] = useState('');
    const [jenjangId, setJenjangId] = useState('');
    const [tanggalLahir, setTanggalLahir] = useState('');
    const [alamat, setAlamat] = useState('');
    const [whatsappOrtu, setWhatsappOrtu] = useState('');
    const [orangtuaId, setOrangtuaId] = useState('');

    // Edit states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNama, setEditNama] = useState('');
    const [editKelasId, setEditKelasId] = useState('');
    const [editJenjangId, setEditJenjangId] = useState('');
    const [editTanggalLahir, setEditTanggalLahir] = useState('');
    const [editAlamat, setEditAlamat] = useState('');
    const [editWhatsappOrtu, setEditWhatsappOrtu] = useState('');
    const [editOrangtuaId, setEditOrangtuaId] = useState('');

    // Filter states
    const [filterJenjang, setFilterJenjang] = useState('');
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Public Form States
    const [formRecord, setFormRecord] = useState<any>(null);
    const [deadlineInput, setDeadlineInput] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [creatingForm, setCreatingForm] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const supabase = createClient();

    // Simulasi loading halaman
    useEffect(() => {
        const timer = setTimeout(() => {
            setPageLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [muridRes, kelasRes, jenjangRes, orangtuaRes, muridOrtuRes] = await Promise.all([
                supabase.from('murid').select('*, kelas(*), jenjang(*)').order('nama'),
                supabase.from('kelas').select('*, jenjang(*)').order('nama'),
                supabase.from('jenjang').select('*').order('urutan'),
                supabase.from('profiles').select('*').eq('role', 'orangtua'),
                supabase.from('murid_orangtua').select('*, orangtua:profiles!murid_orangtua_orangtua_id_fkey(*)'),
            ]);

            // Debug log
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                console.log('Current Auth User:', user.id, 'Role:', profile?.role);
            }

            setMuridList((muridRes.data as any) || []);
            setKelasList((kelasRes.data as any) || []);
            setJenjangList(jenjangRes.data || []);
            setOrangtuaList(orangtuaRes.data || []);

            // Create mapping of murid_id to orangtua profile
            const mapping = new Map();
            if (muridOrtuRes.data) {
                muridOrtuRes.data.forEach((item: any) => {
                    if (item.orangtua) {
                        mapping.set(item.murid_id, item.orangtua);
                    }
                });
            }
            setMuridOrangtuaMap(mapping);

            // Set default jenjang if available and no jenjangId selected
            if (jenjangRes.data?.length && !jenjangId) {
                setJenjangId(jenjangRes.data[0].id);
            }

            // Fetch public form status — get the most recently created one
            const { data: formData, error: fetchFormError } = await supabase
                .from('murid_forms')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchFormError) {
                console.error('Error fetching form meta:', fetchFormError);
            }

            if (formData) {
                setFormRecord(formData);
                setDeadlineInput(new Date(formData.deadline).toISOString().slice(0, 16));

                if (formData.token) {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const link = `${origin}/form-murid?token=${formData.token}`;
                    QRCode.toDataURL(link, { width: 200, margin: 2 })
                        .then(setQrCodeUrl)
                        .catch(err => console.error('Error generating QR:', err));
                }
            } else {
                // Reset form states if no form exists
                setFormRecord(null);
                setQrCodeUrl('');
                setDeadlineInput('');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            await Swal.fire({
                title: 'Error!',
                text: 'Gagal memuat data. Silakan refresh halaman.',
                icon: 'error',
                confirmButtonColor: '#10b981',
                background: '#ffffff',
                backdrop: 'rgba(0,0,0,0.5)'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter kelas based on selected jenjang
    const filteredKelas = kelasList.filter(k => k.jenjang_id === jenjangId);
    const filteredEditKelas = kelasList.filter(k => k.jenjang_id === editJenjangId);

    // Update kelasId when jenjang changes (for tambah form)
    useEffect(() => {
        if (filteredKelas.length > 0) {
            // Check if current kelasId is valid for the new jenjang
            const isValidKelas = filteredKelas.some(k => k.id === kelasId);
            if (!isValidKelas) {
                setKelasId(filteredKelas[0].id);
            }
        } else {
            setKelasId('');
        }
    }, [jenjangId, filteredKelas]);

    // Update editKelasId when editJenjang changes
    useEffect(() => {
        if (filteredEditKelas.length > 0) {
            const isValidKelas = filteredEditKelas.some(k => k.id === editKelasId);
            if (!isValidKelas) {
                setEditKelasId(filteredEditKelas[0].id);
            }
        } else {
            setEditKelasId('');
        }
    }, [editJenjangId, filteredEditKelas]);

    // Fungsi untuk menghitung usia dari tanggal lahir
    const calculateAge = (tanggalLahir: string | null): { tahun: number; bulan: number; display: string } | null => {
        if (!tanggalLahir) return null;

        const birthDate = new Date(tanggalLahir);
        const today = new Date();

        let tahun = today.getFullYear() - birthDate.getFullYear();
        let bulan = today.getMonth() - birthDate.getMonth();

        // Jika bulan negatif, kurangi tahun dan tambah 12 bulan
        if (bulan < 0) {
            tahun--;
            bulan += 12;
        }

        // Jika tanggal hari ini < tanggal lahir, kurangi bulan
        if (today.getDate() < birthDate.getDate()) {
            bulan--;
            if (bulan < 0) {
                bulan += 12;
                tahun--;
            }
        }

        // Format display
        let display = '';
        if (tahun > 0) {
            display += `${tahun} th`;
            if (bulan > 0) display += ` ${bulan} bln`;
        } else {
            display += `${bulan} bulan`;
        }

        return { tahun, bulan, display };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Insert murid
            const { data: muridData, error: muridError } = await supabase.from('murid').insert({
                nama,
                kelas_id: kelasId,
                jenjang_id: jenjangId,
                tanggal_lahir: tanggalLahir || null,
                alamat,
                whatsapp_ortu: whatsappOrtu,
                is_active: true // Set default active status
            }).select().single();

            if (muridError) throw muridError;

            // Link with orangtua if selected
            if (muridData && orangtuaId) {
                const { error: linkError } = await supabase.from('murid_orangtua').insert({
                    murid_id: muridData.id,
                    orangtua_id: orangtuaId,
                });

                if (linkError) throw linkError;
            }

            // Reset form
            resetForm();
            setShowForm(false);

            // Refresh data
            await fetchData();

            // Sweet Alert sukses
            await Swal.fire({
                title: 'Berhasil!',
                text: 'Data murid berhasil ditambahkan',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#ffffff',
                backdrop: 'rgba(16, 185, 129, 0.1)'
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            await Swal.fire({
                title: 'Gagal!',
                text: 'Gagal menambahkan murid. Silakan coba lagi.',
                icon: 'error',
                confirmButtonColor: '#10b981',
                background: '#ffffff'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setNama('');
        setAlamat('');
        setTanggalLahir('');
        setWhatsappOrtu('');
        setOrangtuaId('');
        if (jenjangList.length > 0) {
            setJenjangId(jenjangList[0].id);
        }
    };

    const resetEditForm = () => {
        setEditingId(null);
        setEditNama('');
        setEditKelasId('');
        setEditJenjangId('');
        setEditTanggalLahir('');
        setEditAlamat('');
        setEditWhatsappOrtu('');
        setEditOrangtuaId('');
    };

    const handleEdit = (murid: Murid) => {
        // Set editing mode
        setEditingId(murid.id);
        setEditNama(murid.nama);
        setEditKelasId(murid.kelas_id || '');
        setEditJenjangId(murid.jenjang_id || '');
        setEditTanggalLahir(murid.tanggal_lahir || '');
        setEditAlamat(murid.alamat || '');
        setEditWhatsappOrtu(murid.whatsapp_ortu || '');

        // Find linked orangtua if any
        const findOrangtua = async () => {
            const { data } = await supabase
                .from('murid_orangtua')
                .select('orangtua_id')
                .eq('murid_id', murid.id)
                .maybeSingle();

            if (data) {
                setEditOrangtuaId(data.orangtua_id);
            } else {
                setEditOrangtuaId('');
            }
        };

        findOrangtua();

        // Close tambah form if open
        setShowForm(false);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;

        // Sweet Alert konfirmasi update
        const result = await Swal.fire({
            title: 'Konfirmasi Update',
            text: 'Apakah Anda yakin ingin memperbarui data murid ini?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Update!',
            cancelButtonText: 'Batal',
            background: '#ffffff',
            backdrop: 'rgba(0,0,0,0.5)',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                setSubmitting(true);
                try {
                    // Update murid
                    const { error: muridError } = await supabase
                        .from('murid')
                        .update({
                            nama: editNama,
                            kelas_id: editKelasId,
                            jenjang_id: editJenjangId,
                            tanggal_lahir: editTanggalLahir || null,
                            alamat: editAlamat,
                            whatsapp_ortu: editWhatsappOrtu,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', editingId);

                    if (muridError) throw muridError;

                    // Update orangtua relationship
                    // First delete existing relationship
                    const { error: deleteError } = await supabase
                        .from('murid_orangtua')
                        .delete()
                        .eq('murid_id', editingId);

                    if (deleteError) throw deleteError;

                    // Then create new relationship if orangtua selected
                    if (editOrangtuaId) {
                        const { error: linkError } = await supabase.from('murid_orangtua').insert({
                            murid_id: editingId,
                            orangtua_id: editOrangtuaId,
                        });

                        if (linkError) throw linkError;
                    }

                    // Reset edit mode
                    resetEditForm();

                    // Refresh data
                    await fetchData();

                    return true;
                } catch (error) {
                    console.error('Error updating murid:', error);
                    Swal.showValidationMessage('Gagal memperbarui data');
                    throw error;
                } finally {
                    setSubmitting(false);
                }
            }
        });

        if (result.isConfirmed) {
            await Swal.fire({
                title: 'Berhasil!',
                text: 'Data murid berhasil diperbarui',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#ffffff',
                backdrop: 'rgba(16, 185, 129, 0.1)'
            });
        }
    };

    const handleCancelEdit = () => {
        resetEditForm();
    };

    const toggleActive = async (murid: Murid) => {
        const newStatus = !murid.is_active;
        const statusText = newStatus ? 'mengaktifkan' : 'menonaktifkan';

        const result = await Swal.fire({
            title: 'Konfirmasi',
            text: `Apakah Anda yakin ingin ${statusText} murid ${murid.nama}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: newStatus ? '#10b981' : '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Ya, ${newStatus ? 'Aktifkan' : 'Nonaktifkan'}!`,
            cancelButtonText: 'Batal',
            background: '#ffffff',
            backdrop: 'rgba(0,0,0,0.5)',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('murid')
                        .update({
                            is_active: newStatus,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', murid.id);

                    if (error) throw error;

                    await fetchData();
                    return true;
                } catch (error) {
                    console.error('Error toggling active status:', error);
                    Swal.showValidationMessage('Gagal mengubah status');
                    throw error;
                }
            }
        });

        if (result.isConfirmed) {
            await Swal.fire({
                title: 'Berhasil!',
                text: `Status murid berhasil ${statusText}`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#ffffff',
                backdrop: 'rgba(16, 185, 129, 0.1)'
            });
        }
    };

    const handleDelete = async (id: string, nama: string) => {
        const result = await Swal.fire({
            title: 'Konfirmasi Hapus',
            html: `Apakah Anda yakin ingin menghapus <strong>${nama}</strong>?<br/><br/>
                   <span class="text-red-500 text-sm">Tindakan ini tidak dapat dibatalkan!</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            background: '#ffffff',
            backdrop: 'rgba(239, 68, 68, 0.1)',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    // First delete related records in murid_orangtua
                    const { error: relError } = await supabase
                        .from('murid_orangtua')
                        .delete()
                        .eq('murid_id', id);

                    if (relError) throw relError;

                    // Then delete the murid
                    const { error } = await supabase
                        .from('murid')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;

                    // If we're editing this murid, cancel edit mode
                    if (editingId === id) {
                        resetEditForm();
                    }

                    await fetchData();
                    return true;
                } catch (error) {
                    console.error('Error deleting murid:', error);
                    Swal.showValidationMessage('Gagal menghapus data');
                    throw error;
                }
            }
        });

        if (result.isConfirmed) {
            await Swal.fire({
                title: 'Terhapus!',
                text: 'Data murid berhasil dihapus',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#ffffff',
                backdrop: 'rgba(16, 185, 129, 0.1)'
            });
        }
    };

    const handleCreateForm = async () => {
        if (!deadlineInput) {
            setFormError('Pilih batas waktu terlebih dahulu.');
            return;
        }

        setCreatingForm(true);
        setFormError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (formRecord) {
                // Update deadline only — keep existing token
                const { error } = await supabase
                    .from('murid_forms')
                    .update({
                        deadline: new Date(deadlineInput).toISOString()
                    })
                    .eq('id', formRecord.id);

                if (error) throw error;

                await Swal.fire({
                    title: 'Berhasil!',
                    text: 'Batas waktu formulir berhasil diperbarui',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#ffffff'
                });
            } else {
                // Generate a unique token for the new public form
                const token = crypto.randomUUID();
                const { error } = await supabase.from('murid_forms').insert({
                    token,
                    deadline: new Date(deadlineInput).toISOString(),
                    created_by: user?.id ?? null
                });

                if (error) throw error;

                await Swal.fire({
                    title: 'Berhasil!',
                    text: 'Link formulir berhasil dibuat',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#ffffff'
                });
            }

            await fetchData();
        } catch (error: any) {
            console.error('Error managing form:', error);
            setFormError('Gagal memproses formulir: ' + error.message);

            await Swal.fire({
                title: 'Gagal!',
                text: 'Gagal memproses formulir',
                icon: 'error',
                confirmButtonColor: '#10b981',
                background: '#ffffff'
            });
        } finally {
            setCreatingForm(false);
        }
    };

    const copyToClipboard = () => {
        if (!formRecord?.token) return;

        const origin = window.location.origin;
        const link = `${origin}/form-murid?token=${formRecord.token}`;
        navigator.clipboard.writeText(link);
        setCopied(true);

        // Sweet Alert notifikasi copy
        Swal.fire({
            title: 'Tersalin!',
            text: 'Link formulir berhasil disalin ke clipboard',
            icon: 'success',
            timer: 1000,
            showConfirmButton: false,
            background: '#ffffff',
            toast: true,
            position: 'top-end'
        });

        setTimeout(() => setCopied(false), 2000);
    };

    const filtered = muridList.filter(m => {
        const matchJenjang = !filterJenjang || m.jenjang_id === filterJenjang;
        const matchSearch = !search ||
            m.nama.toLowerCase().includes(search.toLowerCase()) ||
            (m.alamat && m.alamat.toLowerCase().includes(search.toLowerCase())) ||
            (m.tanggal_lahir && calculateAge(m.tanggal_lahir)?.display.includes(search));
        return matchJenjang && matchSearch;
    });

    // Function to truncate long text
    const truncateText = (text: string, maxLength: number = 30) => {
        if (!text) return '-';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Get orangtua name by murid id
    const getOrangtuaName = (muridId: string): string => {
        const orangtua = muridOrangtuaMap.get(muridId);
        return orangtua?.full_name || '-';
    };

    // Page loading overlay
    if (pageLoading) {
        return <PageLoader />;
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Kelola Murid</h2>
                    <p className="text-stone-700 text-sm">Input, edit, dan kelola data murid</p>
                </div>
                <button
                    onClick={() => {
                        setShowForm(!showForm);
                        if (editingId) resetEditForm(); // Cancel edit if open
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Tambah Murid
                </button>
            </div>

            {/* Form Tambah Murid */}
            {showForm && (
                <div className="bg-white shadow-sm border border-stone-300 rounded-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <h3 className="text-lg font-semibold text-stone-900 mb-4">Tambah Murid Baru</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            placeholder="Nama Murid"
                            required
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />

                        <select
                            value={jenjangId}
                            onChange={(e) => setJenjangId(e.target.value)}
                            required
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <option value="">Pilih Jenjang</option>
                            {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>

                        <select
                            value={kelasId}
                            onChange={(e) => setKelasId(e.target.value)}
                            required
                            disabled={!jenjangId || filteredKelas.length === 0 || submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {filteredKelas.length > 0 ? (
                                filteredKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)
                            ) : (
                                <option value="">Pilih jenjang terlebih dahulu</option>
                            )}
                        </select>

                        <div className="relative">
                            <input
                                type="date"
                                value={tanggalLahir}
                                onChange={(e) => setTanggalLahir(e.target.value)}
                                disabled={submitting}
                                className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        </div>

                        <input
                            type="text"
                            value={alamat}
                            onChange={(e) => setAlamat(e.target.value)}
                            placeholder="Alamat"
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />

                        <input
                            type="tel"
                            value={whatsappOrtu}
                            onChange={(e) => setWhatsappOrtu(e.target.value)}
                            placeholder="No. WhatsApp Orang Tua"
                            required
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />

                        <select
                            value={orangtuaId}
                            onChange={(e) => setOrangtuaId(e.target.value)}
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <option value="">Pilih Orang Tua (opsional)</option>
                            {orangtuaList.map(o => <option key={o.id} value={o.id}>{o.full_name} ({o.email})</option>)}
                        </select>

                        <div className="md:col-span-2 flex gap-3">
                            <button
                                type="submit"
                                disabled={submitting || !kelasId || !jenjangId}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-95"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {submitting ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    resetForm();
                                }}
                                disabled={submitting}
                                className="px-6 py-2.5 bg-stone-200 text-stone-700 rounded-xl text-sm hover:bg-stone-300 transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Form Edit Murid */}
            {editingId && (
                <div className="bg-amber-50 shadow-sm border border-amber-300 rounded-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-stone-900">Edit Murid</h3>
                        <button
                            onClick={handleCancelEdit}
                            disabled={submitting}
                            className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-stone-500" />
                        </button>
                    </div>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={editNama}
                            onChange={(e) => setEditNama(e.target.value)}
                            placeholder="Nama Murid"
                            required
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />

                        <select
                            value={editJenjangId}
                            onChange={(e) => setEditJenjangId(e.target.value)}
                            required
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <option value="">Pilih Jenjang</option>
                            {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>

                        <select
                            value={editKelasId}
                            onChange={(e) => setEditKelasId(e.target.value)}
                            required
                            disabled={!editJenjangId || filteredEditKelas.length === 0 || submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {filteredEditKelas.length > 0 ? (
                                filteredEditKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)
                            ) : (
                                <option value="">Pilih jenjang terlebih dahulu</option>
                            )}
                        </select>

                        <div className="relative">
                            <input
                                type="date"
                                value={editTanggalLahir}
                                onChange={(e) => setEditTanggalLahir(e.target.value)}
                                disabled={submitting}
                                className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        </div>

                        <input
                            type="text"
                            value={editAlamat}
                            onChange={(e) => setEditAlamat(e.target.value)}
                            placeholder="Alamat"
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />

                        <input
                            type="tel"
                            value={editWhatsappOrtu}
                            onChange={(e) => setEditWhatsappOrtu(e.target.value)}
                            placeholder="No. WhatsApp Orang Tua"
                            required
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />

                        <select
                            value={editOrangtuaId}
                            onChange={(e) => setEditOrangtuaId(e.target.value)}
                            disabled={submitting}
                            className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <option value="">Pilih Orang Tua (opsional)</option>
                            {orangtuaList.map(o => <option key={o.id} value={o.id}>{o.full_name} ({o.email})</option>)}
                        </select>

                        <div className="md:col-span-2 flex gap-3">
                            <button
                                type="submit"
                                disabled={submitting || !editKelasId || !editJenjangId}
                                className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {submitting ? 'Menyimpan...' : <><Save className="w-4 h-4" /> Perbarui</>}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={submitting}
                                className="px-6 py-2.5 bg-stone-200 text-stone-700 rounded-xl text-sm hover:bg-stone-300 transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bagian Bagikan Formulir */}
            <div className="bg-white shadow-sm border border-stone-300 rounded-2xl p-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stone-900">Bagikan Formulir Pendataan</h3>
                        <p className="text-stone-600 text-sm">Bagikan link atau QR Code agar orang tua bisa input data sendiri</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Batas Waktu Pengumpulan (Deadline)</label>
                            <div className="flex gap-2">
                                <input
                                    type="datetime-local"
                                    value={deadlineInput}
                                    onChange={(e) => { setDeadlineInput(e.target.value); setFormError(null); }}
                                    disabled={creatingForm}
                                    className="flex-1 px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                />
                                <button
                                    onClick={handleCreateForm}
                                    disabled={creatingForm || !deadlineInput}
                                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
                                >
                                    {creatingForm ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Memproses...</span>
                                        </>
                                    ) : (
                                        formRecord ? 'Perbarui Batas' : 'Aktifkan Link'
                                    )}
                                </button>
                            </div>
                            {formError && (
                                <p className="text-sm text-red-500 font-medium mt-1 animate-in fade-in duration-300">{formError}</p>
                            )}
                        </div>

                        {formRecord && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
                                {/* Link Section */}
                                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3 transition-all hover:shadow-md">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tautan Formulir</span>
                                        {new Date(formRecord.deadline) < new Date() && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold animate-pulse">EXPIRED</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={formRecord.token ? `${window.location.origin}/form-murid?token=${formRecord.token}` : ''}
                                            className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-600 outline-none"
                                        />
                                        <button
                                            onClick={copyToClipboard}
                                            disabled={!formRecord.token}
                                            className="p-2 bg-white border border-stone-300 rounded-lg text-stone-600 hover:text-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm active:scale-95"
                                            title="Salin Tautan"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-emerald-500 animate-bounce" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-stone-500 italic">Link ini bersifat publik. Siapapun yang memiliki link dapat mengisi data murid.</p>
                                </div>

                                {/* QR Code Section */}
                                {qrCodeUrl && (
                                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50 transition-all hover:shadow-md">
                                        <div className="bg-white p-2 rounded-lg shadow-sm mb-3 border border-stone-200 animate-in zoom-in duration-500">
                                            <img src={qrCodeUrl} alt="QR Code Formulir" className="w-32 h-32" />
                                        </div>
                                        <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
                                            <QrCode className="w-4 h-4 text-emerald-600" /> Scan QR Code
                                        </p>
                                        <p className="text-xs text-stone-500 mt-1">Simpan gambar QR ini untuk dibagikan</p>
                                        <a
                                            href={qrCodeUrl}
                                            download="qr-pendaftaran-murid.png"
                                            className="mt-2 text-xs text-emerald-600 font-semibold hover:underline transition-all active:scale-95"
                                        >
                                            Download Gambar QR
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {!formRecord && (
                            <div className="flex flex-col items-center justify-center p-12 bg-stone-50 border border-dashed border-stone-300 rounded-2xl text-center animate-in fade-in duration-500">
                                <Share2 className="w-10 h-10 text-stone-300 mb-3 animate-bounce" />
                                <p className="text-stone-500 text-sm">Belum ada formulir aktif. Atur deadline dan klik "Aktifkan Link" untuk mulai membagikan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari murid, alamat, atau usia..."
                        className="pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm w-full transition-all"
                    />
                </div>
                <select
                    value={filterJenjang}
                    onChange={(e) => setFilterJenjang(e.target.value)}
                    className="bg-white border border-stone-300 rounded-xl text-stone-900 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-w-[180px] transition-all"
                >
                    <option value="">Semua Jenjang</option>
                    {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                </select>
            </div>

            {/* Tabel Murid */}
            {loading ? (
                <div className="bg-white shadow-sm border border-stone-300 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-stone-50">
                                <tr className="border-b border-stone-300">
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Nama</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Jenjang</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Kelas</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Nama Orang Tua</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Usia</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Alamat</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">WhatsApp Ortu</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {[...Array(6)].map((_, i) => (
                                    <tr key={i} className="hover:bg-stone-50 transition-colors">
                                        {[...Array(9)].map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 rounded relative overflow-hidden">
                                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white shadow-sm border border-stone-300 rounded-2xl overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-stone-50">
                                <tr className="border-b border-stone-300">
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Nama</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Jenjang</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Kelas</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Nama Orang Tua</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Usia</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Alamat</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">WhatsApp Ortu</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-700 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {filtered.map((murid, index) => {
                                    const age = calculateAge(murid.tanggal_lahir);
                                    return (
                                        <tr key={murid.id} className="hover:bg-stone-50 transition-all duration-200 animate-in fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                            <td className="px-6 py-4 text-sm text-stone-900 font-medium">{murid.nama}</td>
                                            <td className="px-6 py-4 text-sm text-emerald-600">{murid.jenjang?.nama || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-stone-700">{murid.kelas?.nama || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-stone-700">
                                                <span className="font-medium text-emerald-600">{getOrangtuaName(murid.id)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-stone-700">
                                                {age ? (
                                                    <div className="group relative">
                                                        <span className="font-medium text-indigo-600">{age.display}</span>
                                                        {murid.tanggal_lahir && (
                                                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 animate-in fade-in duration-200">
                                                                <div className="bg-stone-800 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                                                                    Lahir: {new Date(murid.tanggal_lahir).toLocaleDateString('id-ID', {
                                                                        day: 'numeric',
                                                                        month: 'long',
                                                                        year: 'numeric'
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-stone-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-stone-700 max-w-[200px]">
                                                <div className="group relative">
                                                    <span className="block truncate" title={murid.alamat || '-'}>
                                                        {truncateText(murid.alamat || '-', 25)}
                                                    </span>
                                                    {murid.alamat && murid.alamat.length > 25 && (
                                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 animate-in fade-in duration-200">
                                                            <div className="bg-stone-800 text-white text-xs rounded-lg py-2 px-3 max-w-xs">
                                                                {murid.alamat}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-stone-700">{murid.whatsapp_ortu || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${murid.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {murid.is_active ? 'Aktif' : 'Non-Aktif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(murid)}
                                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all hover:shadow-sm active:scale-95 disabled:opacity-50"
                                                        title="Edit"
                                                        disabled={editingId === murid.id}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleActive(murid)}
                                                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all active:scale-95 ${murid.is_active
                                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 hover:shadow-sm'
                                                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:shadow-sm'
                                                            }`}
                                                    >
                                                        {murid.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(murid.id, murid.nama)}
                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all hover:shadow-sm active:scale-95"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-stone-500 animate-in fade-in duration-300">
                            <Share2 className="w-10 h-10 text-stone-300 mx-auto mb-3 opacity-50" />
                            Tidak ada murid ditemukan
                        </div>
                    )}

                    {/* Info jumlah murid */}
                    <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 text-sm text-stone-600 animate-in fade-in duration-500">
                        Total: <span className="font-semibold text-stone-900">{filtered.length}</span> murid {filterJenjang && `(difilter)`}
                    </div>
                </div>
            )}
        </div>
    );
}