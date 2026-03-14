import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * API Route: GET/POST /api/cron/check-schedule
 *
 * Endpoint "pintar" yang memeriksa jadwal pengiriman laporan harian.
 * Dirancang untuk dipanggil oleh cron external setiap 15 menit.
 *
 * Logika:
 * 1. Baca jadwal dari `app_settings` (jam kirim, hari aktif, toggle on/off)
 * 2. Cek apakah sekarang sudah melewati jam kirim yang ditentukan
 * 3. Cek apakah hari ini termasuk hari aktif
 * 4. Cek apakah sudah pernah mengirim hari ini (cegah duplikat)
 * 5. Jika semua kondisi terpenuhi → kirim laporan harian
 *
 * Autentikasi: Bearer token menggunakan CRON_SECRET.
 *
 * Setup cron: panggil endpoint ini setiap 15 menit
 *   curl https://domain.com/api/cron/check-schedule -H "Authorization: Bearer CRON_SECRET"
 */
export async function GET(request: NextRequest) {
    return handleScheduleCheck(request);
}

export async function POST(request: NextRequest) {
    return handleScheduleCheck(request);
}

async function handleScheduleCheck(request: NextRequest) {
    try {
        // ── 1. Verifikasi Token ──────────────────────────────────────────────
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            return NextResponse.json({ error: 'CRON_SECRET belum dikonfigurasi.' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (token !== cronSecret) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
        }

        // ── 2. Baca Pengaturan Jadwal dari Database ──────────────────────────
        const supabase = createAdminClient();

        const { data: allSettings } = await supabase
            .from('app_settings')
            .select('key, value');

        const settingsMap = new Map<string, string>();
        allSettings?.forEach((s: any) => settingsMap.set(s.key, s.value));

        const scheduleEnabled = settingsMap.get('schedule_enabled') === 'true';
        const scheduleTime = settingsMap.get('schedule_time') || '14:00';
        const scheduleDays = settingsMap.get('schedule_days') || '1,2,3,4,5,6'; // Sen-Sab
        const fonnteApiKey = settingsMap.get('fonnte_api_key') || '';

        // ── 3. Validasi Prasyarat ────────────────────────────────────────────
        if (!scheduleEnabled) {
            return NextResponse.json({
                action: 'skipped',
                reason: 'Jadwal otomatis tidak aktif (schedule_enabled = false).',
            });
        }

        if (!fonnteApiKey) {
            return NextResponse.json({
                action: 'skipped',
                reason: 'Fonnte API Key belum dikonfigurasi.',
            });
        }

        // ── 4. Cek Hari ─────────────────────────────────────────────────────
        const jakartaNow = getJakartaTime();
        const currentDay = jakartaNow.getDay(); // 0=Minggu, 1=Senin, ...
        const activeDays = scheduleDays.split(',').map(Number);

        if (!activeDays.includes(currentDay)) {
            return NextResponse.json({
                action: 'skipped',
                reason: `Hari ini (${getDayName(currentDay)}) bukan hari aktif pengiriman.`,
                activeDays: activeDays.map(getDayName),
            });
        }

        // ── 5. Cek Jam ──────────────────────────────────────────────────────
        const [targetHour, targetMinute] = scheduleTime.split(':').map(Number);
        const currentHour = jakartaNow.getHours();
        const currentMinute = jakartaNow.getMinutes();

        const targetMinutes = targetHour * 60 + targetMinute;
        const currentMinutes = currentHour * 60 + currentMinute;

        // Hanya kirim jika sudah melewati jam target DAN belum lebih dari 30 menit
        // (window pengiriman: dari jam target sampai 30 menit kemudian)
        if (currentMinutes < targetMinutes || currentMinutes > targetMinutes + 30) {
            return NextResponse.json({
                action: 'skipped',
                reason: `Belum waktunya. Jadwal: ${scheduleTime} WIB, Sekarang: ${padZero(currentHour)}:${padZero(currentMinute)} WIB.`,
                schedule: scheduleTime,
                currentTime: `${padZero(currentHour)}:${padZero(currentMinute)}`,
            });
        }

        // ── 6. Cek Apakah Sudah Kirim Hari Ini ─────────────────────────────
        const todayStr = jakartaNow.toISOString().split('T')[0];

        const { data: existingLog } = await supabase
            .from('wa_report_logs')
            .select('id')
            .eq('tanggal', todayStr)
            .limit(1);

        if (existingLog && existingLog.length > 0) {
            return NextResponse.json({
                action: 'skipped',
                reason: `Laporan untuk tanggal ${todayStr} sudah pernah dikirim hari ini.`,
                existingLogId: existingLog[0].id,
            });
        }

        // ── 7. KIRIM! Forward ke daily-report endpoint ─────────────────────
        // Kita panggil logic langsung di sini (tanpa HTTP call ke diri sendiri)
        const result = await executeDailyReport(supabase, fonnteApiKey, todayStr);

        // ── 8. Log ke Database ───────────────────────────────────────────────
        await supabase.from('wa_report_logs').insert({
            tanggal: todayStr,
            total_sent: result.totalSent,
            total_failed: result.totalFailed,
            details: result.details,
        });

        return NextResponse.json({
            action: 'sent',
            message: `✅ Laporan harian ${todayStr} berhasil dikirim otomatis pada ${padZero(currentHour)}:${padZero(currentMinute)} WIB.`,
            tanggal: todayStr,
            ...result,
        });

    } catch (error: any) {
        console.error('[CRON] Check-schedule error:', error);
        return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}

// ── Logika Pengiriman ────────────────────────────────────────────────────────

async function executeDailyReport(
    supabase: any,
    fonnteApiKey: string,
    targetDate: string
) {
    const details: { murid: string; type: string; status: string; error?: string }[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Ambil murid aktif
    const { data: muridList } = await supabase
        .from('murid')
        .select('id, nama, whatsapp_ortu')
        .eq('is_active', true);

    if (!muridList || muridList.length === 0) {
        return { totalSent: 0, totalFailed: 0, details: [] };
    }

    // Ambil data absensi + materi hari ini
    const [absensiRes, materiRes] = await Promise.all([
        supabase.from('absensi').select('murid_id, status, keterangan').eq('tanggal', targetDate),
        supabase.from('target_materi').select('murid_id, status, catatan, materi(nama)').eq('tanggal', targetDate),
    ]);

    const absensiMap = new Map<string, { status: string; keterangan: string }>();
    (absensiRes.data || []).forEach((a: any) => {
        absensiMap.set(a.murid_id, { status: a.status, keterangan: a.keterangan || '' });
    });

    const materiMap = new Map<string, { materi: string; status: string; catatan: string }[]>();
    (materiRes.data || []).forEach((t: any) => {
        const existing = materiMap.get(t.murid_id) || [];
        existing.push({ materi: t.materi?.nama || '-', status: t.status, catatan: t.catatan || '' });
        materiMap.set(t.murid_id, existing);
    });

    const formattedDate = formatTanggal(targetDate);

    for (const murid of muridList) {
        if (!murid.whatsapp_ortu) continue;

        const absensi = absensiMap.get(murid.id);
        const materiEntries = materiMap.get(murid.id);

        if (!absensi && (!materiEntries || materiEntries.length === 0)) continue;

        let message = `*📋 LAPORAN HARIAN SISWA*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `Yth. Orang Tua/Wali *${murid.nama}*,\n`;
        message += `Berikut laporan kegiatan belajar pada tanggal *${formattedDate}*:\n\n`;

        if (absensi) {
            const emoji = absensi.status === 'hadir' ? '✅' : absensi.status === 'izin' ? '📝' : absensi.status === 'sakit' ? '🏥' : '❌';
            message += `*📌 KEHADIRAN*\nStatus: ${absensi.status.toUpperCase()} ${emoji}\n`;
            if (absensi.keterangan) message += `Keterangan: ${absensi.keterangan}\n`;
            message += `\n`;
        }

        if (materiEntries && materiEntries.length > 0) {
            message += `*📚 CAPAIAN MATERI*\n`;
            materiEntries.forEach((e, i) => {
                message += `${i + 1}. ${e.materi}: ${e.status.toUpperCase()} ${e.status === 'lancar' ? '✅' : '⚠️'}\n`;
                if (e.catatan) message += `   Catatan: ${e.catatan}\n`;
            });
            message += `\n`;
        }

        message += `━━━━━━━━━━━━━━━━━━━━━\n_Pesan otomatis oleh Sistem Monitoring KBM PRIMA_`;

        const result = await sendViaFonnte(fonnteApiKey, murid.whatsapp_ortu, message);

        if (result.success) {
            totalSent++;
            details.push({ murid: murid.nama, type: 'daily_report', status: 'sent' });
        } else {
            totalFailed++;
            details.push({ murid: murid.nama, type: 'daily_report', status: 'failed', error: result.error });
        }

        await delay(1000);
    }

    return { totalSent, totalFailed, details };
}

// ── Utilitas ─────────────────────────────────────────────────────────────────

async function sendViaFonnte(apiKey: string, to: string, message: string): Promise<{ success: boolean; error?: string }> {
    const normalized = to.startsWith('0') ? '62' + to.substring(1) : to;
    try {
        const res = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: { 'Authorization': apiKey },
            body: new URLSearchParams({ target: normalized, message, countryCode: '62' }),
        });
        const result = await res.json();
        return (result.status === true || result.status === 'true')
            ? { success: true }
            : { success: false, error: result.reason || 'Send failed' };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function getJakartaTime(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
}

function padZero(n: number): string { return n.toString().padStart(2, '0'); }

function getDayName(day: number): string {
    return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][day] || '?';
}

function formatTanggal(dateStr: string): string {
    try {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    } catch { return dateStr; }
}
