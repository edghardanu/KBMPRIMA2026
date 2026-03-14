'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

/** Clear all Supabase-related tokens from localStorage to recover from bad token state. */
function clearSupabaseStorage() {
    try {
        if (typeof window === 'undefined') return;
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('kbm-prima-auth'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_) {
        // localStorage may be unavailable in some environments
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchProfile = async (userId: string, attempts = 0): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.warn('Could not fetch profile:', {
                    code: error.code,
                    message: error.message
                });
                setProfile(null);
            } else if (data) {
                setProfile(data as Profile);
            } else {
                // data is null and error is null -> profile not found
                if (attempts < 3) {
                    console.log(`Profile not found (attempt ${attempts + 1}/3), retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    return fetchProfile(userId, attempts + 1);
                }
                
                // Fallback: Try to create/get profile via function
                console.log('Fallback: Attempting to create profile via function...');
                try {
                    const { data: user } = await supabase.auth.getUser();
                    if (user?.user) {
                        const { data: profileData, error: funcError } = await supabase
                            .rpc('get_or_create_profile', {
                                user_id: user.user.id,
                                user_email: user.user.email,
                                user_role: user.user.user_metadata?.role || 'pending'
                            });
                        
                        if (!funcError && profileData && profileData.length > 0) {
                            setProfile(profileData[0] as Profile);
                            console.log('Profile created/fetched via function');
                            return;
                        }
                    }
                } catch (funcErr) {
                    console.warn('Function fallback failed:', funcErr);
                }
                
                // Last resort
                setProfile(null);
            }
        } catch (err) {
            console.error('Error in fetchProfile:', err);
            setProfile(null);
        }
    };

    const refreshProfile = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                await fetchProfile(user.id);
            } else {
                setUser(null);
                setProfile(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let initialized = false;

        const getUser = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();

                // If Supabase returns an auth error here it means the stored
                // token is completely invalid — clear storage so it doesn't
                // keep retrying with a bad token.
                if (error) {
                    console.warn('getUser error (clearing storage):', error.message);
                    clearSupabaseStorage();
                    if (!initialized) {
                        setUser(null);
                        setProfile(null);
                        setLoading(false);
                    }
                    return;
                }

                if (!initialized) {
                    setUser(user);
                    if (user) {
                        await fetchProfile(user.id);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error('Initial session fetch error:', err);
                if (!initialized) setLoading(false);
            }
        };

        // Safety timeout — faster recovery if Supabase/Locks hang
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 8000);

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: any, session: any) => {
                initialized = true; // mark so getUser() skips its own fetchProfile
                clearTimeout(safetyTimer);

                // TOKEN_REFRESHED failure surfaces as SIGNED_OUT with no session,
                // or as an explicit error event. Either way, clear stored tokens
                // so the user gets a fresh login prompt instead of a broken loop.
                if (
                    event === 'SIGNED_OUT' ||
                    event === 'TOKEN_REFRESHED' && !session
                ) {
                    clearSupabaseStorage();
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        clearSupabaseStorage();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
