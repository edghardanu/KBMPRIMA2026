'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/lib/supabase';
import { exportProposalToPDF } from '@/lib/pdf-export';
import {
    FileText, CheckCircle, XCircle, RotateCcw, Eye, FileDown,
    ChevronUp, Calendar, MapPin, DollarSign, User, Filter,
    Loader2, MessageSquare, Clock, Search
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function PengurusProposalPage() {
    const { profile } = useAuth();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [proposals, setProposals] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchProposals();
    }, []);

    const fetchProposals = async () => {
        const { data } = await supabase
            .from('proposal_kegiatan')
            .select('*, jenjang(nama), creator:profiles!proposal_kegiatan_created_by_fkey(full_name)')
            .in('status', ['submitted', 'disetujui', 'revisi', 'ditolak'])
            .order('created_at', { ascending: false });
        setProposals(data || []);
        setLoading(false);
    };

    const handleReview = async (proposalId: string, action: 'disetujui' | 'revisi' | 'ditolak') => {
        const actionLabel = action === 'disetujui' ? 'Setujui' : action === 'revisi' ? 'Minta Revisi' : 'Tolak';
        const actionColor = action === 'disetujui' ? '#10b981' : action === 'revisi' ? '#f59e0b' : '#ef4444';

        const result = await Swal.fire({
            title: `${actionLabel} Proposal?`,
            input: 'textarea',
            inputLabel: 'Catatan untuk Guru (opsional)',
            inputPlaceholder: action === 'revisi' ? 'Jelaskan bagian mana yang perlu direvisi...' : 'Tulis catatan jika ada...',
            showCancelButton: true,
            confirmButtonColor: actionColor,
            confirmButtonText: actionLabel,
            cancelButtonText: 'Batal',
            inputValidator: (value) => {
                if (action === 'revisi' && !value?.trim()) {
                    return 'Catatan wajib diisi saat meminta revisi.';
                }
                return null;
            },
        });

        if (!result.isConfirmed) return;

        setProcessing(proposalId);
        try {
            const { data, error } = await supabase
                .from('proposal_kegiatan')
                .update({
                    status: action,
                    catatan_pengurus: result.value || '',
                    reviewed_by: profile?.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', proposalId)
                .select('*, jenjang(nama), creator:profiles!proposal_kegiatan_created_by_fkey(full_name)')
                .single();

            if (error) throw error;

            Swal.fire({
                icon: 'success',
                title: action === 'disetujui' ? 'Proposal Disetujui!' : action === 'revisi' ? 'Revisi Diminta' : 'Proposal Ditolak',
                timer: 1500, showConfirmButton: false,
            });
            
            // Update local state instead of re-fetching
            setProposals(prev => prev.map(p => p.id === proposalId ? data : p));
        } catch (error: any) {
            Swal.fire('Gagal', error.message, 'error');
        } finally {
            setProcessing(null);
        }
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
            pembuatNama: p.creator?.full_name || '-',
            status: p.status,
        });
    };

    const formatRupiah = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            submitted: 'bg-blue-100 text-blue-700 border-blue-200',
            disetujui: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            revisi: 'bg-amber-100 text-amber-700 border-amber-200',
            ditolak: 'bg-red-100 text-red-700 border-red-200',
        };
        const label: Record<string, string> = {
            submitted: 'Menunggu Review', disetujui: 'Disetujui', revisi: 'Revisi Diminta', ditolak: 'Ditolak',
        };
        return <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${map[status] || ''}`}>{label[status] || status}</span>;
    };

    // Filter proposals
    const filtered = proposals.filter(p => {
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;
        if (searchTerm && !p.judul.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !p.creator?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const pendingCount = proposals.filter(p => p.status === 'submitted').length;

    if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                    <FileText className="w-7 h-7 text-emerald-600" />
                    Persetujuan Proposal
                    {pendingCount > 0 && (
                        <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full font-bold">{pendingCount} menunggu</span>
                    )}
                </h2>
                <p className="text-stone-600 text-sm mt-1">Review dan setujui proposal kegiatan yang diajukan oleh guru.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari judul atau nama guru..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option value="all">Semua Status</option>
                    <option value="submitted">Menunggu Review</option>
                    <option value="disetujui">Disetujui</option>
                    <option value="revisi">Revisi</option>
                    <option value="ditolak">Ditolak</option>
                </select>
            </div>

            {/* Proposal List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white border border-stone-200 rounded-2xl">
                    <FileText className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-stone-400 mb-2">Tidak Ada Proposal</h4>
                    <p className="text-sm text-stone-400">
                        {filterStatus !== 'all' ? 'Tidak ada proposal dengan status ini.' : 'Belum ada proposal yang diajukan.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(p => (
                        <div key={p.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${p.status === 'submitted' ? 'border-blue-200 shadow-sm shadow-blue-50' : 'border-stone-200'}`}>
                            {/* Header card */}
                            <div className="p-5">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            {statusBadge(p.status)}
                                            {p.status === 'submitted' && (
                                                <span className="flex items-center gap-1 text-xs text-blue-500">
                                                    <Clock className="w-3 h-3" /> Perlu ditinjau
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-stone-900 text-lg mb-1">{p.judul}</h4>
                                        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.creator?.full_name || '-'}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.tanggal_kegiatan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.tempat}</span>
                                            <span>{p.jenjang?.nama}</span>
                                            {p.total_anggaran > 0 && <span className="flex items-center gap-1 font-bold text-emerald-600"><DollarSign className="w-3 h-3" />{formatRupiah(p.total_anggaran)}</span>}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                            className="p-2 text-stone-400 hover:text-stone-600 bg-stone-50 rounded-lg" title="Detail">
                                            {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => handleExportPDF(p)}
                                            className="p-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-lg" title="Export PDF">
                                            <FileDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Catatan pengurus (jika sudah ada) */}
                                {p.catatan_pengurus && (
                                    <div className={`mt-3 px-4 py-3 rounded-xl text-sm ${p.status === 'revisi' ? 'bg-amber-50 border border-amber-200 text-amber-800' : p.status === 'ditolak' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                                        <span className="flex items-center gap-1 font-bold mb-1"><MessageSquare className="w-3 h-3" /> Catatan Anda:</span>
                                        {p.catatan_pengurus}
                                    </div>
                                )}

                                {/* Review buttons — only for submitted */}
                                {p.status === 'submitted' && (
                                    <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-stone-100">
                                        <button onClick={() => handleReview(p.id, 'disetujui')} disabled={processing === p.id}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50">
                                            {processing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Setujui
                                        </button>
                                        <button onClick={() => handleReview(p.id, 'revisi')} disabled={processing === p.id}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-400 transition-all disabled:opacity-50">
                                            {processing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Minta Revisi
                                        </button>
                                        <button onClick={() => handleReview(p.id, 'ditolak')} disabled={processing === p.id}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-400 transition-all disabled:opacity-50">
                                            {processing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Tolak
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Expanded: Full Preview */}
                            {expandedId === p.id && (
                                <div className="border-t border-stone-100 p-5 space-y-4 bg-stone-50/50">
                                    {p.pendahuluan && <div><h5 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">I. Pendahuluan</h5><p className="text-sm text-stone-700 whitespace-pre-wrap">{p.pendahuluan}</p></div>}
                                    {p.jadwal && p.jadwal.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">II. Jadwal / Rundown</h5>
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
                                    {p.tujuan && <div><h5 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">III. Tujuan</h5><p className="text-sm text-stone-700 whitespace-pre-wrap">{p.tujuan}</p></div>}
                                    {p.manfaat && <div><h5 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">IV. Manfaat</h5><p className="text-sm text-stone-700 whitespace-pre-wrap">{p.manfaat}</p></div>}

                                    {/* Tabel Anggaran */}
                                    {p.anggaran && p.anggaran.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">V. Rencana Anggaran Biaya</h5>
                                            <div className="border border-stone-200 rounded-xl overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-emerald-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-bold text-stone-600">No</th>
                                                            <th className="px-3 py-2 text-left text-xs font-bold text-stone-600">Item</th>
                                                            <th className="px-3 py-2 text-center text-xs font-bold text-stone-600">Jml</th>
                                                            <th className="px-3 py-2 text-center text-xs font-bold text-stone-600">Satuan</th>
                                                            <th className="px-3 py-2 text-right text-xs font-bold text-stone-600">Harga Satuan</th>
                                                            <th className="px-3 py-2 text-right text-xs font-bold text-stone-600">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {p.anggaran.map((a: any, i: number) => (
                                                            <tr key={i} className="border-t border-stone-100">
                                                                <td className="px-3 py-2 text-stone-600">{i + 1}</td>
                                                                <td className="px-3 py-2 text-stone-800">{a.item}</td>
                                                                <td className="px-3 py-2 text-center text-stone-600">{a.jumlah}</td>
                                                                <td className="px-3 py-2 text-center text-stone-600">{a.satuan}</td>
                                                                <td className="px-3 py-2 text-right text-stone-600">{formatRupiah(a.harga_satuan)}</td>
                                                                <td className="px-3 py-2 text-right font-semibold text-stone-800">{formatRupiah(a.jumlah * a.harga_satuan)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t-2 border-stone-200 bg-emerald-50">
                                                            <td colSpan={5} className="px-3 py-2 text-right font-bold text-stone-800">Total Anggaran:</td>
                                                            <td className="px-3 py-2 text-right font-black text-emerald-700">{formatRupiah(p.total_anggaran)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {p.penutup && <div><h5 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">VII. Penutup</h5><p className="text-sm text-stone-700 whitespace-pre-wrap">{p.penutup}</p></div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
