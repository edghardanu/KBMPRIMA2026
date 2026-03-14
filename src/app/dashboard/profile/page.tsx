'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { LogOut, User, Mail, ShieldCheck, Calendar, Edit2, Save, X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ProfilePage() {
    const { user, profile, signOut, refreshProfile } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setEditName(profile.full_name || '');
        }
    }, [profile]);

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            Swal.fire('Error', 'Nama lengkap tidak boleh kosong', 'error');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editName.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id);

            if (error) throw error;

            await refreshProfile();

            Swal.fire({
                title: 'Berhasil!',
                text: 'Profil berhasil diperbarui.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            });
            setIsEditing(false);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            Swal.fire('Gagal', error.message || 'Terjadi kesalahan saat menyimpan profil', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        const confirm = await Swal.fire({
            title: 'Konfirmasi Keluar',
            text: "Apakah Anda yakin ingin keluar dari aplikasi?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Keluar!',
            cancelButtonText: 'Batal'
        });

        if (confirm.isConfirmed) {
            await signOut();
            router.push('/login');
        }
    };

    if (!profile || !user) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const roleLabels: Record<string, string> = {
        admin: 'Administrator',
        pengurus: 'Pengurus',
        guru: 'Guru',
        orangtua: 'Orang Tua',
        pending: 'Menunggu Verifikasi',
    };

    const roleColors: Record<string, string> = {
        admin: 'from-red-500 to-rose-600',
        pengurus: 'from-amber-500 to-orange-600',
        guru: 'from-emerald-500 to-teal-600',
        orangtua: 'from-emerald-500 to-teal-600',
        pending: 'from-gray-500 to-gray-600',
    };

    const getInitials = (name: string) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-stone-900 tracking-tighter mb-2">Halaman Profil</h2>
                <p className="text-stone-500 font-medium">Informasi akun dan pengaturan sesi Anda.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-stone-100 rounded-[32px] p-8 soft-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                    <div className={`w-32 h-32 bg-gradient-to-tr ${roleColors[profile.role] || 'from-stone-400 to-stone-500'} rounded-[32px] flex items-center justify-center text-white font-black text-5xl shadow-xl shadow-emerald-500/20 rotate-3 hover:rotate-6 transition-transform`}>
                        {getInitials(profile.full_name)}
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <h3 className="text-3xl font-black text-stone-900 mb-2">{profile.full_name}</h3>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold uppercase tracking-widest border border-emerald-100 shadow-sm">
                                <ShieldCheck className="w-4 h-4" />
                                {roleLabels[profile.role] || profile.role}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    <div className="p-5 bg-stone-50 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-stone-400 shrink-0">
                                <User className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Nama Lengkap</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        disabled={saving}
                                        className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-stone-900 bg-white"
                                        autoFocus
                                    />
                                ) : (
                                    <p className="font-bold text-stone-900 text-sm">{profile.full_name}</p>
                                )}
                            </div>
                        </div>
                        <div>
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        disabled={saving}
                                        className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
                                        title="Batal"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                        title="Simpan"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                    title="Edit Nama"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-5 bg-stone-50 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-stone-400">
                            <Mail className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Email</p>
                            <p className="font-bold text-stone-900 text-sm truncate">{user.email}</p>
                        </div>
                    </div>
                    {profile.created_at && (
                        <div className="p-5 bg-stone-50 rounded-2xl flex items-center gap-4 md:col-span-2">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-stone-400">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Terdaftar Sejak</p>
                                <p className="font-bold text-stone-900 text-sm">
                                    {new Date(profile.created_at).toLocaleDateString('id-ID', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-stone-100 pt-8 flex justify-center md:justify-end">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:-translate-y-1 active:scale-95"
                    >
                        <LogOut className="w-5 h-5" />
                        Keluar dari Aplikasi
                    </button>
                </div>
            </div>
        </div>
    );
}
