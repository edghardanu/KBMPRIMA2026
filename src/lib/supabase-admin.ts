import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client menggunakan Service Role Key.
 * Client ini mem-bypass semua RLS (Row Level Security) policies,
 * sehingga HANYA boleh digunakan di server-side (API Routes/Cron).
 *
 * JANGAN PERNAH expose client ini ke client-side/browser.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceRoleKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di environment variables. ' +
            'Tambahkan ke file .env.local Anda. ' +
            'Dapatkan dari: Supabase Dashboard > Settings > API > service_role key.'
        );
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
