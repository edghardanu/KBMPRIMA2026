'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { refreshProfile } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // ✅ Import singleton client, bukan buat instance baru
            const { createClient } = await import('@/lib/supabase');
            const supabase = createClient();

            const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (user) {
                await refreshProfile(); // ✅ Tunggu auth context update dulu
                router.push('/dashboard');
            }
        } catch (err) {
            setError('Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400/10 rounded-full blur-[100px] animate-float"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-400/10 rounded-full blur-[80px] animate-float-delayed"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-white/70 backdrop-blur-2xl border border-stone-100 rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] p-10">
                    {/* Logo / Title */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl mb-6 shadow-lg shadow-emerald-500/20 animate-bounce" style={{ animationDuration: '3s' }}>
                            <BookOpen className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-stone-900 tracking-tighter">Login Pengguna</h1>
                        <p className="text-stone-500 font-medium mt-2">Silakan masukkan email dan password Anda.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 text-sm font-bold text-center animate-in fade-in zoom-in duration-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-black text-stone-900 mb-2.5 ml-1 uppercase tracking-widest text-[10px]">
                                Alamat Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-[20px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium"
                                placeholder="nama@email.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-black text-stone-900 mb-2.5 ml-1 uppercase tracking-widest text-[10px]">
                                Kata Sandi
                            </label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-[20px] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/20 focus:bg-white transition-all font-medium pr-14"
                                    placeholder="••••••••"
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-[20px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            )}
                            {loading ? 'Loading...' : 'Masuk'}
                        </button>
                    </form>

                    <p className="text-center text-stone-500 text-sm font-medium mt-8">
                        Belum memiliki akun?{' '}
                        <Link
                            href="/register"
                            className="text-emerald-500 hover:text-emerald-600 font-bold underline underline-offset-4 decoration-emerald-200 hover:decoration-emerald-500 transition-all"
                        >
                            Registrasi Akun Baru
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}