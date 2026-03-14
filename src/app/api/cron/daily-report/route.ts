import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * API Route: POST /api/cron/daily-report
 *
 * Endpoint server-side untuk mengirim laporan harian WhatsApp secara otomatis.
 * Dirancang untuk dipanggil oleh layanan cron external (cron-job.org, Vercel Cron, dll.)
 *
 * Autentikasi: Bearer token menggunakan CRON_SECRET environment variable.
 *
 * Contoh panggilan:
 *   curl -X POST https://yourdomain.com/api/cron/daily-report \
 *        -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
    try {
        // ── 1. Verifikasi Autentikasi ────────────────────────────────────────
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return NextResponse.json(
                { error: 'CRON_SECRET belum dikonfigurasi di environment variables server.' },
                { status: 500 }
            );
        }

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (token !== cronSecret) {
            return NextResponse.json(
                { error: 'Unauthorized. Bearer token tidak valid.' },
                { status: 401 }
            );
        }

        // ── 2. Inisialisasi Admin Client (bypass RLS) ────────────────────────
        const supabase = createAdminClient();

        // ── 3. Ambil Fonnte API Key dari tabel app_settings ──────────────────
        const { data: apiKeySetting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'fonnte_api_key')
            .single();

        const fonnteApiKey = apiKeySetting?.value;

        if (!fonnteApiKey) {
            return NextResponse.json(
                { error: 'Fonnte API Key belum dikonfigurasi di Pengaturan. Silakan konfigurasi terlebih dahulu.' },
                { status: 400 }
            );
        }

        // ── 4. Tentukan Tanggal Target ───────────────────────────────────────
        // Gunakan timezone Jakarta (WIB, UTC+7)
        const jakartaTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const body = await request.json().catch(() => ({}));
        const targetDate = body.tanggal || jakartaTime.toISOString().split('T')[0];

        // ── 5. Ambil Semua Murid Aktif ───────────────────────────────────────
        const { data: muridList, error: muridError } = await supabase
            .from('murid')
            .select('id, nama, whatsapp_ortu, jenjang_id, kelas_id')
            .eq('is_active', true);

        if (muridError) {
            return NextResponse.json({ error: 'Gagal mengambil data murid: ' + muridError.message }, { status: 500 });
        }

        if (!muridList || muridList.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Tidak ada murid aktif.',
                totalSent: 0,
                totalFailed: 0,
                details: [],
            });
        }

        // ── 6. Ambil Data Absensi dan Materi Hari Ini ────────────────────────
        const [absensiRes, materiRes] = await Promise.all([
            supabase
                .from('absensi')
                .select('murid_id, status, keterangan')
                .eq('tanggal', targetDate),
            supabase
                .from('target_materi')
                .select('murid_id, status, catatan, materi(nama)')
                .eq('tanggal', targetDate),
        ]);

        const absensiMap = new Map<string, { status: string; keterangan: string }>();
        (absensiRes.data || []).forEach((a: any) => {
            absensiMap.set(a.murid_id, { status: a.status, keterangan: a.keterangan || '' });
        });

        const materiMap = new Map<string, { materi: string; status: string; catatan: string }[]>();
        (materiRes.data || []).forEach((t: any) => {
            const existing = materiMap.get(t.murid_id) || [];
            existing.push({
                materi: t.materi?.nama || '-',
                status: t.status,
                catatan: t.catatan || '',
            });
            materiMap.set(t.murid_id, existing);
        });

        // ── 7. Kirim Pesan Per Murid ─────────────────────────────────────────
        const details: { murid: string; type: string; status: string; error?: string }[] = [];
        let totalSent = 0;
        let totalFailed = 0;

        const formattedDate = formatTanggal(targetDate);

        for (const murid of muridList) {
            if (!murid.whatsapp_ortu) continue;

            const absensi = absensiMap.get(murid.id);
            const materiEntries = materiMap.get(murid.id);

            // Skip jika tidak ada data hari ini
            if (!absensi && (!materiEntries || materiEntries.length === 0)) {
                continue;
            }

            // Susun pesan
            let message = `*📋 LAPORAN HARIAN SISWA*\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            message += `Yth. Orang Tua/Wali *${murid.nama}*,\n`;
            message += `Berikut laporan kegiatan belajar pada tanggal *${formattedDate}*:\n\n`;

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

            message += `━━━━━━━━━━━━━━━━━━━━━\n`;
            message += `_Pesan otomatis oleh Sistem Monitoring KBM PRIMA_`;

            // Kirim via Fonnte API langsung (server-side, tanpa cache client-side)
            const sendResult = await sendViaFonnte(fonnteApiKey, murid.whatsapp_ortu, message);

            if (sendResult.success) {
                totalSent++;
                details.push({ murid: murid.nama, type: 'daily_report', status: 'sent' });
            } else {
                totalFailed++;
                details.push({ murid: murid.nama, type: 'daily_report', status: 'failed', error: sendResult.error });
            }

            // Delay 1 detik antar pesan agar tidak di-rate-limit oleh Fonnte
            await delay(1000);
        }

        // ── 8. Log ke Database ───────────────────────────────────────────────
        await supabase.from('wa_report_logs').insert({
            tanggal: targetDate,
            total_sent: totalSent,
            total_failed: totalFailed,
            details: details,
        });

        // ── 9. Response ──────────────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            message: `Laporan harian ${formattedDate} selesai dikirim.`,
            tanggal: targetDate,
            totalSent,
            totalFailed,
            totalSkipped: muridList.filter(m => !m.whatsapp_ortu).length,
            details,
        });

    } catch (error: any) {
        console.error('[CRON] Daily report error:', error);
        return NextResponse.json(
            { error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}

// GET handler juga disupport (untuk Vercel Cron yang menggunakan GET)
export async function GET(request: NextRequest) {
    return POST(request);
}

// ── Utilitas Internal ────────────────────────────────────────────────────────

async function sendViaFonnte(
    apiKey: string,
    to: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    // Normalisasi nomor: 08xxx → 628xxx
    const normalizedNumber = to.startsWith('0') ? '62' + to.substring(1) : to;

    try {
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
            return { success: true };
        } else {
            return { success: false, error: result.reason || result.detail || 'Fonnte send failed' };
        }
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTanggal(dateStr: string): string {
    try {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}
