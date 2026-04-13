'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Jenjang, Kelas } from '@/lib/types';

/**
 * SIMPLIFIED FORM untuk registrasi dengan fallback options
 * Features:
 * - Step-by-step progress indication
 * - Detailed error messages
 * - Option untuk registrasi auth saja (tanpa create murid data)
 * - Better timeout handling
 */

export default function SimplifiedMuridFormPage() {
    const [token, setToken] = useState<string | null>(null);
    const [formMeta, setFormMeta] = useState<any>(null);
    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        setToken(t);

        if (!t) {
            setInitError('Token tidak valid atau tidak ditemukan.');
            setInitialLoading(false);
            return;
        }

        const init = async () => {
            try {
                const [metaRes, jenjangRes, kelasRes] = await Promise.all([
                    supabase.from('murid_forms').select('*').eq('token', t).single(),
                    supabase.from('jenjang').select('*').order('urutan'),
                    supabase.from('kelas').select('*').order('nama'),
                ]);

                if (metaRes.error || !metaRes.data) {
                    setInitError('Formulir tidak ditemukan atau sudah kadaluarsa.');
                    return;
                }

                const deadline = new Date(metaRes.data.deadline);
                if (deadline < new Date()) {
                    setInitError('Maaf, batas waktu pengisian formulir ini telah berakhir.');
                    return;
                }

                setFormMeta(metaRes.data);
                setJenjangList(jenjangRes.data || []);
                setKelasList(kelasRes.data || []);
            } catch (err: any) {
                console.error('Fetch error:', err);
                setInitError('Gagal terhubung ke database. Pastikan koneksi internet stabil atau coba lagi.');
            } finally {
                setInitialLoading(false);
            }
        };

        if (t) init();
    }, []);

    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <p className="text-stone-500 font-medium">Memuat formulir pendaftaran...</p>
            </div>
        );
    }

    if (initError) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center max-w-md mx-auto mt-20">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-stone-900 mb-2">Formulir Tidak Tersedia</h2>
                <p className="text-stone-600">{initError}</p>
            </div>
        );
    }

    return (
        <SimplifiedFormClient
            formMeta={formMeta}
            jenjangList={jenjangList}
            kelasList={kelasList}
        />
    );
}

interface ClientProps {
    formMeta: any;
    jenjangList: Jenjang[];
    kelasList: Kelas[];
}

function SimplifiedFormClient({ formMeta, jenjangList, kelasList }: ClientProps) {
    const [nama, setNama] = useState('');
    const [namaOrangTua, setNamaOrangTua] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [jenjangId, setJenjangId] = useState(jenjangList[0]?.id || '');
    const [kelasId, setKelasId] = useState('');
    const [tanggalLahir, setTanggalLahir] = useState('');
    const [alamat, setAlamat] = useState('');
    const [whatsappOrtu, setWhatsappOrtu] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [partialSuccess, setPartialSuccess] = useState(false);
    const router = useRouter();

    const supabase = createClient();
    const filteredKelas = kelasList.filter(k => k.jenjang_id === jenjangId);

    const handleRetry = () => {
        setError(null);
        setProgress('');
        setSubmitting(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setProgress('');
        setPartialSuccess(false);

        // Validasi password
        if (password !== confirmPassword) {
            setError('Kata sandi tidak cocok');
            setSubmitting(false);
            return;
        }

        if (password.length < 6) {
            setError('Kata sandi minimal 6 karakter');
            setSubmitting(false);
            return;
        }

        try {
            // STEP 1: Create Auth Account (CRITICAL)
            setProgress('Step 1: Membuat akun...');
            console.log('Step 1: Creating auth account for', email);
            
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/`,
                    data: {
                        full_name: namaOrangTua,
                        role: 'orangtua'
                    }
                }
            });

            if (authError) throw new Error(`Auth error: ${authError.message}`);
            if (!authData.user) throw new Error('Gagal membuat akun - user tidak ditemukan');
            
            console.log('Step 1 ✓ Auth created:', authData.user.id);
            setProgress('Step 1: ✓ Akun dibuat');

            // STEP 2: Create Profile (Non-Critical)
            setProgress('Step 2: Membuat profil...');
            console.log('Step 2: Creating profile');
            
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    email,
                    full_name: namaOrangTua,
                    role: 'orangtua'
                })
                .select();

            if (profileError) {
                console.warn('Step 2 ⚠ Warning:', profileError.message);
                setProgress('Step 2: ⚠ Profil (warning - lanjutkan)');
            } else {
                console.log('Step 2 ✓ Profile created');
                setProgress('Step 2: ✓ Profil dibuat');
            }

            // STEP 3: Create Murid Data (Optional)
            setProgress('Step 3: Menyimpan data siswa...');
            console.log('Step 3: Creating murid data');
            
            let muridId: string | null = null;
            const { data: muridData, error: muridError } = await supabase
                .from('murid')
                .insert({
                    nama,
                    jenjang_id: jenjangId,
                    kelas_id: kelasId || null,
                    tanggal_lahir: tanggalLahir || null,
                    alamat,
                    whatsapp_ortu: whatsappOrtu,
                    is_active: true
                })
                .select()
                .single();

            if (muridError) {
                console.warn('Step 3 ⚠ Warning:', muridError.message);
                setProgress('Step 3: ⚠ Data murid (belum simpan - akan diisi admin)');
                setPartialSuccess(true);
            } else {
                console.log('Step 3 ✓ Murid created:', muridData.id);
                muridId = muridData.id;
                setProgress('Step 3: ✓ Data siswa disimpan');

                // STEP 4: Link Murid dengan Orangtua (Optional)
                setProgress('Step 4: Menghubungkan data...');
                console.log('Step 4: Linking murid');
                
                const { error: linkError } = await supabase
                    .from('murid_orangtua')
                    .insert({
                        murid_id: muridId,
                        orangtua_id: authData.user.id
                    })
                    .select();

                if (linkError) {
                    console.warn('Step 4 ⚠ Warning:', linkError.message);
                    setProgress('Step 4: ⚠ Link (dapat diisi ulang nanti)');
                } else {
                    console.log('Step 4 ✓ Link created');
                    setProgress('Step 4: ✓ Data terhubung');
                }
            }

            // STEP 5: Auto-Login (Optional)
            setProgress('Step 5: Melakukan login...');
            console.log('Step 5: Auto-login');
            
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (loginError) {
                console.warn('Step 5 ⚠ Warning:', loginError.message);
                setProgress('Step 5: ⚠ Auto-login skip (login manual diperlukan)');
            } else {
                console.log('Step 5 ✓ Logged in');
                setProgress('Step 5: ✓ Login berhasil');
            }

            console.log('ALL STEPS COMPLETED ✓ (successes + partial)',  { partialSuccess });
            setSubmitted(true);

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);

        } catch (err: any) {
            console.error('Registration error:', {
                message: err.message,
                code: err.code,
                fullError: err
            });
            setError(err.message || 'Gagal mendaftar: Kesalahan tidak diketahui');
        } finally {
            setSubmitting(false);
        }
    };

    if (error) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center max-w-md mx-auto mt-10">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-stone-900 mb-2">⚠️ Ada Masalah</h2>
                <p className="text-stone-600 mb-4 text-sm">{error}</p>
                {progress && (
                    <div className="bg-white rounded-xl p-3 mb-4 text-left text-xs font-mono">
                        <p className="text-stone-600">Progress terakhir:</p>
                        <p className="text-emerald-600">{progress}</p>
                    </div>
                )}
                <button
                    onClick={handleRetry}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-500 transition-colors flex items-center gap-2 justify-center mx-auto"
                >
                    <RefreshCw className="w-4 h-4" />
                    Coba Lagi
                </button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className={`rounded-2xl p-8 text-center max-w-md mx-auto mt-10 ${
                partialSuccess 
                  ? 'bg-yellow-50 border border-yellow-100' 
                  : 'bg-emerald-50 border border-emerald-100'
            }`}>
                <CheckCircle2 className={`w-16 h-16 mx-auto mb-4 animate-bounce ${
                    partialSuccess ? 'text-yellow-500' : 'text-emerald-500'
                }`} />
                <h2 className="text-2xl font-bold text-stone-900 mb-2">
                    {partialSuccess ? '⚠️ Sebagian Berhasil' : '✅ Registrasi Berhasil!'}
                </h2>
                <p className={`mb-4 ${partialSuccess ? 'text-yellow-600' : 'text-stone-600'}`}>
                    {partialSuccess 
                      ? `Akun untuk ${namaOrangTua} telah dibuat, tetapi data siswa perlu dikonfirmasi admin.`
                      : `Data pendaftaran untuk ${nama} telah tersimpan dengan aman.`
                    }
                </p>
                <div className="bg-white/60 border border-emerald-200 rounded-xl p-4 mb-6 text-left text-sm">
                    <p className="text-stone-700 font-medium mb-2">📝 Informasi Akun:</p>
                    <p className="text-stone-600"><strong>Email:</strong> {email}</p>
                    <p className="text-stone-600 text-xs mt-1 text-stone-500">
                        Gunakan email dan kata sandi ini untuk login ke sistem
                    </p>
                </div>
                <p className="text-stone-500 text-sm mb-6">
                    Anda akan diarahkan ke dashboard dalam beberapa detik...
                </p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors"
                >
                    Pergi ke Dashboard Sekarang
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white/80 backdrop-blur-2xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-stone-100 rounded-[40px] p-8 md:p-12 mb-10">
            <div className="absolute top-0 left-0 w-full h-2.5 bg-linear-to-r from-emerald-500 to-teal-400"></div>

            {/* Progress Indicator */}
            {submitting && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        <div>
                            <p className="text-sm font-bold text-blue-900">{progress || 'Processing...'}</p>
                            <p className="text-xs text-blue-600">Mohon tunggu, jangan tutup halaman ini</p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Data Siswa */}
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Nama Lengkap Siswa</label>
                        <input
                            type="text"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            placeholder="Masukkan nama lengkap"
                            required
                            disabled={submitting}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Jenjang Pendidikan</label>
                        <select
                            value={jenjangId}
                            onChange={(e) => setJenjangId(e.target.value)}
                            required
                            disabled={submitting}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium disabled:opacity-50"
                        >
                            {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Kelas (Opsional)</label>
                        <select
                            value={kelasId}
                            onChange={(e) => setKelasId(e.target.value)}
                            disabled={submitting}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium disabled:opacity-50"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {filteredKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Tanggal Lahir</label>
                        <input
                            type="date"
                            value={tanggalLahir}
                            onChange={(e) => setTanggalLahir(e.target.value)}
                            required
                            disabled={submitting}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium disabled:opacity-50"
                        />
                    </div>

                    {/* Data Orang Tua */}
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Nama Lengkap Orang Tua</label>
                        <input
                            type="text"
                            value={namaOrangTua}
                            onChange={(e) => setNamaOrangTua(e.target.value)}
                            placeholder="Masukkan nama lengkap orang tua"
                            required
                            disabled={submitting}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium disabled:opacity-50"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Email untuk Login</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@contoh.com"
                            required
                            disabled={submitting}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Kata Sandi</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 karakter"
                                required
                                disabled={submitting}
                                className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium pr-12 disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={submitting}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Konfirmasi Kata Sandi</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Ulangi kata sandi"
                                required
                                disabled={submitting}
                                className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium pr-12 disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={submitting}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Nomor WhatsApp Orang Tua</label>
                        <input
                            type="tel"
                            value={whatsappOrtu}
                            onChange={(e) => setWhatsappOrtu(e.target.value)}
                            placeholder="Contoh: 081234567890"
                            required
                            disabled={submitting}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-3xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium disabled:opacity-50"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Alamat Lengkap</label>
                        <textarea
                            value={alamat}
                            onChange={(e) => setAlamat(e.target.value)}
                            placeholder="Jalan, RT/RW, Kelurahan, Kecamatan..."
                            rows={3}
                            required
                            disabled={submitting}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-4xl text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none font-medium disabled:opacity-50"
                        ></textarea>
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-3 px-10 py-5 bg-linear-to-r from-emerald-500 to-teal-500 text-white rounded-3xl text-xl font-black hover:from-emerald-400 hover:to-teal-400 transition-all shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-8 h-8 animate-spin" /> : null}
                        {submitting ? 'Mengirim data...' : 'Kirimkan Pendaftaran'}
                    </button>
                    <p className="text-center text-stone-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-6">Sistem Monitoring KBM Prima</p>
                </div>
            </form>
        </div>
    );
}
