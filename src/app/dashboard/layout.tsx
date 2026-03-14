'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
    AlertTriangle, Lightbulb, LogOut, Menu, X, ChevronDown,
    School, UserCheck, FileText, BarChart3, Settings, ClipboardCheck
} from 'lucide-react';
import Swal from 'sweetalert2';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    children?: { label: string; href: string }[];
}

function getNavItems(role: string): NavItem[] {
    switch (role) {
        case 'admin':
            return [
                { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: 'Kelola Pengguna', href: '/dashboard/admin/users', icon: <Users className="w-5 h-5" /> },
                { label: 'Kelola Kelas', href: '/dashboard/admin/kelas', icon: <School className="w-5 h-5" /> },
                { label: 'Kelola Murid', href: '/dashboard/admin/murid', icon: <GraduationCap className="w-5 h-5" /> },
                { label: 'Kelola Materi', href: '/dashboard/admin/materi-manage', icon: <BookOpen className="w-5 h-5" /> },
                { label: 'Rekap Absensi', href: '/dashboard/admin/absensi', icon: <ClipboardList className="w-5 h-5" /> },
                { label: 'Rekap Materi', href: '/dashboard/admin/materi', icon: <BarChart3 className="w-5 h-5" /> },
                { label: 'Kendala', href: '/dashboard/admin/kendala', icon: <AlertTriangle className="w-5 h-5" /> },
                { label: 'Saran', href: '/dashboard/admin/saran', icon: <Lightbulb className="w-5 h-5" /> },
                { label: 'Pengaturan', href: '/dashboard/admin/pengaturan', icon: <Settings className="w-5 h-5" /> },
            ];
        case 'pengurus':
            return [
                { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: 'Rekap Absensi', href: '/dashboard/pengurus/absensi', icon: <ClipboardList className="w-5 h-5" /> },
                { label: 'Rekap Materi', href: '/dashboard/pengurus/materi', icon: <BarChart3 className="w-5 h-5" /> },
                { label: 'Daftar Kelas', href: '/dashboard/pengurus/kelas', icon: <School className="w-5 h-5" /> },
                { label: 'Kendala', href: '/dashboard/pengurus/kendala', icon: <AlertTriangle className="w-5 h-5" /> },
                { label: 'Saran', href: '/dashboard/pengurus/saran', icon: <Lightbulb className="w-5 h-5" /> },
                { label: 'Persetujuan Proposal', href: '/dashboard/pengurus/proposal', icon: <ClipboardCheck className="w-5 h-5" /> },
            ];
        case 'guru':
            return [
                { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: 'Input Absensi', href: '/dashboard/guru/absensi', icon: <UserCheck className="w-5 h-5" /> },
                { label: 'Input Materi', href: '/dashboard/guru/materi', icon: <FileText className="w-5 h-5" /> },
                { label: 'Input Kendala', href: '/dashboard/guru/kendala', icon: <AlertTriangle className="w-5 h-5" /> },
                { label: 'Input Saran', href: '/dashboard/guru/saran', icon: <Lightbulb className="w-5 h-5" /> },
                { label: 'Proposal Kegiatan', href: '/dashboard/guru/proposal', icon: <ClipboardCheck className="w-5 h-5" /> },
            ];
        case 'orangtua':
            return [
                { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: 'Absensi Anak', href: '/dashboard/orangtua/absensi', icon: <ClipboardList className="w-5 h-5" /> },
                { label: 'Materi Anak', href: '/dashboard/orangtua/materi', icon: <BarChart3 className="w-5 h-5" /> },
            ];
        default:
            return [
                { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
            ];
    }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading, signOut, refreshProfile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9f5] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span className="text-stone-700 text-sm font-medium">Sedang memproses data...</span>
                </div>
            </div>
        );
    }

    if (!user) return null;

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#f8f9f5] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white shadow-sm border border-stone-300 backdrop-blur-xl border border-stone-300 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-900 mb-3">Sedang Menyiapkan Akun</h2>
                    <p className="text-stone-700 text-sm mb-6 leading-relaxed">
                        Data profil sedang disinkronisasi. Ini biasanya hanya memakan waktu beberapa detik.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={async () => {
                                await refreshProfile();
                            }}
                            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                            <UserCheck className="w-4 h-4" /> Sinkronisasi Profil Ulang
                        </button>
                        <button
                            onClick={async () => { await signOut(); router.push('/login'); }}
                            className="w-full px-4 py-3 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl text-sm font-semibold transition-colors"
                        >
                            Keluar dari Akun
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const navItems = getNavItems(profile.role);

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

    return (
        <div className="min-h-screen bg-[#fdfcfb] flex selection:bg-emerald-100 selection:text-emerald-900">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Modern Sidebar */}
            <aside
                className={`fixed lg:static inset-y-4 left-4 z-50 w-72 bg-white/80 backdrop-blur-2xl border border-stone-100 rounded-[32px] flex flex-col transition-all duration-500 soft-shadow ${sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] lg:translate-x-0'
                    }`}
            >
                {/* Sidebar Header */}
                <div className="p-8 border-b border-stone-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-stone-900 font-black text-xl tracking-tighter">PRIMA<span className="text-emerald-500">.</span></h2>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Ruang Pintar</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 text-stone-400 hover:text-stone-900 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${isActive
                                    ? 'bg-emerald-500 text-white shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)]'
                                    : 'text-stone-500 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                            >
                                <span className={`${isActive ? 'text-white' : 'text-stone-400 group-hover:text-emerald-500'}`}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info */}
                <div className="p-5 border-t border-stone-50">
                    <div className="flex items-center gap-3 p-3 bg-stone-50/50 rounded-2xl mb-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${roleColors[profile.role]} rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm`}>
                            {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-stone-900 truncate">{profile.full_name || 'User'}</p>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{roleLabels[profile.role]}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen lg:pl-4 pr-4 py-4">
                {/* Modern Top Header */}
                <header className="sticky top-4 z-30 bg-white/70 backdrop-blur-2xl border border-stone-50 px-8 py-5 rounded-[24px] soft-shadow mb-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-stone-700 hover:text-stone-900 bg-stone-100 rounded-xl"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden lg:block">
                            <h1 className="text-xl font-black text-stone-900 tracking-tight">
                                {pathname === '/dashboard/profile' ? 'Profil Saya' : (navItems.find(item => item.href === pathname)?.label || 'Dashboard')}
                            </h1>
                        </div>
                        <Link href="/dashboard/profile" className="flex items-center gap-4 group cursor-pointer hover:opacity-80 transition-all">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-sm font-bold text-stone-900">{profile.full_name}</span>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{roleLabels[profile.role]}</span>
                            </div>
                            <div className={`w-10 h-10 bg-gradient-to-tr ${roleColors[profile.role]} rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white group-hover:scale-105 transition-transform`}>
                                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 px-2">
                    {profile.role === 'pending' && pathname === '/dashboard' ? (
                        <div className="flex items-center justify-center h-full min-h-[400px]">
                            <div className="text-center max-w-md p-10 bg-white rounded-[40px] border border-stone-100 soft-shadow">
                                <div className="w-24 h-24 bg-amber-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 animate-pulse">
                                    <AlertTriangle className="w-12 h-12 text-amber-500" />
                                </div>
                                <h2 className="text-2xl font-black text-stone-900 mb-3">Verifikasi Akun Sedang Berlangsung</h2>
                                <p className="text-stone-500 font-medium leading-relaxed">
                                    Akun Anda saat ini sedang dalam proses peninjauan oleh administrator sistem. Silakan periksa kembali beberapa saat lagi.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {children}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
