/**
 * WhatsApp Bot Integration using Fonnte API.
 * Supports sending messages via Fonnte.com WhatsApp gateway.
 * Admin configures the API key via Pengaturan page (stored in Supabase `app_settings` table).
 */

import { createClient } from './supabase';

// ── Konfigurasi Cache ────────────────────────────────────────────────────────
let cachedApiKey: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

/**
 * Ambil API Key Fonnte dari tabel `app_settings` di Supabase.
 */
export const getFonnteApiKey = async (): Promise<string | null> => {
    const now = Date.now();
    if (cachedApiKey && now - cacheTimestamp < CACHE_TTL) {
        return cachedApiKey;
    }

    try {
        const supabase = createClient();
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'fonnte_api_key')
            .single();

        cachedApiKey = data?.value || null;
        cacheTimestamp = now;
        return cachedApiKey;
    } catch {
        return null;
    }
};

/**
 * Ambil nomor admin (pengirim) dari tabel `app_settings`.
 */
export const getAdminWhatsAppNumber = async (): Promise<string | null> => {
    try {
        const supabase = createClient();
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_whatsapp')
            .single();

        return data?.value || null;
    } catch {
        return null;
    }
};

/**
 * Kirim pesan WhatsApp menggunakan Fonnte API.
 *
 * @param to   - Nomor tujuan (format: 62xxxx)
 * @param message - Isi pesan WhatsApp
 */
export const sendWhatsAppMessage = async (to: string, message: string): Promise<{ success: boolean; error?: string }> => {
    if (!to) {
        console.warn('WhatsApp Notification: No phone number provided.');
        return { success: false, error: 'No phone number' };
    }

    // Normalisasi nomor: ubah awalan 0 jadi 62
    const normalizedNumber = to.startsWith('0') ? '62' + to.substring(1) : to;

    try {
        const apiKey = await getFonnteApiKey();

        if (!apiKey) {
            // Jika belum dikonfigurasi, fallback ke simulasi (console log)
            console.log('--- WHATSAPP BOT SIMULATION (API Key belum dikonfigurasi) ---');
            console.log(`To: ${normalizedNumber}`);
            console.log(`Message: \n${message}`);
            console.log('-------------------------------');
            return { success: true }; // simulasi dianggap sukses
        }

        // Kirim via Fonnte API
        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
            },
            body: new URLSearchParams({
                target: normalizedNumber,
                message: message,
                countryCode: '62',
            }),
        });

        const result = await response.json();

        if (result.status === true || result.status === 'true') {
            console.log(`✅ WhatsApp sent to ${normalizedNumber}`);
            return { success: true };
        } else {
            console.error('Fonnte API Error:', result);
            return { success: false, error: result.reason || 'Failed to send' };
        }
    } catch (error: any) {
        console.error('WhatsApp send error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Kirim laporan harian ke semua orang tua melalui WhatsApp.
 * Dipanggil dari halaman Pengaturan Admin (tombol manual) atau cron.
 */
export const sendDailyReports = async (tanggal?: string): Promise<{
    totalSent: number;
    totalFailed: number;
    details: { murid: string; type: string; status: string; error?: string }[];
}> => {
    const supabase = createClient();
    const targetDate = tanggal || new Date().toISOString().split('T')[0];

    const details: { murid: string; type: string; status: string; error?: string }[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    try {
        // 1. Ambil semua murid aktif beserta nomor WA ortu
        const { data: muridList } = await supabase
            .from('murid')
            .select('id, nama, whatsapp_ortu, jenjang_id, kelas_id, kelas(nama), jenjang(nama)')
            .eq('is_active', true);

        if (!muridList || muridList.length === 0) {
            return { totalSent: 0, totalFailed: 0, details: [] };
        }

        // 2. Ambil data absensi hari ini
        const { data: absensiList } = await supabase
            .from('absensi')
            .select('murid_id, status, keterangan')
            .eq('tanggal', targetDate);

        // 3. Ambil data target materi hari ini
        const { data: materiList } = await supabase
            .from('target_materi')
            .select('murid_id, status, catatan, materi(nama)')
            .eq('tanggal', targetDate);

        const absensiMap = new Map<string, { status: string; keterangan: string }>();
        absensiList?.forEach((a: any) => {
            absensiMap.set(a.murid_id, { status: a.status, keterangan: a.keterangan || '' });
        });

        const materiMap = new Map<string, { materi: string; status: string; catatan: string }[]>();
        materiList?.forEach((t: any) => {
            const existing = materiMap.get(t.murid_id) || [];
            existing.push({
                materi: t.materi?.nama || '-',
                status: t.status,
                catatan: t.catatan || '',
            });
            materiMap.set(t.murid_id, existing);
        });

        // 4. Kirim pesan per murid
        for (const murid of muridList) {
            if (!murid.whatsapp_ortu) continue;

            const absensi = absensiMap.get(murid.id);
            const materiEntries = materiMap.get(murid.id);

            // Buat pesan gabungan
            let message = `*📋 LAPORAN HARIAN SISWA*\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `Yth. Orang Tua/Wali *${murid.nama}*,\n`;
            message += `Berikut laporan kegiatan belajar pada tanggal *${formatTanggal(targetDate)}*:\n\n`;

            // Bagian Kehadiran
            if (absensi) {
                const statusEmoji = absensi.status === 'hadir' ? '✅' :
                    absensi.status === 'izin' ? '📝' :
                        absensi.status === 'sakit' ? '🏥' : '❌';

                message += `*📌 KEHADIRAN*\n`;
                message += `Status: ${absensi.status.toUpperCase()} ${statusEmoji}\n`;
                if (absensi.keterangan) {
                    message += `Keterangan: ${absensi.keterangan}\n`;
                }
                message += `\n`;
            }

            // Bagian Capaian Materi
            if (materiEntries && materiEntries.length > 0) {
                message += `*📚 CAPAIAN MATERI*\n`;
                materiEntries.forEach((entry, idx) => {
                    const emoji = entry.status === 'lancar' ? '✅' : '⚠️';
                    message += `${idx + 1}. ${entry.materi}: ${entry.status.toUpperCase()} ${emoji}\n`;
                    if (entry.catatan) {
                        message += `   Catatan: ${entry.catatan}\n`;
                    }
                });
                message += `\n`;
            }

            // Jika tidak ada data sama sekali, skip
            if (!absensi && (!materiEntries || materiEntries.length === 0)) {
                continue;
            }

            message += `━━━━━━━━━━━━━━━━━━━━━\n`;
            message += `_Pesan otomatis oleh Sistem Monitoring KBM PRIMA_`;

            // Kirim pesan
            const result = await sendWhatsAppMessage(murid.whatsapp_ortu, message);
            if (result.success) {
                totalSent++;
                details.push({ murid: murid.nama, type: 'daily_report', status: 'sent' });
            } else {
                totalFailed++;
                details.push({ murid: murid.nama, type: 'daily_report', status: 'failed', error: result.error });
            }
        }
    } catch (error: any) {
        console.error('Error sending daily reports:', error);
    }

    return { totalSent, totalFailed, details };
};

// ── Format Pesan ─────────────────────────────────────────────────────────────

export const formatMaterialReport = (studentName: string, materialName: string, status: string, notes: string) => {
    const emoji = status === 'lancar' ? '✅' : '⚠️';
    return `*LAPORAN PENCAPAIAN MATERI SISWA*\n\n` +
        `Yth. Orang Tua/Wali, berikut adalah laporan pencapaian materi siswa:\n\n` +
        `Nama: *${studentName}*\n` +
        `Materi: ${materialName}\n` +
        `Status: ${status.toUpperCase()} ${emoji}\n` +
        `Catatan: ${notes || '-'}\n\n` +
        `Demikian informasi ini kami sampaikan. Terima kasih.\n\n` +
        `_Pesan otomatis oleh Sistem Monitoring KBMPRIMA_`;
};

export const formatAttendanceReport = (studentName: string, date: string, status: string, notes: string) => {
    let statusLabel = status.toUpperCase();
    let emoji = '📌';

    if (status === 'hadir') {
        statusLabel = 'HADIR ✅';
        emoji = '📖';
    } else if (status === 'izin' || status === 'sakit') {
        statusLabel = status.toUpperCase() + ' ✉️';
        emoji = 'ℹ️';
    } else {
        statusLabel = 'TIDAK HADIR ❌';
        emoji = '⚠️';
    }

    return `*LAPORAN KEHADIRAN SISWA*\n\n` +
        `Yth. Orang Tua/Wali, berikut adalah laporan kehadiran siswa pada tanggal ${date}:\n\n` +
        `Nama: *${studentName}*\n` +
        `Status: ${statusLabel}\n` +
        `Keterangan: ${notes || '-'}\n\n` +
        `Terima kasih atas perhatian Anda.\n\n` +
        `_Pesan otomatis oleh Sistem Monitoring KBMPRIMA_`;
};

// ── Utilitas ─────────────────────────────────────────────────────────────────

function formatTanggal(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}
