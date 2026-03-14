'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile, Role } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Search, Loader2, Pencil, Trash2, X, Check } from 'lucide-react';

const ROWS_PER_PAGE = 50;

const ROLES: { value: Role; label: string; color: string }[] = [
    { value: 'admin', label: 'Admin', color: 'bg-red-500/20 text-red-400' },
    { value: 'pengurus', label: 'Pengurus', color: 'bg-amber-500/20 text-amber-400' },
    { value: 'guru', label: 'Guru', color: 'bg-emerald-500/20 text-emerald-600' },
    { value: 'orangtua', label: 'Orang Tua', color: 'bg-emerald-500/20 text-emerald-600' },
    { value: 'pending', label: 'Pending', color: 'bg-gray-500/20 text-gray-400' },
];

interface Toast {
    message: string;
    type: 'success' | 'error';
}

interface EditUserModalProps {
    user: Profile | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, data: { full_name: string; email: string }) => Promise<void>;
}

function EditUserModal({ user, isOpen, onClose, onSave }: EditUserModalProps) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(user.id, { full_name: fullName, email });
            onClose();
        } catch (error) {
            console.error('Error saving user:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-stone-900">Edit Pengguna</h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            Nama Lengkap
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Simpan</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AdminUsersPage() {
    const { profile: currentProfile } = useAuth();
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [toast, setToast] = useState<Toast | null>(null);
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const supabase = createClient();

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchUsers = async (searchTerm = '', pageNumber = 1) => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('id, full_name, email, role, created_at');

            if (searchTerm) {
                query = query
                    .ilike('full_name', `%${searchTerm}%`)
                    .or('email.ilike.%' + searchTerm + '%');
            }

            const start = (pageNumber - 1) * ROWS_PER_PAGE;
            const end = start + ROWS_PER_PAGE - 1;

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .range(start, end);

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
            showToast('Gagal memuat data pengguna', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refetch on search or page change (debounced)
    useEffect(() => {
        if (search === '' && page === 1) return;
        const timer = setTimeout(() => {
            fetchUsers(search, page);
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, page]);

    const updateRole = async (userId: string, newRole: Role) => {
        setUpdating(userId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;

            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
            );
            showToast('Role berhasil diperbarui', 'success');
        } catch (error) {
            console.error('Error updating role:', error);
            showToast('Gagal memperbarui role', 'error');
        } finally {
            setUpdating(null);
        }
    };

    const handleEditUser = async (userId: string, data: { full_name: string; email: string }) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: data.full_name,
                    email: data.email,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === userId
                        ? { ...u, full_name: data.full_name, email: data.email }
                        : u
                )
            );
            showToast('Data pengguna berhasil diperbarui', 'success');
        } catch (error) {
            console.error('Error updating user:', error);
            showToast('Gagal memperbarui data pengguna', 'error');
            throw error;
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setDeleting(userId);
        try {
            // Pada Supabase, jika RLS mencegah Delete, fungsi tidak melempar error, melainkan menghapus 0 baris.
            // Kita harus memanggil .select() untuk memastikan baris tersebut benar-benar berhasil terhapus.
            const { data, error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("Penghapusan diblokir oleh RLS (Row Level Security) atau karena user ini menjadi referensi di tabel lain. Anda perlu mengatur izin Policy di database Supabase.");
            }

            setUsers((prev) => prev.filter((u) => u.id !== userId));
            showToast('Pengguna berhasil dihapus', 'success');
            setShowDeleteConfirm(null);
        } catch (error: any) {
            console.error('Error deleting user:', error);
            showToast(error.message || 'Gagal menghapus pengguna', 'error');
        } finally {
            setDeleting(null);
        }
    };

    if (currentProfile?.role !== 'admin') {
        return (
            <div className="text-center text-red-400 py-20">
                Akses ditolak. Hanya admin yang dapat mengakses halaman ini.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slideIn ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Edit Modal */}
            <EditUserModal
                user={editingUser}
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                onSave={handleEditUser}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-stone-900 mb-2">Konfirmasi Hapus</h3>
                        <p className="text-stone-600 mb-6">
                            Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleDeleteUser(showDeleteConfirm)}
                                disabled={deleting === showDeleteConfirm}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                            >
                                {deleting === showDeleteConfirm ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menghapus...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span>Hapus</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Kelola Pengguna</h2>
                    <p className="text-stone-700 text-sm">Atur role untuk setiap pengguna terdaftar</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Cari pengguna..."
                        className="pl-10 pr-4 py-2.5 bg-white shadow-sm border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm w-full sm:w-64"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="bg-white shadow-sm border border-stone-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-100">
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-500 uppercase tracking-wider">Nama</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-500 uppercase tracking-wider">Email</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-500 uppercase tracking-wider">Role</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-500 uppercase tracking-wider">Terdaftar</th>
                                    <th className="text-left px-6 py-4 text-xs font-medium text-stone-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-stone-900 font-medium">{user.full_name || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-stone-600">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${ROLES.find(r => r.value === user.role)?.color}`}>
                                                {ROLES.find(r => r.value === user.role)?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-stone-600">
                                            {new Date(user.created_at).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                {/* Role Select */}
                                                {updating === user.id ? (
                                                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                                                ) : (
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => updateRole(user.id, e.target.value as Role)}
                                                        className="bg-white border border-stone-200 rounded-lg text-stone-900 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                    >
                                                        {ROLES.map((r) => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit pengguna"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => setShowDeleteConfirm(user.id)}
                                                    disabled={deleting === user.id}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Hapus pengguna"
                                                >
                                                    {deleting === user.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="text-center py-12 text-stone-500">Tidak ada pengguna ditemukan</div>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-stone-50">
                        <button
                            className="px-3 py-1 rounded-lg bg-stone-100 text-stone-700 text-sm disabled:opacity-40"
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            ← Sebelumnya
                        </button>
                        <span className="text-sm text-stone-600">Halaman {page}</span>
                        <button
                            className="px-3 py-1 rounded-lg bg-stone-100 text-stone-700 text-sm disabled:opacity-40"
                            disabled={users.length < ROWS_PER_PAGE}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Berikutnya →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}