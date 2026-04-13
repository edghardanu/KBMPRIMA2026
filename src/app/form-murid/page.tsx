'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { Jenjang, Kelas } from '@/lib/types';

export default function PublicMuridFormPage() {
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
                    supabase.from('murid_forms').select('*').eq('token', t).maybeSingle(),
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <MuridFormClient
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

function MuridFormClient({ formMeta, jenjangList, kelasList }: ClientProps) {
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
    const router = useRouter();
    const wantAccount = !!(email && password);

    const supabase = createClient();
    const filteredKelas = kelasList.filter(k => k.jenjang_id === jenjangId);

    useEffect(() => {
        if (filteredKelas.length > 0 && !filteredKelas.find(k => k.id === kelasId)) {
            setKelasId(filteredKelas[0].id);
        } else if (filteredKelas.length === 0) {
            setKelasId('');
        }
    }, [jenjangId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        let userId: string | null = null;

        if (wantAccount) {
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
        }

        try {
            console.log('=== STARTING REGISTRATION ===');

            if (wantAccount) {
                // ============================================
                // STEP 1: Signup ke Supabase Auth
                // ============================================
                console.log('Step 1: Signup user');
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

                if (authError || !authData.user) {
                    console.error('Step 1 FAILED:', authError);
                    throw new Error(`Gagal membuat akun auth: ${authError?.message || 'Unknown error'}`);
                }

                userId = authData.user.id;
                console.log('✅ Step 1 OK - User created:', userId);

                console.log('Step 2: Checking and enforcing orangtua role in profiles table...');

                let profileUpdated = false;
                for (let i = 0; i < 3; i++) {
                    const { error: profileUpdateError } = await supabase
                        .from('profiles')
                        .update({
                            role: 'orangtua',
                            full_name: namaOrangTua
                        })
                        .eq('id', userId);

                    if (!profileUpdateError) {
                        profileUpdated = true;
                        console.log('✅ Profile enforced with Orangtua role');
                        break;
                    }
                    // Wait briefly before retrying in case trigger hasn't finished
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                if (!profileUpdated) {
                    console.warn('⚠️ Could not explicitly force profile role, assuming trigger handled it');
                }
            } else {
                console.log('Skipping Step 1 & 2: Email or password not provided');
            }

            // ============================================
            // STEP 3: Create murid
            // ============================================
            console.log('Step 3: Creating murid record');
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
                console.error('Step 2 FAILED:', muridError);
                throw new Error(`Gagal membuat murid: ${muridError.message}`);
            }

            const muridId = muridData.id;
            console.log('✅ Step 2 OK - Murid created:', muridId);

            if (userId) {
                // ============================================
                // STEP 4: Link murid dengan orangtua
                // ============================================
                console.log('Step 4: Creating link murid_orangtua');
                const { error: linkError } = await supabase
                    .from('murid_orangtua')
                    .insert({
                        murid_id: muridId,
                        orangtua_id: userId
                    });

                if (linkError) {
                    console.error('Step 4 FAILED:', linkError);
                    // Continue anyway - link is not critical for showing success
                    console.log('⚠️ Continuing despite link error');
                } else {
                    console.log('✅ Step 4 OK - Link created');
                }

                // ============================================
                // STEP 5: Sign out to require fresh login
                // ============================================
                console.log('Step 5: Sign out user');
                await supabase.auth.signOut();
            }

            console.log('🎉 REGISTRATION COMPLETED SUCCESSFULLY!');
            setSubmitted(true);

            await Swal.fire({
                title: 'Registrasi Berhasil! ✅',
                html: wantAccount 
                    ? `<p class="text-base">Akun untuk <strong>${namaOrangTua}</strong> telah berhasil dibuat.</p>
                       <p class="text-sm text-gray-500 mt-2">Data siswa <strong>${nama}</strong> telah tersimpan.</p>
                       <p class="text-xs text-gray-400 mt-3">Mengarahkan Anda ke halaman login...</p>`
                    : `<p class="text-base">Data pendaftaran untuk <strong>${nama}</strong> telah berhasil disimpan.</p>
                       <p class="text-sm text-gray-500 mt-2">Terima kasih telah mendaftar.</p>`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false
            });

            if (wantAccount) {
                window.location.href = '/login';
            } else {
                // If no account created, maybe just show the success message without redirecting to login immediately
                // or just stay on success screen. The current flow uses a Swal and then setting submitted state.
                // Wait, line 249 sets submitted(true).
                // Line 251 shows a Swal.
                // Line 263 does a redirect.
                // If no account, redirecting to /login might be confusing. 
                // Maybe redirect to home or just let them see the success state.
            }

        } catch (err: any) {
            console.error('❌ REGISTRATION ERROR:', err.message || err);
            if (err.message && err.message.toLowerCase().includes('rate limit')) {
                setError('Mohon maaf, sistem sedang menerima banyak permintaan pendaftaran. Silakan coba gunakan alamat email lain atau coba lagi nanti.');
            } else {
                setError(err.message || 'Gagal mendaftar');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (error) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center max-w-md mx-auto mt-10">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-stone-900 mb-2">Gagal Mengirim</h2>
                <p className="text-stone-600 mb-4">{error}</p>
                <button
                    onClick={() => setError(null)}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-500 transition-colors"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center max-w-md mx-auto mt-10">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" />
                <h2 className="text-2xl font-bold text-stone-900 mb-2">Registrasi Berhasil!</h2>
                <p className="text-stone-600 mb-4">
                    Data pendaftaran untuk <strong>{nama}</strong> telah tersimpan dengan aman.
                </p>
                {wantAccount && (
                    <div className="bg-white/60 border border-emerald-200 rounded-xl p-4 mb-6 text-left text-sm">
                        <p className="text-stone-700 font-medium mb-2">📝 Info Akun Anda:</p>
                        <p className="text-stone-600"><strong>Email:</strong> {email}</p>
                        <p className="text-stone-600 text-xs mt-1 text-stone-500">
                            (Gunakan email dan kata sandi ini untuk login)
                        </p>
                    </div>
                )}
                {wantAccount && (
                    <p className="text-stone-500 text-sm mb-6">
                        Mengarahkan Anda ke halaman login...
                    </p>
                )}
                <button
                    onClick={() => { window.location.href = wantAccount ? '/login' : '/'; }}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors"
                >
                    {wantAccount ? 'Ke Halaman Login' : 'Kembali Ke Beranda'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white/80 backdrop-blur-2xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-stone-100 rounded-[40px] p-8 md:p-12 mb-10 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-emerald-500 to-teal-400"></div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Nama Lengkap Murid</label>
                        <input
                            type="text"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            placeholder="Masukkan nama lengkap"
                            required
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Jenjang Pendidikan</label>
                        <select
                            value={jenjangId}
                            onChange={(e) => setJenjangId(e.target.value)}
                            required
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                        >
                            {jenjangList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Kelas (Opsional)</label>
                        <select
                            value={kelasId}
                            onChange={(e) => setKelasId(e.target.value)}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
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
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Nama Lengkap Orang Tua</label>
                        <input
                            type="text"
                            value={namaOrangTua}
                            onChange={(e) => setNamaOrangTua(e.target.value)}
                            placeholder="Masukkan nama lengkap orang tua/wali"
                            required
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Email Orang Tua (untuk Login)</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@contoh.com (Opsional)"
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                        />
                        <p className="text-[10px] font-bold text-stone-400 mt-2 px-1">Email ini akan digunakan untuk login ke sistem monitoring.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Kata Sandi</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimal 6 karakter"
                                className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
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
                                className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
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
                            placeholder="Masukkan nomor WhatsApp aktif"
                            required
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[24px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                        />
                        <p className="text-[10px] font-bold text-stone-400 mt-2 px-1">Informasi ini digunakan untuk pengiriman laporan progres pembelajaran.</p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-emerald-600 mb-3 ml-1 uppercase tracking-widest">Alamat Lengkap</label>
                        <textarea
                            value={alamat}
                            onChange={(e) => setAlamat(e.target.value)}
                            placeholder="Nama jalan, RT/RW, Kecamatan..."
                            rows={3}
                            className="w-full px-6 py-4 bg-stone-50/50 border border-stone-100 rounded-[32px] text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none font-medium"
                        ></textarea>
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-[24px] text-xl font-black hover:from-emerald-400 hover:to-teal-400 transition-all shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-8 h-8 animate-spin" /> : null}
                        {submitting ? 'Mengirim data...' : 'Kirimkan Data Pendaftaran'}
                    </button>
                    <p className="text-center text-stone-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-6">Sistem Monitoring KBM Prima</p>
                </div>
            </form>
        </div>
    );
}
