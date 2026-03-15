'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase';
import { Jenjang, ProposalAnggaran, ProposalKegiatan, ProposalJadwal } from '@/lib/types';
import { exportProposalToPDF } from '@/lib/pdf-export';
import {
    FileText, Plus, Send, Save, Loader2, Edit, Trash2, Eye,
    X, DollarSign, Calendar, MapPin, FileDown, ChevronDown, ChevronUp
} from 'lucide-react';
import Swal from 'sweetalert2';

const emptyAnggaran: ProposalAnggaran = { item: '', jumlah: 1, satuan: 'pcs', harga_satuan: 0, total: 0 };
const emptyJadwal: ProposalJadwal = { nama_kegiatan: '', waktu_kegiatan: '', penanggung_jawab: '', tempat: '' };

export default function GuruProposalPage() {
    const { profile } = useAuth();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [proposals, setProposals] = useState<any[]>([]);
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Form fields
    const [judul, setJudul] = useState('');
    const [jenjangId, setJenjangId] = useState('');
    const [tanggalKegiatan, setTanggalKegiatan] = useState('');
    const [tempat, setTempat] = useState('');
    const [pendahuluan, setPendahuluan] = useState('');
    const [jadwal, setJadwal] = useState<ProposalJadwal[]>([{ ...emptyJadwal }]);
    const [tujuan, setTujuan] = useState('');
    const [manfaat, setManfaat] = useState('');
    const [anggaran, setAnggaran] = useState<ProposalAnggaran[]>([{ ...emptyAnggaran }]);
    const [penutup, setPenutup] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const [{ data: jenjangData }, { data: proposalData }] = await Promise.all([
                supabase.from('jenjang').select('*').order('urutan'),
                supabase.from('proposal_kegiatan')
                    .select('*')
                    .eq('created_by', profile?.id)
                    .order('created_at', { ascending: false }),
            ]);

            const jenjangs = jenjangData || [];
            const mappedProposals = (proposalData || []).map((p: any) => ({
                ...p,
                jenjang: jenjangs.find((j: any) => j.id === p.jenjang_id)
            }));

            setJenjangList(jenjangs);
            setProposals(mappedProposals);
            if (jenjangs.length && !jenjangId) setJenjangId(jenjangs[0].id);
            setLoading(false);
        };
        if (profile?.id) fetchData();
    }, [profile?.id]);

    const resetForm = () => {
        setJudul(''); setTanggalKegiatan(''); setTempat('');
        setPendahuluan(''); setJadwal([{ ...emptyJadwal }]); setTujuan('');
        setManfaat(''); setPenutup(''); setEditId(null);
        setAnggaran([{ ...emptyAnggaran }]);
        if (jenjangList.length) setJenjangId(jenjangList[0].id);
    };

    const handleCancel = () => { resetForm(); setShowForm(false); };

    // Jadwal helpers
    const updateJadwal = (index: number, field: keyof ProposalJadwal, value: string) => {
        setJadwal((prev: any[]) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };
    const addJadwalRow = () => setJadwal((prev: any[]) => [...prev, { ...emptyJadwal }]);
    const removeJadwalRow = (index: number) => setJadwal((prev: any[]) => prev.filter((_, i) => i !== index));

    // Anggaran helpers
    const updateAnggaran = (index: number, field: keyof ProposalAnggaran, value: any) => {
        setAnggaran((prev: any[]) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            updated[index].total = updated[index].jumlah * updated[index].harga_satuan;
            return updated;
        });
    };
    const addAnggaranRow = () => setAnggaran((prev: any[]) => [...prev, { ...emptyAnggaran }]);
    const removeAnggaranRow = (index: number) => setAnggaran((prev: any[]) => prev.filter((_, i) => i !== index));
    const totalAnggaran = anggaran.reduce((sum: number, a: any) => sum + (a.jumlah * a.harga_satuan), 0);

    const formatRupiah = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

    // Save / Submit
    const handleSave = async (submitToReview: boolean) => {
        if (!judul.trim() || !tanggalKegiatan || !tempat.trim() || !pendahuluan.trim()) {
            Swal.fire('Error', 'Judul, Tanggal, Tempat, dan Pendahuluan wajib diisi.', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                judul, jenjang_id: jenjangId, tanggal_kegiatan: tanggalKegiatan,
                tempat, pendahuluan,
                jadwal: jadwal.filter((j: any) => j.nama_kegiatan.trim()),
                tujuan, manfaat,
                anggaran: anggaran.filter((a: any) => a.item.trim()),
                total_anggaran: totalAnggaran, penutup,
                status: submitToReview ? 'submitted' : 'draft',
                created_by: profile?.id,
                updated_at: new Date().toISOString(),
            };

            let updatedProposal: any;

            if (editId) {
                const { data, error } = await supabase
                    .from('proposal_kegiatan')
                    .update(payload)
                    .eq('id', editId)
                    .select('*')
                    .single();
                if (error) throw error;
                updatedProposal = {
                    ...data,
                    jenjang: jenjangList.find((j: any) => j.id === data.jenjang_id)
                };
            } else {
                const { data, error } = await supabase
                    .from('proposal_kegiatan')
                    .insert(payload)
                    .select('*')
                    .single();
                if (error) throw error;
                updatedProposal = {
                    ...data,
                    jenjang: jenjangList.find((j: any) => j.id === data.jenjang_id)
                };
            }

            Swal.fire({
                icon: 'success',
                title: submitToReview ? 'Proposal Dikirim!' : 'Draft Tersimpan!',
                text: submitToReview ? 'Proposal telah dikirim ke pengurus untuk disetujui.' : 'Draft proposal berhasil disimpan.',
                timer: 1800, showConfirmButton: false,
            });

            // Update local state instead of refetching all
            if (editId) {
                setProposals((prev: any[]) => prev.map((p: any) => p.id === editId ? updatedProposal : p));
            } else {
                setProposals((prev: any[]) => [updatedProposal, ...prev]);
            }
            
            handleCancel();
        } catch (error: any) {
            Swal.fire('Gagal', error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (p: any) => {
        setEditId(p.id);
        setJudul(p.judul); setJenjangId(p.jenjang_id); setTanggalKegiatan(p.tanggal_kegiatan);
        setTempat(p.tempat); setPendahuluan(p.pendahuluan);
        setJadwal(p.jadwal?.length ? p.jadwal : [{ ...emptyJadwal }]);
        setTujuan(p.tujuan); setManfaat(p.manfaat); setPenutup(p.penutup);
        setAnggaran(p.anggaran?.length ? p.anggaran : [{ ...emptyAnggaran }]);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        const confirm = await Swal.fire({
            title: 'Hapus Proposal?', text: 'Draft ini akan dihapus permanen.',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444',
            confirmButtonText: 'Hapus', cancelButtonText: 'Batal',
        });
        if (!confirm.isConfirmed) return;

        await supabase.from('proposal_kegiatan').delete().eq('id', id);
        setProposals((prev: any[]) => prev.filter((p: any) => p.id !== id));
        Swal.fire({ icon: 'success', title: 'Dihapus!', timer: 1200, showConfirmButton: false });
    };

    const handleExportPDF = (p: any) => {
        exportProposalToPDF({
            judul: p.judul,
            jenjangNama: p.jenjang?.nama || '-',
            tanggalKegiatan: new Date(p.tanggal_kegiatan).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            tempat: p.tempat,
            pendahuluan: p.pendahuluan,
            jadwal: p.jadwal || [],
            tujuan: p.tujuan,
            manfaat: p.manfaat,
            anggaran: p.anggaran || [],
            totalAnggaran: p.total_anggaran || 0,
            penutup: p.penutup,
            pembuatNama: profile?.full_name || '-',
            status: p.status,
        });
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            draft: 'bg-stone-100 text-stone-600 border-stone-200',
            submitted: 'bg-blue-100 text-blue-700 border-blue-200',
            disetujui: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            revisi: 'bg-amber-100 text-amber-700 border-amber-200',
            ditolak: 'bg-red-100 text-red-700 border-red-200',
        };
        const label: Record<string, string> = {
            draft: 'Draft', submitted: 'Menunggu Persetujuan', disetujui: 'Disetujui', revisi: 'Perlu Revisi', ditolak: 'Ditolak',
        };
        return <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${map[status] || map.draft}`}>{label[status] || status}</span>;
    };

    if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                        <FileText className="w-7 h-7 text-emerald-600" /> Proposal Kegiatan
                    </h2>
                    <p className="text-stone-600 text-sm mt-1">Buat dan kelola proposal kegiatan untuk diajukan ke pengurus.</p>
                </div>
                {!showForm && (
                    <button onClick={() => { resetForm(); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25">
                        <Plus className="w-5 h-5" /> Buat Proposal
                    </button>
                )}
            </div>

            {/* ═══ FORM ═══ */}
            {showForm && (
                <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-white font-bold text-lg">{editId ? 'Edit Proposal' : 'Buat Proposal Baru'}</h3>
                        <button onClick={handleCancel} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Row 1: Judul + Jenjang */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-sm font-bold text-stone-800">Judul Kegiatan *</label>
                                <input value={judul} onChange={(e: any) => setJudul(e.target.value)} placeholder="Contoh: Workshop Persiapan Pernikahan Islami"
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-stone-800">Jenjang *</label>
                                <select value={jenjangId} onChange={e => setJenjangId(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                    {jenjangList.map((j: any) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Tanggal + Tempat */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-stone-800 flex items-center gap-1"><Calendar className="w-4 h-4" /> Tanggal Kegiatan *</label>
                                <input type="date" value={tanggalKegiatan} onChange={e => setTanggalKegiatan(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-stone-800 flex items-center gap-1"><MapPin className="w-4 h-4" /> Tempat *</label>
                                <input value={tempat} onChange={e => setTempat(e.target.value)} placeholder="Tempat pelaksanaan kegiatan"
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                        </div>

                        {/* Pendahuluan */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-stone-800">BAB I — Pendahuluan *</label>
                            <textarea value={pendahuluan} onChange={e => setPendahuluan(e.target.value)} rows={4} placeholder="Latar belakang dan dasar pemikiran kegiatan ini..."
                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y" />
                        </div>

                        {/* Jadwal / Rundown */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-stone-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-500" /> BAB II — Jadwal / Rundown Kegiatan
                            </label>
                            <div className="border border-stone-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-stone-50">
                                        <tr>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-stone-600">Kegiatan</th>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-stone-600 w-32">Jam</th>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-stone-600 w-32">PIC</th>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-stone-600">Tempat</th>
                                            <th className="w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jadwal.map((j, i) => (
                                            <tr key={i} className="border-t border-stone-100">
                                                <td className="px-2 py-1.5"><input value={j.nama_kegiatan} onChange={e => updateJadwal(i, 'nama_kegiatan', e.target.value)} placeholder="Nama kegiatan..." className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30" /></td>
                                                <td className="px-2 py-1.5"><input value={j.waktu_kegiatan} onChange={e => updateJadwal(i, 'waktu_kegiatan', e.target.value)} placeholder="08:00 - 09:00" className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30" /></td>
                                                <td className="px-2 py-1.5"><input value={j.penanggung_jawab} onChange={e => updateJadwal(i, 'penanggung_jawab', e.target.value)} placeholder="PIC..." className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30" /></td>
                                                <td className="px-2 py-1.5"><input value={j.tempat} onChange={e => updateJadwal(i, 'tempat', e.target.value)} placeholder="Tempat..." className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30" /></td>
                                                <td className="px-1 py-1.5">
                                                    {jadwal.length > 1 && (
                                                        <button onClick={() => removeJadwalRow(i)} className="p-1 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={addJadwalRow} className="text-sm text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Tambah Rundown
                            </button>
                        </div>

                        {/* Tujuan + Manfaat */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-stone-800">BAB III — Tujuan</label>
                                <textarea value={tujuan} onChange={e => setTujuan(e.target.value)} rows={3} placeholder="Tujuan pelaksanaan kegiatan..."
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-stone-800">BAB IV — Manfaat</label>
                                <textarea value={manfaat} onChange={e => setManfaat(e.target.value)} rows={3} placeholder="Manfaat kegiatan bagi peserta dan lembaga..."
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y" />
                            </div>
                        </div>

                        {/* Anggaran */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-stone-800 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-emerald-500" /> BAB V — Rencana Anggaran Biaya
                            </label>
                            <div className="border border-stone-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-stone-50">
                                        <tr>
                                            <th className="text-left px-3 py-2 text-xs font-bold text-stone-600">Item</th>
                                            <th className="text-center px-3 py-2 text-xs font-bold text-stone-600 w-16">Jml</th>
                                            <th className="text-center px-3 py-2 text-xs font-bold text-stone-600 w-20">Satuan</th>
                                            <th className="text-right px-3 py-2 text-xs font-bold text-stone-600 w-32">Harga Satuan</th>
                                            <th className="text-right px-3 py-2 text-xs font-bold text-stone-600 w-32">Total</th>
                                            <th className="w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {anggaran.map((a, i) => (
                                            <tr key={i} className="border-t border-stone-100">
                                                <td className="px-2 py-1.5"><input value={a.item} onChange={e => updateAnggaran(i, 'item', e.target.value)} placeholder="Nama item..." className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30" /></td>
                                                <td className="px-2 py-1.5"><input type="number" min={1} value={a.jumlah} onChange={e => updateAnggaran(i, 'jumlah', parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-sm text-center bg-white focus:outline-none" /></td>
                                                <td className="px-2 py-1.5"><input value={a.satuan} onChange={e => updateAnggaran(i, 'satuan', e.target.value)} className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-sm text-center bg-white focus:outline-none" /></td>
                                                <td className="px-2 py-1.5"><input type="number" min={0} value={a.harga_satuan} onChange={e => updateAnggaran(i, 'harga_satuan', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-sm text-right bg-white focus:outline-none" /></td>
                                                <td className="px-3 py-1.5 text-right font-semibold text-stone-700">{formatRupiah(a.jumlah * a.harga_satuan)}</td>
                                                <td className="px-1 py-1.5">
                                                    {anggaran.length > 1 && (
                                                        <button onClick={() => removeAnggaranRow(i)} className="p-1 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-stone-200 bg-emerald-50">
                                            <td colSpan={4} className="px-3 py-2 text-right font-bold text-stone-800">Total Anggaran:</td>
                                            <td className="px-3 py-2 text-right font-black text-emerald-700">{formatRupiah(totalAnggaran)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <button onClick={addAnggaranRow} className="text-sm text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Tambah Item
                            </button>
                        </div>

                        {/* Penutup */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-stone-800">BAB VI — Penutup</label>
                            <textarea value={penutup} onChange={e => setPenutup(e.target.value)} rows={3} placeholder="Demikian proposal ini kami sampaikan..."
                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y" />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-stone-200">
                            <button onClick={() => handleSave(false)} disabled={saving}
                                className="flex items-center gap-2 px-5 py-3 bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-sm font-bold hover:bg-stone-200 transition-all disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Draft
                            </button>
                            <button onClick={() => handleSave(true)} disabled={saving}
                                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Kirim ke Pengurus
                            </button>
                            <button onClick={handleCancel} className="px-5 py-3 text-stone-500 text-sm font-bold hover:text-stone-700">Batal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ LIST PROPOSALS ═══ */}
            {proposals.length === 0 && !showForm ? (
                <div className="text-center py-16 bg-white border border-stone-200 rounded-2xl">
                    <FileText className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-stone-400 mb-2">Belum Ada Proposal</h4>
                    <p className="text-sm text-stone-400">Klik "Buat Proposal" untuk memulai.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {proposals.map((p: any) => (
                        <div key={p.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden hover:border-emerald-200 transition-colors">
                            {/* Header row */}
                            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h4 className="font-bold text-stone-900 truncate">{p.judul}</h4>
                                        {statusBadge(p.status)}
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.tanggal_kegiatan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.tempat}</span>
                                        <span>{p.jenjang?.nama}</span>
                                        {p.total_anggaran > 0 && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatRupiah(p.total_anggaran)}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="p-2 text-stone-400 hover:text-stone-600 bg-stone-50 rounded-lg" title="Detail">
                                        {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => handleExportPDF(p)} className="p-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-lg" title="Export PDF">
                                        <FileDown className="w-4 h-4" />
                                    </button>
                                    {(p.status === 'draft' || p.status === 'revisi') && (
                                        <>
                                            <button onClick={() => handleEdit(p)} className="p-2 text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg" title="Edit">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:text-red-600 bg-red-50 rounded-lg" title="Hapus">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Catatan pengurus */}
                            {p.catatan_pengurus && (
                                <div className={`mx-5 mb-3 px-4 py-3 rounded-xl text-sm ${p.status === 'revisi' ? 'bg-amber-50 border border-amber-200 text-amber-800' : p.status === 'ditolak' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                                    <strong>Catatan Pengurus:</strong> {p.catatan_pengurus}
                                </div>
                            )}

                            {/* Expanded detail */}
                            {expandedId === p.id && (
                                <div className="border-t border-stone-100 p-5 space-y-4 bg-stone-50/50">
                                    <div><h5 className="text-xs font-bold text-stone-500 uppercase mb-1">Pendahuluan</h5><p className="text-sm text-stone-700 whitespace-pre-wrap">{p.pendahuluan}</p></div>
                                    {p.jadwal && p.jadwal.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-bold text-stone-500 uppercase mb-2">Jadwal / Rundown Kegiatan</h5>
                                            <div className="overflow-x-auto border border-stone-200 rounded-xl">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-stone-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-bold text-stone-600">Kegiatan</th>
                                                            <th className="px-3 py-2 text-left text-xs font-bold text-stone-600">Jam</th>
                                                            <th className="px-3 py-2 text-left text-xs font-bold text-stone-600">PIC</th>
                                                            <th className="px-3 py-2 text-left text-xs font-bold text-stone-600">Tempat</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-stone-100 bg-white">
                                                        {p.jadwal.map((j: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="px-3 py-2 text-stone-800">{j.nama_kegiatan}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap text-stone-600">{j.waktu_kegiatan}</td>
                                                                <td className="px-3 py-2 text-stone-600">{j.penanggung_jawab}</td>
                                                                <td className="px-3 py-2 text-stone-600">{j.tempat}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                    {p.tujuan && <div><h5 className="text-xs font-bold text-stone-500 uppercase mb-1">Tujuan</h5><p className="text-sm text-stone-700 whitespace-pre-wrap">{p.tujuan}</p></div>}
                                    {p.manfaat && <div><h5 className="text-xs font-bold text-stone-500 uppercase mb-1">Manfaat</h5><p className="text-sm text-stone-700 whitespace-pre-wrap">{p.manfaat}</p></div>}
                                    {p.penutup && <div><h5 className="text-xs font-bold text-stone-500 uppercase mb-1">Penutup</h5><p className="text-sm text-stone-700 whitespace-pre-wrap">{p.penutup}</p></div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
