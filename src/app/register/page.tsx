'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';

export default function RegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Password tidak cocok');
            return;
        }

        if (password.length < 6) {
            setError('Password minimal 6 karakter');
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess('Registrasi berhasil! Silakan login.');
            setTimeout(() => {
                router.push('/');
            }, 2000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
            {/* Playful Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[100px] animate-float"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-400/10 rounded-full blur-[120px] animate-float-delayed"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6 py-12">
                <div className="bg-white/70 backdrop-blur-2xl border border-stone-100 rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] p-10">
                    {/* Friendly Logo / Title */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl mb-6 shadow-lg shadow-emerald-500/20 animate-bounce" style={{ animationDuration: '3s' }}>
                            <UserPlus className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-stone-900 tracking-tighter">Registrasi Akun Baru</h1>
                        <p className="text-stone-500 font-medium mt-2">Silakan lengkapi formulir di bawah ini untuk pendaftaran.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 text-sm font-bold text-center animate-in fade-in zoom-in duration-300">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-sm font-bold text-center animate-in fade-in zoom-in duration-300">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5">
                            <div>
                                <label className="block text-sm font-black text-stone-900 mb-2 ml-1 uppercase tracking-widest text-[9px]">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="w-full px-5 py-3.5 bg-stone-50 border border-stone-100 rounded-[20px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                                    placeholder="Masukkan nama lengkap Anda"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-stone-900 mb-2 ml-1 uppercase tracking-widest text-[9px]">Alamat Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-5 py-3.5 bg-stone-50 border border-stone-100 rounded-[20px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                                    placeholder="nama@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-stone-900 mb-2 ml-1 uppercase tracking-widest text-[9px]">Kata Sandi</label>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-5 py-3.5 bg-stone-50 border border-stone-100 rounded-[20px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium pr-14"
                                        placeholder="Minimal 6 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-emerald-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-stone-900 mb-2 ml-1 uppercase tracking-widest text-[9px]">Ulangi Kata Sandi</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-5 py-3.5 bg-stone-50 border border-stone-100 rounded-[20px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                                    placeholder="Ulangi kata sandi"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-[20px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <UserPlus className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            )}
                            {loading ? 'Loading...' : 'Daftar Akun'}
                        </button>
                    </form>

                    <p className="text-center text-stone-500 text-sm font-medium mt-8">
                        Sudah memiliki akun?{' '}
                        <Link href="/" className="text-emerald-500 hover:text-emerald-600 font-bold underline underline-offset-4 decoration-emerald-200 hover:decoration-emerald-500 transition-all">
                            Masuk ke Akun
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
