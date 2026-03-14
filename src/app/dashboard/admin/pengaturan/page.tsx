'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { sendDailyReports } from '@/lib/whatsapp';
import {
    Settings, Save, Loader2, Send, MessageCircle, Phone, Key,
    Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, History,
    Smartphone, Bot, Zap, CalendarClock, Power, Copy, ExternalLink,
    ToggleLeft, ToggleRight, Timer
} from 'lucide-react';
import Swal from 'sweetalert2';

interface Setting {
    key: string;
    value: string;
    label: string;
    description: string;
    type: 'text' | 'password' | 'tel';
    icon: React.ReactNode;
}

interface ReportLog {
    id?: string;
    tanggal: string;
    total_sent: number;
    total_failed: number;
    details: { murid: string; type: string; status: string; error?: string }[];
    created_at?: string;
}

const HARI_OPTIONS = [
    { value: 0, label: 'Minggu', short: 'Min' },
    { value: 1, label: 'Senin', short: 'Sen' },
    { value: 2, label: 'Selasa', short: 'Sel' },
    { value: 3, label: 'Rabu', short: 'Rab' },
    { value: 4, label: 'Kamis', short: 'Kam' },
    { value: 5, label: 'Jumat', short: 'Jum' },
    { value: 6, label: 'Sabtu', short: 'Sab' },
];

export default function AdminPengaturanPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [sending, setSending] = useState(false);
    const [testSending, setTestSending] = useState(false);
    const [testNumber, setTestNumber] = useState('');
    const [reportLogs, setReportLogs] = useState<ReportLog[]>([]);
    const [activeTab, setActiveTab] = useState<'whatsapp' | 'jadwal' | 'logs'>('whatsapp');
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Schedule state
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduleTime, setScheduleTime] = useState('14:00');
    const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Sen-Sab

    const supabase = createClient();

    const [settings, setSettings] = useState<Setting[]>([
        {
            key: 'admin_whatsapp',
            value: '',
            label: 'Nomor WhatsApp Admin',
            description: 'Nomor WhatsApp yang digunakan sebagai pengirim pesan otomatis (format: 628xxxxxxxxxx)',
            type: 'tel',
            icon: <Phone className="w-5 h-5" />
        },
        {
            key: 'fonnte_api_key',
            value: '',
            label: 'API Key Fonnte',
            description: 'Token API dari Fonnte.com yang terhubung dengan nomor WhatsApp di atas. Daftarkan nomor Anda di fonnte.com untuk mendapatkan API Key.',
            type: 'password',
            icon: <Key className="w-5 h-5" />
        },
        {
            key: 'wa_bot_name',
            value: 'KBM PRIMA Bot',
            label: 'Nama Bot',
            description: 'Nama identitas bot yang akan ditampilkan di footer pesan WhatsApp otomatis.',
            type: 'text',
            icon: <Bot className="w-5 h-5" />
        },
    ]);

    // Fetch existing settings
    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('app_settings')
                .select('key, value');

            if (data) {
                setSettings(prev => prev.map(s => {
                    const found = data.find((d: any) => d.key === s.key);
                    return found ? { ...s, value: found.value } : s;
                }));

                // Load schedule settings
                const schedEn = data.find((d: any) => d.key === 'schedule_enabled');
                const schedTime = data.find((d: any) => d.key === 'schedule_time');
                const schedDays = data.find((d: any) => d.key === 'schedule_days');

                if (schedEn) setScheduleEnabled(schedEn.value === 'true');
                if (schedTime) setScheduleTime(schedTime.value);
                if (schedDays) setScheduleDays(schedDays.value.split(',').map(Number));
            }

            // Fetch report logs
            const { data: logs } = await supabase
                .from('wa_report_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            setReportLogs(logs || []);
            setLoading(false);
        };

        fetchSettings();
    }, []);

    const updateSettingValue = (key: string, value: string) => {
        setSettings(prev => prev.map(s =>
            s.key === key ? { ...s, value } : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const setting of settings) {
                const { error } = await supabase
                    .from('app_settings')
                    .upsert({
                        key: setting.key,
                        value: setting.value,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'key' });

                if (error) throw error;
            }

            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Pengaturan berhasil disimpan.',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error: any) {
            Swal.fire('Gagal', error.message || 'Gagal menyimpan pengaturan', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Simpan jadwal otomatis
    const handleSaveSchedule = async () => {
        setSavingSchedule(true);
        try {
            const scheduleSettings = [
                { key: 'schedule_enabled', value: scheduleEnabled ? 'true' : 'false' },
                { key: 'schedule_time', value: scheduleTime },
                { key: 'schedule_days', value: scheduleDays.sort((a, b) => a - b).join(',') },
            ];

            for (const s of scheduleSettings) {
                const { error } = await supabase
                    .from('app_settings')
                    .upsert({ key: s.key, value: s.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                if (error) throw error;
            }

            Swal.fire({
                icon: 'success',
                title: 'Jadwal Disimpan!',
                html: scheduleEnabled
                    ? `Laporan akan otomatis dikirim setiap <strong>${getActiveHariLabel()}</strong> pukul <strong>${scheduleTime} WIB</strong>.`
                    : 'Jadwal pengiriman otomatis dinonaktifkan.',
                timer: 2500,
                showConfirmButton: false,
            });
        } catch (error: any) {
            Swal.fire('Gagal', error.message || 'Gagal menyimpan jadwal', 'error');
        } finally {
            setSavingSchedule(false);
        }
    };

    // Toggle hari
    const toggleDay = (dayValue: number) => {
        setScheduleDays(prev =>
            prev.includes(dayValue)
                ? prev.filter(d => d !== dayValue)
                : [...prev, dayValue]
        );
    };

    // Get label hari aktif
    const getActiveHariLabel = () => {
        const sorted = scheduleDays.sort((a, b) => a - b);
        return sorted.map(d => HARI_OPTIONS.find(h => h.value === d)?.short).filter(Boolean).join(', ');
    };

    // Copy cron URL
    const handleCopyCronUrl = () => {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/api/cron/check-schedule`;
        navigator.clipboard.writeText(url);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    // Test kirim pesan WhatsApp
    const handleTestSend = async () => {
        if (!testNumber.trim()) {
            Swal.fire('Error', 'Masukkan nomor WhatsApp tujuan', 'error');
            return;
        }

        const apiKey = settings.find(s => s.key === 'fonnte_api_key')?.value;
        if (!apiKey) {
            Swal.fire('Error', 'API Key Fonnte belum dikonfigurasi. Silakan simpan pengaturan terlebih dahulu.', 'error');
            return;
        }

        setTestSending(true);
        try {
            const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
            const result = await sendWhatsAppMessage(testNumber,
                `*🤖 TEST PESAN DARI KBM PRIMA BOT*\n\n` +
                `Selamat! Pesan ini menandakan bahwa integrasi WhatsApp Bot Anda berhasil dikonfigurasi.\n\n` +
                `Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n` +
                `Waktu: ${new Date().toLocaleTimeString('id-ID')}\n\n` +
                `_Pesan otomatis oleh Sistem Monitoring KBM PRIMA_`
            );

            if (result.success) {
                Swal.fire('Berhasil!', 'Pesan tes berhasil dikirim.', 'success');
            } else {
                Swal.fire('Gagal', `Pesan gagal dikirim: ${result.error}`, 'error');
            }
        } catch (error: any) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setTestSending(false);
        }
    };

    // Kirim laporan harian manual
    const handleSendDailyReport = async () => {
        const confirm = await Swal.fire({
            title: 'Kirim Laporan Harian?',
            html: `Sistem akan mengirim laporan kehadiran dan capaian materi hari ini kepada <strong>semua orang tua murid</strong> yang memiliki nomor WhatsApp terdaftar.<br/><br/>` +
                `<small class="text-gray-500">Pastikan API Key Fonnte sudah dikonfigurasi dengan benar.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Kirim Sekarang!',
            cancelButtonText: 'Batal',
        });

        if (!confirm.isConfirmed) return;

        setSending(true);

        try {
            const result = await sendDailyReports();

            const logEntry = {
                tanggal: new Date().toISOString().split('T')[0],
                total_sent: result.totalSent,
                total_failed: result.totalFailed,
                details: result.details,
            };

            await supabase.from('wa_report_logs').insert(logEntry);

            const { data: logs } = await supabase
                .from('wa_report_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            setReportLogs(logs || []);

            Swal.fire({
                icon: result.totalFailed === 0 ? 'success' : 'warning',
                title: result.totalFailed === 0 ? 'Berhasil!' : 'Selesai dengan Catatan',
                html: `
                    <div style="text-align:left;">
                        <p><strong>✅ Terkirim:</strong> ${result.totalSent} pesan</p>
                        <p><strong>❌ Gagal:</strong> ${result.totalFailed} pesan</p>
                    </div>
                `,
            });
        } catch (error: any) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                    <Settings className="w-7 h-7 text-emerald-600" />
                    Pengaturan WhatsApp Bot
                </h2>
                <p className="text-stone-700 text-sm mt-1">
                    Konfigurasi integrasi WhatsApp Bot untuk pengiriman laporan otomatis ke orang tua murid.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 border-b border-stone-200 pb-0 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`px-5 py-3 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'whatsapp'
                        ? 'bg-white border border-stone-200 border-b-white text-emerald-600 -mb-[1px]'
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Konfigurasi Bot
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('jadwal')}
                    className={`px-5 py-3 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'jadwal'
                        ? 'bg-white border border-stone-200 border-b-white text-emerald-600 -mb-[1px]'
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" />
                        Jadwal Otomatis
                        {scheduleEnabled && (
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        )}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-5 py-3 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap ${activeTab === 'logs'
                        ? 'bg-white border border-stone-200 border-b-white text-emerald-600 -mb-[1px]'
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Riwayat
                        {reportLogs.length > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">{reportLogs.length}</span>
                        )}
                    </span>
                </button>
            </div>

            {/* ════════════════════════ TAB: KONFIGURASI ════════════════════════ */}
            {activeTab === 'whatsapp' && (
                <div className="space-y-6">
                    {/* Info Banner */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-900 mb-1">Cara Mengaktifkan WhatsApp Bot</h4>
                            <ol className="text-sm text-stone-600 space-y-1 list-decimal ml-4">
                                <li>Daftar akun di <strong>fonnte.com</strong> dan hubungkan nomor WhatsApp Anda.</li>
                                <li>Salin <strong>API Key (Token)</strong> dari dashboard Fonnte.</li>
                                <li>Masukkan nomor WhatsApp dan API Key di form di bawah ini, lalu <strong>Simpan</strong>.</li>
                                <li>Klik <strong>"Kirim Tes"</strong> untuk memastikan koneksi berhasil.</li>
                            </ol>
                        </div>
                    </div>

                    {/* Settings Form */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-stone-900 mb-5 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-emerald-500" />
                            Konfigurasi API
                        </h3>

                        <div className="space-y-5">
                            {settings.map(setting => (
                                <div key={setting.key} className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm font-bold text-stone-800">
                                        {setting.icon}
                                        {setting.label}
                                    </label>
                                    <input
                                        type={setting.type}
                                        value={setting.value}
                                        onChange={(e) => updateSettingValue(setting.key, e.target.value)}
                                        placeholder={
                                            setting.key === 'admin_whatsapp' ? '628xxxxxxxxxx' :
                                                setting.key === 'fonnte_api_key' ? 'Masukkan API Key dari fonnte.com' :
                                                    'Masukkan nilai...'
                                        }
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 text-sm transition-all"
                                    />
                                    <p className="text-xs text-stone-400 pl-1">{setting.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Simpan Pengaturan
                            </button>
                        </div>
                    </div>

                    {/* Test Kirim */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5 text-blue-500" />
                            Uji Coba Pengiriman
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="tel"
                                value={testNumber}
                                onChange={(e) => setTestNumber(e.target.value)}
                                placeholder="Nomor WhatsApp tujuan tes (628xxxx)"
                                className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                            />
                            <button
                                onClick={handleTestSend}
                                disabled={testSending}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25 whitespace-nowrap"
                            >
                                {testSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                Kirim Tes
                            </button>
                        </div>
                    </div>

                    {/* Kirim Laporan Harian Manual */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
                                    <MessageCircle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900 mb-1">Kirim Laporan Harian</h3>
                                    <p className="text-sm text-stone-600">
                                        Kirim laporan kehadiran dan capaian materi hari ini ke seluruh orang tua murid secara manual.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleSendDailyReport}
                                disabled={sending}
                                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-sm font-black disabled:opacity-50 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-xl shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
                            >
                                {sending ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
                                ) : (
                                    <><Send className="w-5 h-5" /> Kirim Sekarang</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════ TAB: JADWAL OTOMATIS ═══════════════════ */}
            {activeTab === 'jadwal' && (
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className={`rounded-2xl p-6 border-2 transition-all duration-300 ${scheduleEnabled
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
                        : 'bg-stone-50 border-stone-200'
                        }`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${scheduleEnabled
                                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30'
                                    : 'bg-stone-200 text-stone-400 shadow-stone-200/30'
                                    }`}>
                                    <CalendarClock className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900">Pengiriman Terjadwal</h3>
                                    <p className="text-sm text-stone-600">
                                        {scheduleEnabled
                                            ? `Aktif — Laporan dikirim setiap ${getActiveHariLabel()} pukul ${scheduleTime} WIB`
                                            : 'Nonaktif — Aktifkan untuk mengirim laporan secara otomatis'
                                        }
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                                className="shrink-0 transition-all duration-300 hover:scale-110"
                                title={scheduleEnabled ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                                {scheduleEnabled ? (
                                    <ToggleRight className="w-12 h-12 text-emerald-500" />
                                ) : (
                                    <ToggleLeft className="w-12 h-12 text-stone-300" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Konfigurasi Jadwal */}
                    <div className={`bg-white border border-stone-200 rounded-2xl p-6 transition-all duration-300 ${!scheduleEnabled ? 'opacity-60' : ''}`}>
                        <h3 className="text-lg font-bold text-stone-900 mb-5 flex items-center gap-2">
                            <Timer className="w-5 h-5 text-blue-500" />
                            Konfigurasi Jadwal
                        </h3>

                        {/* Jam Pengiriman */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-stone-800">
                                    <Clock className="w-4 h-4 text-emerald-500" />
                                    Jam Pengiriman (WIB)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        disabled={!scheduleEnabled}
                                        className="px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 text-sm transition-all text-lg font-mono disabled:cursor-not-allowed"
                                    />
                                    <span className="text-sm text-stone-500">WIB (Asia/Jakarta)</span>
                                </div>
                                <p className="text-xs text-stone-400">
                                    Sistem akan mengirim laporan pada jam yang ditentukan. Pastikan data absensi dan materi sudah diinput sebelum jam ini.
                                </p>
                            </div>

                            {/* Hari Pengiriman */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-stone-800">
                                    <CalendarClock className="w-4 h-4 text-emerald-500" />
                                    Hari Aktif Pengiriman
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {HARI_OPTIONS.map(hari => {
                                        const isActive = scheduleDays.includes(hari.value);
                                        return (
                                            <button
                                                key={hari.value}
                                                onClick={() => scheduleEnabled && toggleDay(hari.value)}
                                                disabled={!scheduleEnabled}
                                                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border-2 disabled:cursor-not-allowed ${isActive
                                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 hover:bg-emerald-600'
                                                    : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300 hover:text-stone-600'
                                                    }`}
                                            >
                                                {hari.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-stone-400">
                                    Pilih hari-hari dimana laporan harian akan dikirimkan. Klik untuk mengaktifkan/menonaktifkan.
                                </p>
                            </div>
                        </div>

                        {/* Simpan Jadwal */}
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={handleSaveSchedule}
                                disabled={savingSchedule}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25"
                            >
                                {savingSchedule ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Simpan Jadwal
                            </button>
                        </div>
                    </div>

                    {/* Ringkasan Jadwal */}
                    {scheduleEnabled && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
                            <h4 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
                                <CalendarClock className="w-5 h-5 text-blue-500" />
                                Ringkasan Jadwal Aktif
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
                                    <p className="text-xs text-stone-400 uppercase tracking-wide font-bold mb-1">Jam Kirim</p>
                                    <p className="text-2xl font-black text-stone-900">{scheduleTime} <span className="text-sm font-medium text-stone-500">WIB</span></p>
                                </div>
                                <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
                                    <p className="text-xs text-stone-400 uppercase tracking-wide font-bold mb-1">Hari Aktif</p>
                                    <p className="text-sm font-bold text-stone-900">{getActiveHariLabel()}</p>
                                    <p className="text-xs text-stone-500">{scheduleDays.length} hari/minggu</p>
                                </div>
                                <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
                                    <p className="text-xs text-stone-400 uppercase tracking-wide font-bold mb-1">Status</p>
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-sm font-bold text-emerald-600">Aktif</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Panduan Setup Cron */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-purple-500" />
                            Setup Pengiriman Otomatis
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-sm text-amber-800">
                                    <strong>⚡ Penting:</strong> Agar laporan benar-benar terkirim otomatis, Anda perlu mendaftarkan URL endpoint di layanan cron <strong>gratis</strong> (sekali saja). Setelah itu, sistem akan berjalan sendiri tanpa interaksi manual.
                                </p>
                            </div>

                            {/* URL Endpoint */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-800">URL Endpoint Cron</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono text-stone-600 overflow-x-auto whitespace-nowrap">
                                        {typeof window !== 'undefined' ? `${window.location.origin}/api/cron/check-schedule` : '/api/cron/check-schedule'}
                                    </div>
                                    <button
                                        onClick={handleCopyCronUrl}
                                        className={`px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${copiedUrl
                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                            : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                                            }`}
                                    >
                                        {copiedUrl ? <><CheckCircle className="w-4 h-4" /> Tersalin!</> : <><Copy className="w-4 h-4" /> Salin</>}
                                    </button>
                                </div>
                            </div>

                            {/* Langkah Setup */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-stone-800">Langkah Setup (hanya sekali):</h4>
                                <div className="space-y-3">
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">1</div>
                                        <div>
                                            <p className="text-sm text-stone-700">Buka <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold underline hover:text-emerald-700 inline-flex items-center gap-1">cron-job.org <ExternalLink className="w-3 h-3" /></a> dan buat akun gratis.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">2</div>
                                        <div>
                                            <p className="text-sm text-stone-700">Klik <strong>"Create Cronjob"</strong>, paste URL endpoint di atas.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">3</div>
                                        <div>
                                            <p className="text-sm text-stone-700">Set jadwal: <strong>setiap 15 menit</strong> (*/15 * * * *).</p>
                                            <p className="text-xs text-stone-400 mt-1">Sistem secara cerdas hanya mengirim pada jam yang Anda tentukan di atas, dan otomatis mencegah pengiriman ganda.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">4</div>
                                        <div>
                                            <p className="text-sm text-stone-700">Di bagian <strong>Request Headers</strong>, tambahkan:</p>
                                            <code className="block mt-1 text-xs bg-stone-800 text-emerald-400 px-3 py-2 rounded-lg font-mono">
                                                Authorization: Bearer [CRON_SECRET dari .env.local]
                                            </code>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">✓</div>
                                        <div>
                                            <p className="text-sm text-stone-700 font-bold text-emerald-700">Selesai! Laporan akan otomatis terkirim sesuai jadwal yang Anda atur tanpa perlu buka dashboard lagi.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════ TAB: RIWAYAT ═══════════════════════════ */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    {reportLogs.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-stone-200 rounded-2xl">
                            <History className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-stone-400 mb-2">Belum Ada Riwayat</h4>
                            <p className="text-sm text-stone-400">Riwayat pengiriman laporan harian akan muncul di sini.</p>
                        </div>
                    ) : (
                        reportLogs.map((log, idx) => (
                            <div key={idx} className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-emerald-200 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.total_failed === 0
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-amber-100 text-amber-600'
                                            }`}>
                                            {log.total_failed === 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-900 text-sm">Laporan {log.tanggal ? new Date(log.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                                            <p className="text-xs text-stone-400">
                                                {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                                            <CheckCircle className="w-3 h-3" /> {log.total_sent} Terkirim
                                        </span>
                                        {log.total_failed > 0 && (
                                            <span className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                                                <XCircle className="w-3 h-3" /> {log.total_failed} Gagal
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {log.details && log.details.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-stone-100">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {log.details.slice(0, 9).map((detail, dIdx) => (
                                                <div key={dIdx} className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg text-xs">
                                                    {detail.status === 'sent' ? (
                                                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                                                    )}
                                                    <span className="font-medium text-stone-700 truncate">{detail.murid}</span>
                                                </div>
                                            ))}
                                            {log.details.length > 9 && (
                                                <div className="flex items-center justify-center px-3 py-2 bg-stone-50 rounded-lg text-xs text-stone-400">
                                                    +{log.details.length - 9} lainnya
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
