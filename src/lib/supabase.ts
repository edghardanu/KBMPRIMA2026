import { createBrowserClient } from '@supabase/ssr';

/**
 * Custom lock function that bypasses the Web Locks API entirely.
 *
 * By default Supabase uses `navigator.locks.request()` to prevent
 * concurrent token-refresh operations across tabs. In practice this
 * causes "LockManager lock timed out" errors when:
 *   - multiple React renders create competing lock requests, or
 *   - the browser holds an unreleased lock from a previous render.
 *
 * Because we enforce a single Supabase client instance via the
 * `globalThis.__supabaseClient` singleton, concurrent refreshes
 * cannot happen within the same tab anyway, so the lock is redundant.
 * Bypassing it here eliminates the timeout error completely.
 */
async function noopLock<T>(
    _name: string,
    _timeout: number,
    acquire: () => Promise<T>
): Promise<T> {
    return acquire();
}

// Fallback values for build time to prevent "missing URL/Key" errors during static generation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export function createClient() {
    // Client-side: persist the instance across HMR re-renders
    if (typeof window !== 'undefined') {
        const g = globalThis as any;

        if (!g.__supabaseClient) {
            g.__supabaseClient = createBrowserClient(
                supabaseUrl,
                supabaseKey,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                        storageKey: 'kbm-prima-auth-token',
                        flowType: 'implicit',
                        lock: noopLock,
                    },
                    global: {
                        headers: {
                            'X-Client-Info': 'nextjs-ssr',
                        },
                    },
                    isSingleton: true,
                }
            );
        }
        return g.__supabaseClient;
    }

    // Server-side (SSR) — stateless, no session persistence needed
    return createBrowserClient(
        supabaseUrl,
        supabaseKey,
        {
            auth: {
                storageKey: 'kbm-prima-auth-token',
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}
